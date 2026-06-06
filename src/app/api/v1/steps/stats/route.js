/**
 * GET /api/v1/steps/stats — today, yesterday, last-7 total+avg, prev-7 total,
 * and 30-day average for the authenticated user (scope: read).
 */
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiJson, preflight } from '@/lib/api-response'
import { createServiceClient } from '@/lib/supabase/service'
import { getStepStats } from '@/lib/fitness-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const OPTIONS = preflight

export async function GET(request) {
  const auth = await authenticateApiRequest(request, { scope: 'read' })
  if (auth instanceof Response) return auth
  return apiJson(await getStepStats(createServiceClient(), auth.userId))
}
