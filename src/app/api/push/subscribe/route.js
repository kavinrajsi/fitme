/** POST /api/push/subscribe — store the signed-in user's Web Push subscription. */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const subscription = await request.json().catch(() => null)
  const endpoint = subscription?.endpoint
  const p256dh = subscription?.keys?.p256dh
  const auth = subscription?.keys?.auth
  if (!endpoint || !p256dh || !auth) return new Response('Bad Request', { status: 400 })

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
