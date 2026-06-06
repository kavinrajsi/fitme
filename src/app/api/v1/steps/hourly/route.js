/**
 * GET /api/v1/steps/hourly?days=30  (or ?from=YYYY-MM-DD&to=YYYY-MM-DD)
 * Raw hourly step buckets for the authenticated user (scope: read).
 */
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiJson, preflight } from '@/lib/api-response'
import { createServiceClient } from '@/lib/supabase/service'
import { getHourlySteps } from '@/lib/fitness-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const OPTIONS = preflight

export async function GET(request) {
  const auth = await authenticateApiRequest(request, { scope: 'read' })
  if (auth instanceof Response) return auth
  const { searchParams } = new URL(request.url)
  const data = await getHourlySteps(createServiceClient(), auth.userId, {
    days: searchParams.get('days'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })
  return apiJson(data)
}
