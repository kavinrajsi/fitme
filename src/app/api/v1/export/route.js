/**
 * GET /api/v1/export — everything the authenticated user owns (profile + up to a
 * year of daily metrics & hourly steps + workouts + streaks) in one JSON payload,
 * served as a download (scope: read).
 */
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiJson, preflight } from '@/lib/api-response'
import { createServiceClient } from '@/lib/supabase/service'
import { getFullExport } from '@/lib/fitness-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const OPTIONS = preflight

export async function GET(request) {
  const auth = await authenticateApiRequest(request, { scope: 'read' })
  if (auth instanceof Response) return auth
  const data = await getFullExport(createServiceClient(), auth.userId)
  return apiJson(data, {
    headers: { 'Content-Disposition': 'attachment; filename="kyarefitting-export.json"' },
  })
}
