/**
 * POST /api/push/test — admin-only: broadcast a test Web Push to every subscriber.
 *
 * Auth: gated on the signed-in user's email matching ADMIN_EMAIL (403 otherwise).
 * Used to confirm the push pipeline (VAPID keys, service worker, stored subscriptions)
 * is working. Returns { sent } — how many subscriptions were delivered to.
 */
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/constants'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'

// Verify the caller is the admin, then fan out one canned notification to all
// stored subscriptions and report how many were sent.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) return new Response('Forbidden', { status: 403 })

  const { sent } = await sendPushToAll(
    {
      title: 'KyaReFitting aa',
      body: 'Test notification — push is working 🎉',
      url: '/leaderboard',
    },
    { source: 'test' }
  )
  return Response.json({ sent })
}
