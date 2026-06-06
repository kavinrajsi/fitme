/**
 * OAuth2 authorization-code (+ PKCE) primitives.
 *
 * Lets third-party apps obtain a user's consent and act on their behalf without the
 * user pasting a personal token. Everything secret (client secrets, auth codes,
 * access + refresh tokens) is stored only as a SHA-256 hash, exactly like personal
 * `kref_` tokens. Access tokens are `kref_at_…` so the auth seam can tell them apart.
 *
 * Lifetimes: auth code 5 min (single-use), access token 1 h, refresh token 60 d
 * (rotated on every use). All access goes through the service-role client.
 */
import crypto from 'node:crypto'
import { hashToken } from '@/lib/api-tokens'

const CODE_TTL_MS = 5 * 60 * 1000
const ACCESS_TTL_MS = 60 * 60 * 1000
const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000

const iso = (ms) => new Date(Date.now() + ms).toISOString()
const expired = (ts) => new Date(ts).getTime() < Date.now()
const gen = (prefix) => prefix + crypto.randomBytes(32).toString('base64url')

/** New opaque identifiers. Client id is public; the rest are shown once then hashed. */
export const generateClientId = () => gen('kref_client_')
export const generateClientSecret = () => gen('kref_secret_')

/** Verify a PKCE code_verifier against the stored challenge. S256 only (plain allowed if set). */
export function pkceMatches(verifier, challenge, method) {
  if (!challenge || !verifier) return false
  if (method === 'S256') {
    return crypto.createHash('sha256').update(verifier).digest('base64url') === challenge
  }
  return method === 'plain' && verifier === challenge
}

/** Look up a client and (if a redirect_uri is given) require an exact match. */
export async function validateClient(service, clientId, redirectUri) {
  const { data } = await service
    .from('oauth_clients')
    .select('client_id, name, redirect_uris, client_secret_hash, disabled_at')
    .eq('client_id', clientId)
    .maybeSingle()
  if (!data || data.disabled_at) return null
  if (redirectUri && !data.redirect_uris.includes(redirectUri)) return null
  return data
}

/** Authenticate the client at the token endpoint (secret required only for confidential clients). */
export async function authenticateClient(service, clientId, clientSecret) {
  const { data } = await service
    .from('oauth_clients')
    .select('client_id, client_secret_hash, redirect_uris, disabled_at')
    .eq('client_id', clientId)
    .maybeSingle()
  if (!data || data.disabled_at) return null
  if (data.client_secret_hash) {
    if (!clientSecret || hashToken(clientSecret) !== data.client_secret_hash) return null
  }
  return data
}

/** Mint a single-use authorization code; returns the raw code (only the hash is stored). */
export async function createAuthorizationCode(
  service,
  { clientId, userId, redirectUri, scopes, codeChallenge, codeChallengeMethod }
) {
  const raw = gen('kref_code_')
  const { error } = await service.from('oauth_authorization_codes').insert({
    code_hash: hashToken(raw),
    client_id: clientId,
    user_id: userId,
    redirect_uri: redirectUri,
    scopes,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    expires_at: iso(CODE_TTL_MS),
  })
  return error ? null : raw
}

/** Issue a fresh access + refresh token pair for (client, user, scopes). */
export async function issueTokens(service, { clientId, userId, scopes }) {
  const access = gen('kref_at_')
  const refresh = gen('kref_rt_')
  await service.from('oauth_access_tokens').insert({
    token_hash: hashToken(access),
    client_id: clientId,
    user_id: userId,
    scopes,
    expires_at: iso(ACCESS_TTL_MS),
  })
  await service.from('oauth_refresh_tokens').insert({
    token_hash: hashToken(refresh),
    client_id: clientId,
    user_id: userId,
    scopes,
    expires_at: iso(REFRESH_TTL_MS),
  })
  return {
    access_token: access,
    refresh_token: refresh,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_MS / 1000,
    scope: scopes.join(' '),
  }
}

/** Exchange an auth code for tokens: validates PKCE, client, redirect, expiry, single-use. */
export async function exchangeAuthorizationCode(service, { code, clientId, redirectUri, verifier }) {
  const { data: row } = await service
    .from('oauth_authorization_codes')
    .select('*')
    .eq('code_hash', hashToken(code))
    .maybeSingle()
  if (!row || row.consumed_at || expired(row.expires_at)) return { error: 'invalid_grant' }
  if (row.client_id !== clientId || row.redirect_uri !== redirectUri) return { error: 'invalid_grant' }
  if (!pkceMatches(verifier, row.code_challenge, row.code_challenge_method)) {
    return { error: 'invalid_grant' }
  }
  // Single-use: consume before issuing tokens.
  await service
    .from('oauth_authorization_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('code_hash', row.code_hash)
  return { tokens: await issueTokens(service, { clientId, userId: row.user_id, scopes: row.scopes }) }
}

/** Refresh-token grant with rotation: the presented refresh token is revoked, a new pair issued. */
export async function rotateRefreshToken(service, { refreshToken, clientId }) {
  const { data: row } = await service
    .from('oauth_refresh_tokens')
    .select('*')
    .eq('token_hash', hashToken(refreshToken))
    .maybeSingle()
  if (!row || row.revoked_at || expired(row.expires_at)) return { error: 'invalid_grant' }
  if (row.client_id !== clientId) return { error: 'invalid_grant' }
  await service
    .from('oauth_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', row.token_hash)
  return { tokens: await issueTokens(service, { clientId, userId: row.user_id, scopes: row.scopes }) }
}

/** Resolve an OAuth access token (`kref_at_…`) to its owner + scopes, or null. */
export async function resolveAccessToken(service, raw) {
  if (!raw || !raw.startsWith('kref_at_')) return null
  const { data } = await service
    .from('oauth_access_tokens')
    .select('user_id, scopes, client_id, expires_at, revoked_at')
    .eq('token_hash', hashToken(raw))
    .maybeSingle()
  if (!data || data.revoked_at || expired(data.expires_at)) return null
  return { userId: data.user_id, scopes: data.scopes, clientId: data.client_id }
}
