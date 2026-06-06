/**
 * GET /api/v1/workouts?limit=20 — recent workout sessions for the authenticated
 * user, newest first (scope: read).
 */
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiJson, preflight } from '@/lib/api-response'
import { createServiceClient } from '@/lib/supabase/service'
import { getWorkouts } from '@/lib/fitness-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const OPTIONS = preflight

export async function GET(request) {
  const auth = await authenticateApiRequest(request, { scope: 'read' })
  if (auth instanceof Response) return auth
  const { searchParams } = new URL(request.url)
  return apiJson(
    await getWorkouts(createServiceClient(), auth.userId, { limit: searchParams.get('limit') })
  )
}
