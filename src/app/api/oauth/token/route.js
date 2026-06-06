/**
 * POST /api/oauth/token — OAuth2 token endpoint.
 *
 * Grants: `authorization_code` (PKCE verifier required) and `refresh_token` (rotated
 * on use). Accepts form-encoded or JSON bodies. Public (no session); the client is
 * authenticated by client_id (+ secret for confidential clients). Returns the
 * standard `{ access_token, token_type, expires_in, refresh_token, scope }` or an
 * OAuth `{ error }` body. No CORS restriction (PKCE public clients call from browsers).
 */
import { CORS_HEADERS } from '@/lib/api-response'
import { createServiceClient } from '@/lib/supabase/service'
import {
  authenticateClient,
  exchangeAuthorizationCode,
  rotateRefreshToken,
} from '@/lib/oauth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HEADERS = { ...CORS_HEADERS, 'Cache-Control': 'no-store' }

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS })
}

// OAuth-style error body (`{ error, error_description }`).
const oauthError = (status, error, description) =>
  Response.json({ error, error_description: description }, { status, headers: HEADERS })

export async function POST(request) {
  // Token endpoints accept form-encoded bodies; also allow JSON for convenience.
  let params
  try {
    const ct = request.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const body = await request.json()
      params = (k) => body?.[k]
    } else {
      const form = await request.formData()
      params = (k) => form.get(k)
    }
  } catch {
    return oauthError(400, 'invalid_request', 'Could not parse the request body.')
  }

  const grantType = params('grant_type')
  const clientId = params('client_id')
  const clientSecret = params('client_secret')
  if (!clientId) return oauthError(400, 'invalid_request', 'client_id is required.')

  const service = createServiceClient()
  const client = await authenticateClient(service, clientId, clientSecret)
  if (!client) return oauthError(401, 'invalid_client', 'Unknown client or bad secret.')

  if (grantType === 'authorization_code') {
    const { tokens, error } = await exchangeAuthorizationCode(service, {
      code: params('code'),
      clientId,
      redirectUri: params('redirect_uri'),
      verifier: params('code_verifier'),
    })
    if (error) return oauthError(400, error, 'The authorization code is invalid or expired.')
    return Response.json(tokens, { headers: HEADERS })
  }

  if (grantType === 'refresh_token') {
    const { tokens, error } = await rotateRefreshToken(service, {
      refreshToken: params('refresh_token'),
      clientId,
    })
    if (error) return oauthError(400, error, 'The refresh token is invalid or expired.')
    return Response.json(tokens, { headers: HEADERS })
  }

  return oauthError(400, 'unsupported_grant_type', `Unsupported grant_type: ${grantType}.`)
}
