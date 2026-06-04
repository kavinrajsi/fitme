/**
 * POST /api/sync — nightly Google Health sync for all users.
 *
 * Called by Vercel Cron at midnight daily. Protected by CRON_SECRET so only
 * Vercel's scheduler can trigger it (Vercel injects the secret as an Authorization
 * Bearer header automatically when using vercel.json crons).
 *
 * For each user with a stored google_refresh_token:
 * 1. Refresh the access token if expired (Google tokens last 1 hour).
 * 2. Fetch steps, calories, active minutes, distance, sleep, and activity sessions.
 * 3. Upsert into health_daily and activity_sessions.
 * 4. Write a row to sync_logs recording success, skip, or error.
 *
 * Runs users sequentially to avoid hammering Google's API in parallel.
 * A single user failure is caught and logged without stopping the rest.
 */
import { createClient } from '@supabase/supabase-js'
import {
  getHealthSummary,
  getDailySteps,
  getBodyMetrics,
  getSleepWeek,
  getActivitySessions,
} from '@/lib/google-data'
import { refreshGoogleToken } from '@/lib/google-auth'
import { istIsoDate } from '@/lib/utils'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

async function syncUser(supabase, profile) {
  const now = new Date()
  const tokenExpired =
    !profile.google_token_expires_at ||
    new Date(profile.google_token_expires_at) <= now

  let accessToken = profile.google_access_token

  if (tokenExpired) {
    if (!profile.google_refresh_token) {
      await supabase.from('sync_logs').insert({
        user_id: profile.id, triggered_by: 'cron', status: 'skipped',
        error: 'No refresh token',
      })
      return { skipped: true }
    }
    const refreshed = await refreshGoogleToken(profile.google_refresh_token)
    if (!refreshed) {
      await supabase.from('sync_logs').insert({
        user_id: profile.id, triggered_by: 'cron', status: 'error',
        error: 'Token refresh failed — refresh token may be revoked',
      })
      return { error: 'token_refresh_failed' }
    }
    accessToken = refreshed.access_token
    const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString()
    await supabase.from('profiles').update({
      google_access_token: accessToken,
      google_token_expires_at: expiresAt,
    }).eq('id', profile.id)
  }

  const today = istIsoDate(0)

  const [health, dailySteps, body, sleepWeek, activities] = await Promise.all([
    getHealthSummary(accessToken),
    getDailySteps(accessToken),
    getBodyMetrics(accessToken),
    getSleepWeek(accessToken),
    getActivitySessions(accessToken, 7),
  ])

  const historicalRows = (dailySteps || [])
    .filter(d => d.isoDate && d.isoDate !== today)
    .map(d => ({
      user_id: profile.id,
      date: d.isoDate,
      steps: d.steps,
      calories: d.calories ?? 0,
      active_minutes: d.activeMinutes ?? null,
      distance_km: d.distanceKm ?? null,
      sleep_minutes: sleepWeek[d.isoDate]?.minutes ?? null,
      avg_heart_rate: null,
      synced_at: new Date().toISOString(),
    }))

  if (historicalRows.length > 0) {
    await supabase.from('health_daily').upsert(historicalRows, { onConflict: 'user_id,date' })
  }

  if (health) {
    await supabase.from('health_daily').upsert({
      user_id: profile.id,
      date: today,
      steps: health.stepsToday,
      calories: health.caloriesToday,
      active_minutes: health.activeMinutesToday,
      distance_km: health.distanceKm,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
  }

  if (activities?.length > 0) {
    const sessionRows = activities.map(a => ({
      id: a.id,
      user_id: profile.id,
      name: a.name,
      icon: a.icon,
      activity_type: a.activityType,
      start_time: new Date(a.startMs).toISOString(),
      end_time: new Date(a.endMs).toISOString(),
      duration_min: a.durationMin,
      steps: a.steps,
      synced_at: new Date().toISOString(),
    }))
    await supabase.from('activity_sessions').upsert(sessionRows, { onConflict: 'id,user_id' })
  }

  const bodyUpdate = {}
  if (body?.weightKg != null) bodyUpdate.weight_kg = body.weightKg
  if (body?.heightCm != null) bodyUpdate.height_cm = body.heightCm
  if (Object.keys(bodyUpdate).length > 0) {
    await supabase.from('profiles').update(bodyUpdate).eq('id', profile.id)
  }

  await supabase.from('sync_logs').insert({
    user_id: profile.id,
    triggered_by: 'cron',
    status: 'success',
    steps_today: health?.stepsToday ?? 0,
    days_written: historicalRows.length + (health ? 1 : 0),
  })

  return { ok: true }
}

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = serviceClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, google_access_token, google_refresh_token, google_token_expires_at')
    .not('google_refresh_token', 'is', null)

  if (error) {
    return Response.json({ error: 'db_error', detail: error.message }, { status: 500 })
  }

  const results = { ok: 0, skipped: 0, failed: 0 }

  for (const profile of profiles ?? []) {
    try {
      const result = await syncUser(supabase, profile)
      if (result.ok) results.ok++
      else if (result.skipped) results.skipped++
      else results.failed++
    } catch (err) {
      results.failed++
      await supabase.from('sync_logs').insert({
        user_id: profile.id, triggered_by: 'cron', status: 'error',
        error: err?.message ?? 'Unexpected error',
      })
    }
  }

  return Response.json({ synced: results })
}
