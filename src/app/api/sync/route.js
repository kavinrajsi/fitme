/**
 * POST /api/sync — on-demand sync of the current user's Google Health metrics into
 * daily_metrics, STREAMING progress so the UI can show each step live and then the
 * synced results.
 *
 * Emits newline-delimited JSON events:
 *   { step: "…" }                      progress line
 *   { error: "…" }                     fatal, stops
 *   { done: true, summary, recent }    final result
 *
 * Uses the user's session to identify them, then the service-role client to refresh
 * the health token and upsert their rows (scoped to their id).
 */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getValidHealthAccessToken } from '@/lib/google-auth'
import { getDailyMetrics } from '@/lib/google-health'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      try {
        if (!user) {
          send({ error: 'You are not signed in.' })
          return controller.close()
        }

        send({ step: 'Checking your Google Health connection' })
        const service = createServiceClient()
        const { data: profile } = await service
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile?.google_health_refresh_token) {
          send({ error: 'Google Health is not connected.' })
          return controller.close()
        }

        send({ step: 'Refreshing the Google Health access token' })
        const token = await getValidHealthAccessToken(profile, service)
        if (!token) {
          send({ error: 'Could not refresh your Google Health token — please reconnect.' })
          return controller.close()
        }

        send({ step: 'Fetching steps, calories, distance & heart rate (last 90 days)' })
        const metrics = await getDailyMetrics(token, 90)

        send({ step: `Saving ${metrics.length} days to the database` })
        const now = new Date().toISOString()
        if (metrics.length) {
          await service
            .from('daily_metrics')
            .upsert(
              metrics.map((m) => ({ user_id: user.id, ...m, updated_at: now })),
              { onConflict: 'user_id,date' }
            )
        }

        const totalSteps = metrics.reduce((s, m) => s + (m.steps || 0), 0)
        const withSteps = metrics.filter((m) => (m.steps || 0) > 0).length
        send({
          done: true,
          summary: {
            days: metrics.length,
            withSteps,
            totalSteps,
            avgSteps: metrics.length ? Math.round(totalSteps / metrics.length) : 0,
          },
          recent: metrics.slice(0, 7), // already newest-first
        })
        controller.close()
      } catch {
        send({ error: 'Sync failed — please try again.' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
    },
  })
}
