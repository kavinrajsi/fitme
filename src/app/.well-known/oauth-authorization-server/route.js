/**
 * GET /.well-known/oauth-authorization-server — RFC 8414 discovery metadata so
 * OAuth clients can auto-configure. The issuer/endpoints are derived from the
 * request host so they're correct in every environment.
 */
import { CORS_HEADERS } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET(request) {
  const host = request.headers.get('host')
  const proto = host?.startsWith('localhost') || host?.startsWith('127.') ? 'http' : 'https'
  const issuer = host ? `${proto}://${host}` : ''

  return Response.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/api/oauth/token`,
      scopes_supported: ['read', 'write'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    },
    { headers: CORS_HEADERS }
  )
}
