/**
 * GET /api/v1/openapi.json — a minimal OpenAPI 3 description of the public REST
 * API, for developer tooling and docs. No auth (it's just the schema); the server
 * URL is derived from the request host so it's correct in any environment.
 */
import { apiJson, preflight } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const OPTIONS = preflight

// All read endpoints share the same Bearer-token security; only PATCH /me needs write.
const read = { security: [{ bearerAuth: [] }], tags: ['fitness'] }

export async function GET(request) {
  const host = request.headers.get('host')
  const proto = host?.startsWith('localhost') || host?.startsWith('127.') ? 'http' : 'https'
  const base = host ? `${proto}://${host}` : ''

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'KyaReFitting API',
      version: '1.0.0',
      description:
        'Read your own KyaReFitting fitness data with a personal token minted at /ai. ' +
        'Send it as `Authorization: Bearer kref_…`. Read tokens can call every GET; ' +
        'writing (PATCH /me) needs a token with the write scope.',
    },
    servers: [{ url: `${base}/api/v1` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'kref_*' },
      },
    },
    paths: {
      '/me': {
        get: { ...read, summary: 'Profile summary' },
        patch: {
          security: [{ bearerAuth: [] }],
          tags: ['fitness'],
          summary: 'Update writable profile fields (dailyStepGoal). Requires write scope.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { dailyStepGoal: { type: 'integer', minimum: 1000, maximum: 100000 } },
                  required: ['dailyStepGoal'],
                },
              },
            },
          },
        },
      },
      '/daily-metrics': {
        get: {
          ...read,
          summary: 'Daily health metrics (newest first)',
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365 } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
        },
      },
      '/steps/stats': { get: { ...read, summary: 'Step totals/averages and trend' } },
      '/steps/hourly': {
        get: {
          ...read,
          summary: 'Hourly step buckets',
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365 } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
        },
      },
      '/heatmap': { get: { ...read, summary: 'Weekday×hour activity grid + insight' } },
      '/streaks': { get: { ...read, summary: 'Streaks, totals, and achievement badges' } },
      '/workouts': {
        get: {
          ...read,
          summary: 'Recent workout sessions',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          ],
        },
      },
      '/leaderboard': {
        get: {
          ...read,
          summary: 'Cross-user step ranking (leaderboard-safe fields only)',
          parameters: [
            {
              name: 'period',
              in: 'query',
              schema: { type: 'string', enum: ['today', 'yesterday', '7d', 'month'] },
            },
          ],
        },
      },
      '/export': { get: { ...read, summary: 'Full JSON export of everything you own' } },
    },
  }

  return apiJson(spec)
}
