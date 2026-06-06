/**
 * GET  /api/v1/me  — the authenticated user's profile summary (scope: read).
 * PATCH /api/v1/me — update writable profile fields; currently `{ dailyStepGoal }`
 *                    validated 1000–100000 (scope: write).
 */
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiJson, apiError, preflight } from '@/lib/api-response'
import { createServiceClient } from '@/lib/supabase/service'
import { getProfileSummary } from '@/lib/fitness-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const OPTIONS = preflight

export async function GET(request) {
  const auth = await authenticateApiRequest(request, { scope: 'read' })
  if (auth instanceof Response) return auth
  const data = await getProfileSummary(createServiceClient(), auth.userId)
  if (!data) return apiError(404, 'not_found', 'Profile not found.')
  return apiJson(data)
}

export async function PATCH(request) {
  const auth = await authenticateApiRequest(request, { scope: 'write' })
  if (auth instanceof Response) return auth

  let body
  try {
    body = await request.json()
  } catch {
    return apiError(400, 'invalid_body', 'Request body must be JSON.')
  }

  // Only the daily step goal is writable for now; same range as the in-app form.
  const goal = Number(body?.dailyStepGoal)
  if (!Number.isInteger(goal) || goal < 1000 || goal > 100000) {
    return apiError(422, 'invalid_field', 'dailyStepGoal must be an integer 1000–100000.')
  }

  const service = createServiceClient()
  const { error } = await service
    .from('profiles')
    .update({ daily_step_goal: goal })
    .eq('id', auth.userId)
  if (error) return apiError(500, 'update_failed', 'Could not update the profile.')

  return apiJson(await getProfileSummary(service, auth.userId))
}
