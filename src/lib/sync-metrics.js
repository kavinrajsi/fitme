/**
 * Shared per-user Google Health → daily_metrics sync, used by the daily cron, the
 * manual Sync button, and the webhook receiver.
 *
 * Requires a service-role Supabase client (writes bypass RLS) and a profile row with
 * the google_health_* token columns. Captures the user's healthUserId once (for
 * webhook mapping). `onStep` is an optional progress callback for the streaming UI.
 */
import { getValidHealthAccessToken } from '@/lib/google-auth'
import {
  getDailyMetrics,
  getHealthUserId,
  getWorkouts,
  getStepHistory,
  getHourlySteps,
} from '@/lib/google-health'

export async function syncUserMetrics(
  service,
  profile,
  { days = 90, onStep, fullHistory = false } = {}
) {
  const step = (message) => onStep?.(message)

  step('Refreshing the Google Health access token')
  const token = await getValidHealthAccessToken(profile, service)
  if (!token) {
    // A stored refresh token that no longer works ⇒ the user must reconnect (vs.
    // never having connected at all).
    const reason = profile.google_health_refresh_token ? 'reconnect_required' : 'no_token'
    return { ok: false, reason, rows: 0, metrics: [] }
  }

  // Capture the stable healthUserId once so webhook notifications can map to this user.
  if (!profile.google_health_user_id) {
    const healthUserId = await getHealthUserId(token)
    if (healthUserId) {
      await service.from('profiles').update({ google_health_user_id: healthUserId }).eq('id', profile.id)
    }
  }

  step('Fetching steps, calories, distance & heart rate')
  const metrics = await getDailyMetrics(token, days)

  step(`Saving ${metrics.length} days to the database`)
  if (metrics.length) {
    const now = new Date().toISOString()
    const { error } = await service
      .from('daily_metrics')
      .upsert(
        metrics.map((metric) => ({ user_id: profile.id, ...metric, updated_at: now })),
        { onConflict: 'user_id,date' }
      )
    if (error) return { ok: false, reason: 'upsert_error', rows: 0, metrics }
  }

  // All workout sessions → workouts table (dedup on the source data-point id).
  step('Fetching workouts')
  const workouts = await getWorkouts(token, 1825)
  if (workouts.length) {
    const now = new Date().toISOString()
    await service
      .from('workouts')
      .upsert(
        workouts.map((workout) => ({ user_id: profile.id, ...workout, updated_at: now })),
        { onConflict: 'user_id,source_id' }
      )
  }

  // Intraday hourly steps (recent window) → steps_hourly table.
  step('Fetching hourly steps')
  const hourly = await getHourlySteps(token, 14)
  if (hourly.length) {
    const now = new Date().toISOString()
    await service
      .from('steps_hourly')
      .upsert(
        hourly.map((bucket) => ({ user_id: profile.id, ...bucket, updated_at: now })),
        { onConflict: 'user_id,day,hour' }
      )
  }

  // Full daily step history (older than the 90-day window) — steps only, partial
  // upsert that leaves other daily_metrics columns untouched.
  let historyDays = 0
  if (fullHistory) {
    step('Backfilling full step history')
    const history = await getStepHistory(token, 24)
    if (history.length) {
      const now = new Date().toISOString()
      await service
        .from('daily_metrics')
        .upsert(
          history.map((day) => ({ user_id: profile.id, ...day, updated_at: now })),
          { onConflict: 'user_id,date' }
        )
      historyDays = history.length
    }
  }

  return {
    ok: true,
    rows: metrics.length,
    metrics,
    workouts: workouts.length,
    hourly: hourly.length,
    historyDays,
  }
}
