/**
 * GET /api/v1/streaks — goal streaks, totals, best day/week, and the 9
 * achievement badges for the authenticated user (scope: read).
 */
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiJson, preflight } from '@/lib/api-response'
import { createServiceClient } from '@/lib/supabase/service'
import { getStreaks } from '@/lib/fitness-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const OPTIONS = preflight

export async function GET(request) {
  const auth = await authenticateApiRequest(request, { scope: 'read' })
  if (auth instanceof Response) return auth
  return apiJson(await getStreaks(createServiceClient(), auth.userId))
}
