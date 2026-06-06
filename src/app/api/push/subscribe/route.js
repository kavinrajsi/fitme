/**
 * POST /api/push/subscribe — store (upsert) the signed-in user's Web Push
 * subscription so the app can send them notifications.
 *
 * Auth: requires a valid session (401 otherwise). The body is the browser's
 * PushSubscription JSON ({ endpoint, keys: { p256dh, auth } }) plus optional
 * device/userAgent labels. Rows are keyed by endpoint so re-subscribing the same
 * browser updates in place. Writes via the service client (RLS-bypassing) but always
 * scoped to the authenticated user's id. Replies 204 on success.
 */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// Require a session, validate the PushSubscription payload, then upsert it (keyed on
// endpoint) for the current user.
export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Validate the PushSubscription shape — all three fields are required to send a push.
  const subscription = await request.json().catch(() => null)
  const endpoint = subscription?.endpoint
  const p256dh = subscription?.keys?.p256dh
  const auth = subscription?.keys?.auth
  if (!endpoint || !p256dh || !auth) return new Response('Bad Request', { status: 400 })

  // Optional, client-supplied labels — trim to keep untrusted strings bounded.
  const device = typeof subscription.device === 'string' ? subscription.device.slice(0, 200) : null
  const userAgent =
    typeof subscription.userAgent === 'string' ? subscription.userAgent.slice(0, 500) : null

  const service = createServiceClient()
  const { error } = await service
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth, device, user_agent: userAgent },
      { onConflict: 'endpoint' }
    )
  if (error) return new Response('Error', { status: 500 })

  return new Response(null, { status: 204 })
}
