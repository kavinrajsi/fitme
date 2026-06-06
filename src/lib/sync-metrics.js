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
  getStepSamples,
  hourlyFromSamples,
} from '@/lib/google-health'

// Supabase rejects huge single upserts — write in chunks.
async function upsertChunked(service, table, rows, conflict, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await service.from(table).upsert(rows.slice(i, i + size), { onConflict: conflict })
  }
}

// The single sync entry point (cron / manual / webhook). Pulls the user's Google
// Health data and writes daily_metrics, workouts, steps_raw and steps_hourly. On
// `fullHistory` it also backfills the full step history (the caller flips
// profiles.health_data_backfilled_at so this only runs once per user). Returns a
// result object: { ok, reason?, rows, metrics, ... }; `reason` is 'reconnect_required'
// when a stale refresh token can't be refreshed and 'no_token' when none was stored.
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

  // Raw intraday step samples + hourly buckets. A full year on the first backfill,
  // a short recent window on incremental syncs.
  step('Fetching intraday step samples')
  const samples = await getStepSamples(token, fullHistory ? 365 : 14)
  if (samples.length) {
    const now = new Date().toISOString()
    await upsertChunked(
      service,
      'steps_raw',
      samples.map((sample) => ({
        user_id: profile.id,
        started_at: sample.started_at,
        ended_at: sample.ended_at,
        count: sample.count,
        updated_at: now,
      })),
      'user_id,started_at'
    )
    await upsertChunked(
      service,
      'steps_hourly',
      hourlyFromSamples(samples).map((bucket) => ({
        user_id: profile.id,
        ...bucket,
        updated_at: now,
      })),
      'user_id,day,hour'
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
    samples: samples.length,
    historyDays,
  }
}

// Sync every Google-Health-connected profile in turn (sequentially, to stay within the
// function's compute/rate limits). Full multi-year history backfills ONCE per user, then
// flips profiles.health_data_backfilled_at so it only runs that first time. Returns a
// { users, rows, skipped } tally. Requires a service-role client.
export async function syncAllConnectedUsers(service, { days = 7 } = {}) {
  const { data: profiles, error } = await service
    .from('profiles')
    .select(
      'id, google_health_access_token, google_health_refresh_token, google_health_token_expires_at, health_data_backfilled_at'
    )
    .not('google_health_refresh_token', 'is', null)

  if (error) throw new Error(error.message)

  let users = 0
  let rows = 0
  let skipped = 0

  for (const profile of profiles ?? []) {
    try {
      const fullHistory = !profile.health_data_backfilled_at
      const result = await syncUserMetrics(service, profile, { days, fullHistory })
      if (result.ok && result.rows > 0) {
        users++
        rows += result.rows
        if (fullHistory && result.historyDays > 0) {
          await service
            .from('profiles')
            .update({ health_data_backfilled_at: new Date().toISOString() })
            .eq('id', profile.id)
        }
      } else {
        skipped++
      }
    } catch (err) {
      console.error(`[sync] failed for profile ${profile.id}:`, err?.message ?? err)
      skipped++
    }
  }

  return { users, rows, skipped }
}
