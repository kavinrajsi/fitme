import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock every dep so the auth helper runs without a real client / env.
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({}) }))
vi.mock('@/lib/api-tokens', () => ({ resolveToken: vi.fn() }))
vi.mock('@/lib/oauth', () => ({ resolveAccessToken: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  enforceRateLimit: vi.fn(async () => ({ allowed: true, limit: 120, remaining: 119, reset: 0 })),
}))

import { authenticateApiRequest } from '@/lib/api-auth'
import { resolveToken } from '@/lib/api-tokens'
import { resolveAccessToken } from '@/lib/oauth'
import { enforceRateLimit } from '@/lib/rate-limit'

function req(authHeader) {
  return new Request('https://x/api/v1/me', authHeader ? { headers: { authorization: authHeader } } : {})
}

describe('authenticateApiRequest', () => {
  beforeEach(() => {
    resolveToken.mockReset()
    resolveAccessToken.mockReset()
    enforceRateLimit.mockReset()
    enforceRateLimit.mockResolvedValue({ allowed: true, limit: 120, remaining: 119, reset: 0 })
  })

  it('401 when no Bearer token', async () => {
    const r = await authenticateApiRequest(req())
    expect(r).toBeInstanceOf(Response)
    expect(r.status).toBe(401)
  })

  it('401 when a personal token is invalid', async () => {
    resolveToken.mockResolvedValue(null)
    expect((await authenticateApiRequest(req('Bearer kref_bad'))).status).toBe(401)
  })

  it('returns { userId, scopes } for a valid personal token', async () => {
    resolveToken.mockResolvedValue({ userId: 'u1', scopes: ['read'] })
    const r = await authenticateApiRequest(req('Bearer kref_ok'), { scope: 'read' })
    expect(r).toEqual({ userId: 'u1', scopes: ['read'] })
  })

  it('403 when the required scope is missing', async () => {
    resolveToken.mockResolvedValue({ userId: 'u1', scopes: ['read'] })
    expect((await authenticateApiRequest(req('Bearer kref_ok'), { scope: 'write' })).status).toBe(403)
  })

  it('routes kref_at_ tokens to the OAuth resolver', async () => {
    resolveAccessToken.mockResolvedValue({ userId: 'u2', scopes: ['read', 'write'], clientId: 'c1' })
    const r = await authenticateApiRequest(req('Bearer kref_at_xyz'), { scope: 'write' })
    expect(resolveAccessToken).toHaveBeenCalled()
    expect(resolveToken).not.toHaveBeenCalled()
    expect(r.userId).toBe('u2')
  })

  it('429 when the rate limit is exceeded', async () => {
    resolveToken.mockResolvedValue({ userId: 'u1', scopes: ['read'] })
    enforceRateLimit.mockResolvedValue({ allowed: false, limit: 120, remaining: 0, reset: 0 })
    const r = await authenticateApiRequest(req('Bearer kref_ok'), { scope: 'read' })
    expect(r).toBeInstanceOf(Response)
    expect(r.status).toBe(429)
  })
})
