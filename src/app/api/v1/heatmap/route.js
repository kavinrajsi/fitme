/**
 * GET /api/v1/heatmap — weekday×hour activity grid (last ~90 days) + peak-time
 * insight for the authenticated user (scope: read).
 */
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiJson, preflight } from '@/lib/api-response'
import { createServiceClient } from '@/lib/supabase/service'
import { getHeatmap } from '@/lib/fitness-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const OPTIONS = preflight

export async function GET(request) {
  const auth = await authenticateApiRequest(request, { scope: 'read' })
  if (auth instanceof Response) return auth
  return apiJson(await getHeatmap(createServiceClient(), auth.userId))
}
