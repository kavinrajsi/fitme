/**
 * POST /api/push/unsubscribe — remove the signed-in user's Web Push subscription.
 *
 * Auth: requires a valid session (401 otherwise). Body carries the { endpoint } to
 * remove; the delete is scoped to both endpoint AND the authenticated user's id so a
 * user can only drop their own subscription. Replies 204 (idempotent — deleting a row
 * that isn't there is fine).
 */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// Require a session, then delete the row matching the given endpoint for this user only.
export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { endpoint } = (await request.json().catch(() => ({}))) ?? {}
  if (!endpoint) return new Response('Bad Request', { status: 400 })

  const service = createServiceClient()
  await service
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', user.id)

  return new Response(null, { status: 204 })
}
