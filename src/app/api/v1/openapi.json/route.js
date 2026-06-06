/**
 * GET /api/v1/openapi.json — OpenAPI 3 description of the public REST API, with
 * response (and request) examples inlined so Swagger UI / Postman / SDK generators
 * show real payloads. No auth; the server URL is derived from the request host.
 */
import { apiJson, preflight } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const OPTIONS = preflight

// Sample payloads, shared with docs/API.md — keep them in sync.
const EX = {
  me: {
    name: 'Sujith Kumaar',
    email: 'sujith@example.com',
    heightCm: 178,
    weightKg: 72.5,
    bmi: 22.9,
    age: 29,
    gender: 'male',
    birthday: '1996-08-14',
    dailyStepGoal: 10000,
    healthConnected: true,
  },
  dailyMetrics: {
    days: 1,
    from: null,
    to: null,
    rows: [
      {
        date: '2026-06-06',
        steps: 8421,
        calories: 412,
        total_calories: 2210,
        distance_km: 6.1,
        hr_avg: 78,
        hr_min: 52,
        hr_max: 141,
        resting_hr: 58,
        vo2_max: 41.2,
        spo2: 97,
        hrv_ms: 48,
        sleep_min: 412,
        active_min: 64,
        hydration_ml: 1800,
      },
    ],
  },
  stepStats: {
    today: 8421,
    yesterday: 11034,
    last7Total: 61240,
    last7Avg: 8749,
    prev7Total: 54980,
    last30Avg: 8120,
  },
  hourly: {
    rows: [
      { day: '2026-06-06', hour: 7, steps: 820 },
      { day: '2026-06-06', hour: 18, steps: 2110 },
    ],
  },
  heatmap: {
    grid: [[0, 0, 0, 0, 0, 0, 120, 540, 310, 200, 180, 260, 300, 210, 190, 220, 260, 640, 820, 410, 180, 60, 0, 0]],
    max: 820,
    has: true,
    insight: 'Most active around 6 PM · busiest on Saturday',
  },
  streaks: {
    today: 8421,
    goal: 10000,
    pct: 0.842,
    total: 1284300,
    bestDay: 23110,
    goalDays: 96,
    currentStreak: 3,
    bestStreak: 14,
    bestWeek: 88210,
    achievements: [
      { id: 'first', name: 'First Steps', icon: '👟', earned: true },
      { id: 'streak30', name: '30-Day Streak', icon: '🏆', earned: false },
    ],
  },
  workouts: {
    workouts: [
      {
        started_at: '2026-06-06T01:10:00Z',
        ended_at: '2026-06-06T01:48:00Z',
        type: 'running',
        duration_min: 38,
        calories: 410,
        distance_km: 6.2,
        steps: 6800,
        active_zone_minutes: 31,
        elevation_m: 24,
      },
    ],
  },
  leaderboard: {
    period: '7d',
    since: '2026-05-31',
    until: '2026-06-06',
    ranking: [
      { rank: 1, name: 'Sanjay Manivannan', totalSteps: 78210, isYou: false },
      { rank: 2, name: 'Sujith Kumaar', totalSteps: 61240, isYou: true },
    ],
  },
  export: {
    exportedAt: '2026-06-06T10:30:00Z',
    profile: { name: 'Sujith Kumaar', dailyStepGoal: 10000 },
    dailyMetrics: { days: 365, rows: [] },
    workouts: { workouts: [] },
    hourlySteps: { rows: [] },
    streaks: { currentStreak: 3, bestStreak: 14 },
  },
}

// Build a 200 response object with an inlined JSON example.
const ok = (summary, example) => ({
  security: [{ bearerAuth: [] }],
  tags: ['fitness'],
  summary,
  responses: { 200: { description: 'OK', content: { 'application/json': { example } } } },
})

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
        get: ok('Profile summary', EX.me),
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
                example: { dailyStepGoal: 12000 },
              },
            },
          },
          responses: { 200: { description: 'Updated profile', content: { 'application/json': { example: { ...EX.me, dailyStepGoal: 12000 } } } } },
        },
      },
      '/daily-metrics': {
        get: {
          ...ok('Daily health metrics (newest first)', EX.dailyMetrics),
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365 }, example: 30 },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
        },
      },
      '/steps/stats': { get: ok('Step totals/averages and trend', EX.stepStats) },
      '/steps/hourly': {
        get: {
          ...ok('Hourly step buckets', EX.hourly),
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365 }, example: 30 },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
        },
      },
      '/heatmap': { get: ok('Weekday×hour activity grid + insight', EX.heatmap) },
      '/streaks': { get: ok('Streaks, totals, and achievement badges', EX.streaks) },
      '/workouts': {
        get: {
          ...ok('Recent workout sessions', EX.workouts),
          parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 }, example: 20 }],
        },
      },
      '/leaderboard': {
        get: {
          ...ok('Cross-user step ranking (leaderboard-safe fields only)', EX.leaderboard),
          parameters: [
            {
              name: 'period',
              in: 'query',
              schema: { type: 'string', enum: ['today', 'yesterday', '7d', 'month'] },
              example: '7d',
            },
          ],
        },
      },
      '/export': { get: ok('Full JSON export of everything you own', EX.export) },
      '/openapi.json': {
        get: { tags: ['meta'], summary: 'This OpenAPI document (no auth)', responses: { 200: { description: 'OK' } } },
      },
    },
  }

  return apiJson(spec)
}
