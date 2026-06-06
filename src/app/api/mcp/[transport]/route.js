/**
 * Remote MCP server — lets an AI tool (Claude Desktop/Code/web) READ the
 * authenticated user's fitness data. Auth is a per-user Bearer token generated
 * on /profile; `verifyToken` maps it to a user id, and every tool reads only
 * that user's rows via the service-role client (MCP requests carry no session).
 *
 * Endpoint: POST/GET /api/mcp/mcp  (Streamable HTTP, SSE disabled — no Redis).
 */
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveToken } from '@/lib/api-tokens'
import { computeGamification } from '@/lib/gamification'
import { buildHeatmap } from '@/lib/heatmap'
import { dkey, istMonthStart } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAILY_COLS =
  'date, steps, calories, total_calories, distance_km, hr_avg, hr_min, hr_max, resting_hr, vo2_max, spo2, hrv_ms, sleep_min, active_min, hydration_ml'

/** Wrap any JSON-serialisable value as an MCP text result. */
function result(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'get_profile',
      {
        description:
          'The user\'s profile: name, email, height, weight, BMI, age, gender, daily step goal, and whether Google Health is connected.',
      },
      async (extra) => {
        const userId = extra?.authInfo?.extra?.userId
        const service = createServiceClient()
        const { data: p } = await service
          .from('profiles')
          .select(
            'full_name, email, height_cm, weight_kg, age, gender, birthday, daily_step_goal, google_health_refresh_token'
          )
          .eq('id', userId)
          .maybeSingle()
        if (!p) return result({ error: 'Profile not found.' })

        let bmi = null
        if (p.height_cm && p.weight_kg) {
          const m = p.height_cm / 100
          bmi = Math.round((p.weight_kg / (m * m)) * 10) / 10
        }
        return result({
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
        })
      }
    )

    server.registerTool(
      'get_daily_metrics',
      {
        description:
          'Daily health metrics (steps, calories, distance, heart rate, resting HR, VO2 max, SpO2, HRV, sleep, active minutes, hydration) for the last N days, newest first.',
        inputSchema: { days: z.number().int().min(1).max(365).optional() },
      },
      async ({ days }, extra) => {
        const userId = extra?.authInfo?.extra?.userId
        const span = days ?? 30
        const service = createServiceClient()
        const { data } = await service
          .from('daily_metrics')
          .select(DAILY_COLS)
          .eq('user_id', userId)
          .gte('date', dkey(span - 1))
          .order('date', { ascending: false })
        return result({ days: span, rows: data ?? [] })
      }
    )

    server.registerTool(
      'get_step_stats',
      {
        description:
          'Step summary: today, yesterday, last-7-day total + average, previous-7-day total (for trend), and 30-day average.',
      },
      async (extra) => {
        const userId = extra?.authInfo?.extra?.userId
        const service = createServiceClient()
        const { data } = await service
          .from('daily_metrics')
          .select('date, steps')
          .eq('user_id', userId)
          .gte('date', dkey(29))
        const byDate = {}
        for (const r of data ?? []) byDate[r.date] = r.steps || 0
        const range = (from, to) =>
          Array.from({ length: to - from + 1 }, (_, i) => byDate[dkey(from + i)] || 0)
        const last7 = range(0, 6)
        const prev7 = range(7, 13)
        const all30 = range(0, 29)
        const total7 = last7.reduce((a, b) => a + b, 0)
        return result({
          today: byDate[dkey(0)] || 0,
          yesterday: byDate[dkey(1)] || 0,
          last7Total: total7,
          last7Avg: Math.round(total7 / 7),
          prev7Total: prev7.reduce((a, b) => a + b, 0),
          last30Avg: Math.round(all30.reduce((a, b) => a + b, 0) / 30),
        })
      }
    )

    server.registerTool(
      'get_streaks_and_achievements',
      {
        description:
          'Goal streaks (current + best), totals, best day, best week, and the 9 achievement badges with earned status — relative to the user\'s daily step goal.',
      },
      async (extra) => {
        const userId = extra?.authInfo?.extra?.userId
        const service = createServiceClient()
        const [{ data: rows }, { data: profile }] = await Promise.all([
          service.from('daily_metrics').select('date, steps').eq('user_id', userId),
          service.from('profiles').select('daily_step_goal').eq('id', userId).maybeSingle(),
        ])
        return result(computeGamification(rows ?? [], profile?.daily_step_goal ?? 10000))
      }
    )

    server.registerTool(
      'get_activity_heatmap',
      {
        description:
          'When the user is active: a weekday (0=Sun) x hour grid of summed steps over the last ~90 days, plus a peak-time insight.',
      },
      async (extra) => {
        const userId = extra?.authInfo?.extra?.userId
        const service = createServiceClient()
        const { data } = await service
          .from('steps_hourly')
          .select('day, hour, steps')
          .eq('user_id', userId)
          .gte('day', dkey(89))
        return result(buildHeatmap(data ?? []))
      }
    )

    server.registerTool(
      'get_workouts',
      {
        description:
          'Recent workout sessions (type, start/end, duration, steps, calories, distance, active zone minutes), newest first.',
        inputSchema: { limit: z.number().int().min(1).max(100).optional() },
      },
      async ({ limit }, extra) => {
        const userId = extra?.authInfo?.extra?.userId
        const service = createServiceClient()
        const { data } = await service
          .from('workouts')
          .select(
            'started_at, ended_at, type, duration_min, calories, distance_km, steps, active_zone_minutes, elevation_m'
          )
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(limit ?? 20)
        return result({ workouts: data ?? [] })
      }
    )

    server.registerTool(
      'get_leaderboard',
      {
        description:
          'Cross-user step leaderboard for a period. `period`: "today", "7d", or "month". Ranked high to low; the current user is flagged with isYou:true.',
        inputSchema: { period: z.enum(['today', '7d', 'month']).optional() },
      },
      async ({ period }, extra) => {
        const userId = extra?.authInfo?.extra?.userId
        const p = period ?? '7d'
        const since = p === 'today' ? dkey(0) : p === 'month' ? istMonthStart() : dkey(6)
        const service = createServiceClient()
        const { data } = await service.rpc('leaderboard_since', { since_date: since })
        const ranking = (data ?? []).map((row, i) => ({
          rank: i + 1,
          name: row.full_name,
          totalSteps: row.total_steps,
          isYou: row.id === userId,
        }))
        return result({ period: p, since, ranking })
      }
    )
  },
  { serverInfo: { name: 'kyarefitting', version: '1.0.0' } },
  { basePath: '/api/mcp', disableSse: true, maxDuration: 60 }
)

/** Map a presented Bearer token to MCP auth info carrying the owner's user id. */
async function verifyToken(_req, bearerToken) {
  if (!bearerToken) return undefined
  const resolved = await resolveToken(createServiceClient(), bearerToken)
  if (!resolved) return undefined
  return {
    token: bearerToken,
    clientId: resolved.userId,
    scopes: [],
    extra: { userId: resolved.userId },
  }
}

const authHandler = withMcpAuth(handler, verifyToken, { required: true })

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
