/**
 * Bearer-token authentication for the public REST API (`/api/v1/*`).
 *
 * This is the single seam where a request is mapped to a user. Today it resolves
 * personal `kref_` tokens; a future OAuth2 layer would resolve its access tokens
 * here too, and every endpoint keeps working unchanged. On success it returns the
 * user id + granted scopes; on failure it returns a ready-to-send error Response.
 */
import { createServiceClient } from '@/lib/supabase/service'
import { resolveToken } from '@/lib/api-tokens'
import { resolveAccessToken } from '@/lib/oauth'
import { apiError, rateLimitHeaders } from '@/lib/api-response'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * Authenticate a request and (optionally) require a scope. Returns either
 * `{ userId, scopes }` or a `Response` (401/403) — callers check
 * `if (auth instanceof Response) return auth`.
 */
export async function authenticateApiRequest(request, { scope } = {}) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token) {
    return apiError(401, 'unauthorized', 'Missing Bearer token. Mint one at /ai.')
  }

  // Dispatch by prefix: OAuth access tokens (`kref_at_…`) vs personal tokens.
  const service = createServiceClient()
  const resolved = token.startsWith('kref_at_')
    ? await resolveAccessToken(service, token)
    : await resolveToken(service, token)
  if (!resolved) {
    return apiError(401, 'invalid_token', 'Token is invalid or revoked.')
  }

  // Per-user fixed-window rate limit (shared across instances via Postgres).
  const rl = await enforceRateLimit(service, `tok:${resolved.userId}`)
  if (!rl.allowed) {
    return apiError(429, 'rate_limited', 'Too many requests — slow down.', {
      'Retry-After': String(Math.max(1, rl.reset - Math.floor(Date.now() / 1000))),
      ...rateLimitHeaders(rl),
    })
  }

  if (scope && !resolved.scopes.includes(scope)) {
    return apiError(403, 'insufficient_scope', `This token lacks the "${scope}" scope.`)
  }

  return { userId: resolved.userId, scopes: resolved.scopes }
}
