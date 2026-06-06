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
import { syncUserMetrics } from '@/lib/sync-metrics'
import { notifyTopMovers } from '@/lib/notify-leaderboard'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Identify the caller from their session, then drive the sync inside a ReadableStream
// so each progress step is flushed to the client as it happens (rather than buffering a
// single response at the end). Every branch ends by closing the stream.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // One NDJSON line per event — each enqueue is a flushed chunk to the client.
      const send = (event) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
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

        const result = await syncUserMetrics(service, profile, {
          days: 90,
          onStep: (stepMessage) => send({ step: stepMessage }),
        })

        if (!result.ok) {
          const needsReconnect =
            result.reason === 'no_token' || result.reason === 'reconnect_required'
          send({
            error: needsReconnect
              ? 'Could not access Google Health — please reconnect.'
              : 'Sync failed — please try again.',
            reconnect: needsReconnect,
          })
          return controller.close()
        }

        // Alert everyone if this sync moved a top-4 (7-day) person up the board.
        await notifyTopMovers(service)

        const metrics = result.metrics
        const totalSteps = metrics.reduce((sum, metric) => sum + (metric.steps || 0), 0)
        const withSteps = metrics.filter((metric) => (metric.steps || 0) > 0).length
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
      } catch (err) {
        console.error('[sync] error for user', user?.id, err?.message ?? err)
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
