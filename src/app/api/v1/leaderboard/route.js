/**
 * GET /api/v1/leaderboard?period=7d — cross-user step ranking (today/yesterday/
 * 7d/month). Returns only leaderboard-safe fields; the caller's row is flagged
 * isYou (scope: read).
 */
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiJson, preflight } from '@/lib/api-response'
import { createServiceClient } from '@/lib/supabase/service'
import { getLeaderboard } from '@/lib/fitness-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const OPTIONS = preflight

export async function GET(request) {
  const auth = await authenticateApiRequest(request, { scope: 'read' })
  if (auth instanceof Response) return auth
  const { searchParams } = new URL(request.url)
  return apiJson(
    await getLeaderboard(createServiceClient(), auth.userId, { period: searchParams.get('period') })
  )
}
