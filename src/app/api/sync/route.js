/**
 * POST /api/sync — nightly Google Fit sync for all users.
 *
 * Called by Vercel Cron at midnight daily. Protected by CRON_SECRET so only
 * Vercel's scheduler can trigger it (Vercel injects the secret as an Authorization
 * Bearer header automatically when using vercel.json crons).
 *
 * For each user with a stored google_refresh_token:
 * 1. Refresh the access token if expired (Google tokens last 1 hour).
 * 2. Fetch steps, calories, active minutes, distance, sleep, and activity sessions.
 * 3. Upsert into health_daily and activity_sessions.
 *
 * Runs users sequentially to avoid hammering Google's API in parallel.
 * A single user failure is caught and logged without stopping the rest.
 */
import { createClient } from '@supabase/supabase-js'
import {
  getHealthSummary,
  getDailySteps,
  getBodyMetrics,
  getSleepData,
  getActivitySessions,
} from '@/lib/google-fit'
import { refreshGoogleToken } from '@/lib/google-auth'

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
    if (!profile.google_refresh_token) return { skipped: true }
    const refreshed = await refreshGoogleToken(profile.google_refresh_token)
    if (!refreshed) return { error: 'token_refresh_failed' }

    accessToken = refreshed.access_token
    const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString()
    await supabase
      .from('profiles')
      .update({
        google_access_token: accessToken,
        google_token_expires_at: expiresAt,
      })
      .eq('id', profile.id)
  }

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const [health, dailySteps, body, sleep, activities] = await Promise.all([
    getHealthSummary(accessToken),
    getDailySteps(accessToken),
    getBodyMetrics(accessToken),
    getSleepData(accessToken),
    getActivitySessions(accessToken, 7),
  ])

  // Historical rows (past 6 days)
  const historicalRows = (dailySteps || [])
    .filter(d => d.isoDate && d.isoDate !== today)
    .map(d => ({
      user_id: profile.id,
      date: d.isoDate,
      steps: d.steps,
      calories: d.calories ?? 0,
      active_minutes: d.activeMinutes ?? null,
      distance_km: d.distanceKm ?? null,
      sleep_minutes: d.isoDate === yesterday ? (sleep?.minutes ?? null) : null,
      avg_heart_rate: null,
      synced_at: new Date().toISOString(),
    }))

  if (historicalRows.length > 0) {
    await supabase.from('health_daily').upsert(historicalRows, { onConflict: 'user_id,date' })
  }

  // Today's row
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

  // Activity sessions
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

  // Body metrics
  const bodyUpdate = {}
  if (body?.weightKg !== null && body?.weightKg !== undefined) bodyUpdate.weight_kg = body.weightKg
  if (body?.heightCm !== null && body?.heightCm !== undefined) bodyUpdate.height_cm = body.heightCm
  if (Object.keys(bodyUpdate).length > 0) {
    await supabase.from('profiles').update(bodyUpdate).eq('id', profile.id)
  }

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
    } catch {
      results.failed++
    }
  }

  return Response.json({ synced: results })
}
