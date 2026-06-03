'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { refreshGoogleToken } from '@/lib/google-auth'
import { getHealthSummary, getDailySteps, getBodyMetrics, getSleepWeek, getActivitySessions } from '@/lib/google-data'
import { istIsoDate } from '@/lib/utils'

export async function syncGoogleData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', user.id)
    .single()

  if (!profile?.google_access_token) return { error: 'No Google account connected' }

  const tokenValid =
    profile.google_token_expires_at &&
    new Date(profile.google_token_expires_at) > new Date()

  let accessToken = profile.google_access_token

  if (!tokenValid) {
    if (!profile.google_refresh_token) return { error: 'Session expired — please reconnect Google' }
    const refreshed = await refreshGoogleToken(profile.google_refresh_token)
    if (!refreshed) return { error: 'Failed to refresh token — please reconnect Google' }
    accessToken = refreshed.access_token
    const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString()
    await supabase.from('profiles').update({
      google_access_token: accessToken,
      google_token_expires_at: expiresAt,
    }).eq('id', user.id)
  }

  try {
    const today = istIsoDate(0)

    const [health, dailySteps, body, sleepWeek, activities] = await Promise.all([
      getHealthSummary(accessToken),
      getDailySteps(accessToken),
      getBodyMetrics(accessToken),
      getSleepWeek(accessToken),
      getActivitySessions(accessToken, 7),
    ])

    const historicalRows = (dailySteps ?? [])
      .filter(d => d.isoDate && d.isoDate !== today)
      .map(d => ({
        user_id: user.id,
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

    await supabase.from('health_daily').upsert({
      user_id: user.id,
      date: today,
      steps: health.stepsToday,
      calories: health.caloriesToday,
      active_minutes: health.activeMinutesToday,
      distance_km: health.distanceKm,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })

    if (activities?.length > 0) {
      const sessionRows = activities.map(a => ({
        id: a.id,
        user_id: user.id,
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
      await supabase.from('profiles').update(bodyUpdate).eq('id', user.id)
    }

    revalidatePath('/dashboard')
    revalidatePath('/data')
    revalidatePath('/leaderboard')

    return { success: true }
  } catch {
    return { error: 'Sync failed — please try again' }
  }
}
