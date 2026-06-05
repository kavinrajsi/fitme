/** POST /api/push/test — admin-only: send a test push to all subscribers. */
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/constants'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) return new Response('Forbidden', { status: 403 })

  const { sent } = await sendPushToAll({
    title: 'KyaReFitting',
    body: 'Test notification — push is working 🎉',
    url: '/leaderboard',
  })
  return Response.json({ sent })
}
