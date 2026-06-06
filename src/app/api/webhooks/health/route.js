/**
 * POST /api/webhooks/health — Google Health API webhook receiver.
 *
 * When a subscriber is registered with an AUTOMATIC policy, Google pushes a
 * data-change notification here whenever a consenting user generates new data. We map
 * healthUserId -> our user and re-sync just that user, keeping daily_metrics fresh
 * without waiting for the nightly cron or a manual Sync.
 *
 * Auth: every request must carry the shared secret in the Authorization header,
 * matching GOOGLE_HEALTH_WEBHOOK_SECRET (the value set as endpointAuthorization.secret
 * when registering the subscriber).
 *
 * Registration sends a verification handshake (body {"type":"verification"}): the
 * authorized probe expects 200, the unauthorized one expects 401.
 *
 * Notifications must be acked with 204 so Google stops retrying (it retries failed
 * deliveries with backoff for up to 7 days).
 *
 * Docs: https://developers.google.com/health/webhooks
 */
import { createServiceClient } from '@/lib/supabase/service'
import { syncUserMetrics } from '@/lib/sync-metrics'
import { notifyTopMovers } from '@/lib/notify-leaderboard'

export const dynamic = 'force-dynamic'

// Check the shared secret, answer the verification handshake, then for a real
// data-change notification resolve healthUserId -> profile and re-sync a short window.
// Every non-handshake path returns 204 so Google stops retrying.
export async function POST(request) {
  const secret = process.env.GOOGLE_HEALTH_WEBHOOK_SECRET
  const authorized = !!secret && request.headers.get('authorization') === secret

  let body = null
  try {
    body = await request.json()
  } catch {
    // non-JSON body
  }

  // Verification handshake — authorized probe expects 200, unauthorized expects 401.
  if (body?.type === 'verification') {
    return new Response(null, { status: authorized ? 200 : 401 })
  }

  // All real notifications must be authorized.
  if (!authorized) {
    return new Response(null, { status: 401 })
  }

  const healthUserId = body?.data?.healthUserId
  if (typeof healthUserId !== 'string' || !healthUserId.trim()) {
    // Malformed/unknown payload — ack so Google doesn't retry for 7 days.
    return new Response(null, { status: 204 })
  }

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('google_health_user_id', healthUserId)
    .maybeSingle()

  // healthUserId not captured yet (user hasn't synced since the column was added) —
  // ack; their next cron/manual sync stores it and later notifications resolve.
  if (profile) {
    try {
      // Webhook fires on new data, so a short window is enough.
      await syncUserMetrics(supabase, profile, { days: 7 })
      await notifyTopMovers(supabase)
    } catch (err) {
      // Ack anyway — retries are for delivery failures, not our processing errors.
      console.error(`[webhook] sync failed for ${healthUserId}:`, err?.message ?? err)
    }
  }

  return new Response(null, { status: 204 })
}
