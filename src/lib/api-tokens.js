/**
 * Per-user API tokens for the MCP server (AI tool access).
 *
 * A raw token is shown to the user exactly once; we only ever store its SHA-256
 * hash in `api_tokens.token_hash`. Lookups hash the presented bearer and match
 * the stored hash, so a database leak never exposes a usable token.
 */
import crypto from 'node:crypto'

const PREFIX = 'kref_'

/** Generate a fresh raw token: `kref_<43 url-safe chars>` (32 random bytes). */
export function generateToken() {
  return PREFIX + crypto.randomBytes(32).toString('base64url')
}

/** SHA-256 hex of a raw token — what we persist and compare against. */
export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/** Last 4 chars, for a non-sensitive display hint (e.g. "…a1b2"). */
export function lastFour(raw) {
  return raw.slice(-4)
}

/**
 * Resolve a presented bearer token to its owner. Uses the service-role client
 * (no session on MCP requests). Returns `{ userId }` for a valid, non-revoked
 * token, or null. Bumps `last_used_at` best-effort (never blocks the request).
 */
export async function resolveToken(service, raw) {
  if (!raw || !raw.startsWith(PREFIX)) return null

  const { data, error } = await service
    .from('api_tokens')
    .select('id, user_id')
    .eq('token_hash', hashToken(raw))
    .is('revoked_at', null)
    .maybeSingle()

  if (error || !data) return null

  // Fire-and-forget: record usage without delaying the tool call.
  service
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {}, () => {})

  return { userId: data.user_id }
}
