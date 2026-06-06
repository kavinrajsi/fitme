/**
 * Shared read accessors for a single user's fitness data.
 *
 * One source of truth for both the MCP server (`/api/mcp/mcp`) and the public REST
 * API (`/api/v1/*`) — every function takes the service-role client + a userId and
 * returns plain JSON-serialisable data scoped to that user only. Keeping the queries
 * here means the two surfaces can never drift apart.
 */
import { computeGamification } from '@/lib/gamification'
import { buildHeatmap } from '@/lib/heatmap'
import { dkey, istMonthStart } from '@/lib/date-utils'

// Columns returned for a daily_metrics row, shared by the metrics + export accessors.
export const DAILY_COLS =
  'date, steps, calories, total_calories, distance_km, hr_avg, hr_min, hr_max, resting_hr, vo2_max, spo2, hrv_ms, sleep_min, active_min, hydration_ml'

// Leaderboard windows, expressed as an inclusive [since, until] IST date range so the
// cross-user RPC matches the /leaderboard page exactly.
const PERIODS = {
  today: () => ({ since: dkey(0), until: dkey(0) }),
  yesterday: () => ({ since: dkey(1), until: dkey(1) }),
  '7d': () => ({ since: dkey(6), until: dkey(0) }),
  month: () => ({ since: istMonthStart(), until: dkey(0) }),
}

/** Profile summary incl. a derived BMI and whether Google Health is linked. */
export async function getProfileSummary(service, userId) {
  const { data: p } = await service
    .from('profiles')
    .select(
      'full_name, email, height_cm, weight_kg, age, gender, birthday, daily_step_goal, google_health_refresh_token'
    )
    .eq('id', userId)
    .maybeSingle()
  if (!p) return null

  let bmi = null
  if (p.height_cm && p.weight_kg) {
    const m = p.height_cm / 100
    bmi = Math.round((p.weight_kg / (m * m)) * 10) / 10
  }
  return {
    name: p.full_name,
    email: p.email,
    heightCm: p.height_cm,
    weightKg: p.weight_kg,
    bmi,
    age: p.age,
    gender: p.gender,
    birthday: p.birthday,
    dailyStepGoal: p.daily_step_goal ?? 10000,
    healthConnected: !!p.google_health_refresh_token,
  }
}

/**
 * Daily metrics newest-first. Pass `{ from, to }` for an explicit YYYY-MM-DD range,
 * otherwise a trailing window of `days` (default 30, clamped 1–365).
 */
export async function getDailyMetrics(service, userId, { days, from, to } = {}) {
  let query = service.from('daily_metrics').select(DAILY_COLS).eq('user_id', userId)

  let span = null
  if (from || to) {
    if (from) query = query.gte('date', from)
    if (to) query = query.lte('date', to)
  } else {
    span = Math.min(Math.max(Number(days) || 30, 1), 365)
    query = query.gte('date', dkey(span - 1))
  }

  const { data } = await query.order('date', { ascending: false })
  return { days: span, from: from ?? null, to: to ?? null, rows: data ?? [] }
}

/** Step summary: today, yesterday, last-7 total+avg, prev-7 total (trend), 30-day avg. */
export async function getStepStats(service, userId) {
  const { data } = await service
    .from('daily_metrics')
    .select('date, steps')
    .eq('user_id', userId)
    .gte('date', dkey(29))
  const byDate = {}
  for (const r of data ?? []) byDate[r.date] = r.steps || 0
  const range = (fromN, toN) =>
    Array.from({ length: toN - fromN + 1 }, (_, i) => byDate[dkey(fromN + i)] || 0)
  const last7 = range(0, 6)
  const prev7 = range(7, 13)
  const all30 = range(0, 29)
  const total7 = last7.reduce((a, b) => a + b, 0)
  return {
    today: byDate[dkey(0)] || 0,
    yesterday: byDate[dkey(1)] || 0,
    last7Total: total7,
    last7Avg: Math.round(total7 / 7),
    prev7Total: prev7.reduce((a, b) => a + b, 0),
    last30Avg: Math.round(all30.reduce((a, b) => a + b, 0) / 30),
  }
}

/** Streaks + totals + the 9 achievement badges, relative to the user's goal. */
export async function getStreaks(service, userId) {
  const [{ data: rows }, { data: profile }] = await Promise.all([
    service.from('daily_metrics').select('date, steps').eq('user_id', userId),
    service.from('profiles').select('daily_step_goal').eq('id', userId).maybeSingle(),
  ])
  return computeGamification(rows ?? [], profile?.daily_step_goal ?? 10000)
}

/** Weekday×hour activity grid (last ~90 days) + a peak-time insight. */
export async function getHeatmap(service, userId) {
  const { data } = await service
    .from('steps_hourly')
    .select('day, hour, steps')
    .eq('user_id', userId)
    .gte('day', dkey(89))
  return buildHeatmap(data ?? [])
}

/** Raw hourly step buckets. `{ from, to }` (YYYY-MM-DD) or a trailing `days` window. */
export async function getHourlySteps(service, userId, { days, from, to } = {}) {
  let query = service.from('steps_hourly').select('day, hour, steps').eq('user_id', userId)
  if (from || to) {
    if (from) query = query.gte('day', from)
    if (to) query = query.lte('day', to)
  } else {
    const span = Math.min(Math.max(Number(days) || 30, 1), 365)
    query = query.gte('day', dkey(span - 1))
  }
  const { data } = await query.order('day', { ascending: false }).order('hour', { ascending: true })
  return { rows: data ?? [] }
}

/** Recent workout sessions, newest first (limit clamped 1–100, default 20). */
export async function getWorkouts(service, userId, { limit } = {}) {
  const cap = Math.min(Math.max(Number(limit) || 20, 1), 100)
  const { data } = await service
    .from('workouts')
    .select(
      'started_at, ended_at, type, duration_min, calories, distance_km, steps, active_zone_minutes, elevation_m'
    )
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(cap)
  return { workouts: data ?? [] }
}

/**
 * Cross-user step leaderboard for a period (today/yesterday/7d/month, default 7d).
 * Returns only leaderboard-safe fields; the requesting user's row is flagged isYou.
 */
export async function getLeaderboard(service, userId, { period } = {}) {
  const key = PERIODS[period] ? period : '7d'
  const { since, until } = PERIODS[key]()
  const { data } = await service.rpc('leaderboard_between', {
    since_date: since,
    until_date: until,
  })
  const ranking = (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.full_name,
    totalSteps: row.total_steps,
    isYou: row.id === userId,
  }))
  return { period: key, since, until, ranking }
}

/** Everything the user owns, in one payload — the bulk "all data" export. */
export async function getFullExport(service, userId) {
  const [profile, { rows: daily }, { workouts }, { rows: hourly }, streaks] = await Promise.all([
    getProfileSummary(service, userId),
    getDailyMetrics(service, userId, { days: 365 }),
    getWorkouts(service, userId, { limit: 100 }),
    getHourlySteps(service, userId, { days: 365 }),
    getStreaks(service, userId),
  ])
  return {
    exportedAt: new Date().toISOString(),
    profile,
    dailyMetrics: daily,
    workouts,
    hourlySteps: hourly,
    streaks,
  }
}
