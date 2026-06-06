import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the deps so the auth helper can run without a real Supabase client / env.
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({}) }))
vi.mock('@/lib/api-tokens', () => ({ resolveToken: vi.fn() }))

import { authenticateApiRequest } from '@/lib/api-auth'
import { resolveToken } from '@/lib/api-tokens'

function req(authHeader) {
  return new Request('https://x/api/v1/me', authHeader ? { headers: { authorization: authHeader } } : {})
}

describe('authenticateApiRequest', () => {
  beforeEach(() => resolveToken.mockReset())

  it('401 when no Bearer token', async () => {
    const r = await authenticateApiRequest(req())
    expect(r).toBeInstanceOf(Response)
    expect(r.status).toBe(401)
  })

  it('401 when the token is invalid/revoked', async () => {
    resolveToken.mockResolvedValue(null)
    const r = await authenticateApiRequest(req('Bearer kref_bad'))
    expect(r.status).toBe(401)
  })

  it('returns { userId, scopes } for a valid token', async () => {
    resolveToken.mockResolvedValue({ userId: 'u1', scopes: ['read'] })
    const r = await authenticateApiRequest(req('Bearer kref_ok'), { scope: 'read' })
    expect(r).toEqual({ userId: 'u1', scopes: ['read'] })
  })

  it('403 when the required scope is missing', async () => {
    resolveToken.mockResolvedValue({ userId: 'u1', scopes: ['read'] })
    const r = await authenticateApiRequest(req('Bearer kref_ok'), { scope: 'write' })
    expect(r).toBeInstanceOf(Response)
    expect(r.status).toBe(403)
  })
})
