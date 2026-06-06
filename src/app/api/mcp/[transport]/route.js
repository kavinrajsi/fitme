/**
 * Remote MCP server — lets an AI tool (Claude Desktop/Code/web) READ the
 * authenticated user's fitness data. Auth is a per-user Bearer token generated
 * on /ai; `verifyToken` maps it to a user id, and every tool reads only that
 * user's rows via the shared accessors in `@/lib/fitness-data` (the same code the
 * public REST API at /api/v1 uses). MCP requests carry no session.
 *
 * Endpoint: POST/GET /api/mcp/mcp  (Streamable HTTP, SSE disabled — no Redis).
 */
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveToken } from '@/lib/api-tokens'
import {
  getProfileSummary,
  getDailyMetrics,
  getStepStats,
  getStreaks,
  getHeatmap,
  getWorkouts,
  getLeaderboard,
} from '@/lib/fitness-data'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
        const data = await getProfileSummary(createServiceClient(), userId)
        return result(data ?? { error: 'Profile not found.' })
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
        return result(await getDailyMetrics(createServiceClient(), userId, { days }))
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
        return result(await getStepStats(createServiceClient(), userId))
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
        return result(await getStreaks(createServiceClient(), userId))
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
        return result(await getHeatmap(createServiceClient(), userId))
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
        return result(await getWorkouts(createServiceClient(), userId, { limit }))
      }
    )

    server.registerTool(
      'get_leaderboard',
      {
        description:
          'Cross-user step leaderboard for a period. `period`: "today", "yesterday", "7d", or "month". Ranked high to low; the current user is flagged with isYou:true.',
        inputSchema: { period: z.enum(['today', 'yesterday', '7d', 'month']).optional() },
      },
      async ({ period }, extra) => {
        const userId = extra?.authInfo?.extra?.userId
        return result(await getLeaderboard(createServiceClient(), userId, { period }))
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
