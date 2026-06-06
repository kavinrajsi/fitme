import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { pkceMatches, exchangeAuthorizationCode, resolveAccessToken } from './oauth'

const future = () => new Date(Date.now() + 60000).toISOString()
const past = () => new Date(Date.now() - 60000).toISOString()
const s256 = (v) => crypto.createHash('sha256').update(v).digest('base64url')

// Fake service: select→eq→maybeSingle yields a preset row per table; update/insert no-op.
function fakeService({ codeRow = null, accessRow = null } = {}) {
  return {
    from(table) {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data:
                table === 'oauth_authorization_codes'
                  ? codeRow
                  : table === 'oauth_access_tokens'
                    ? accessRow
                    : null,
            }),
          }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
        insert: async () => ({ error: null }),
      }
    },
  }
}

describe('pkceMatches', () => {
  it('verifies an S256 challenge', () => {
    const v = 'the-code-verifier-value'
    expect(pkceMatches(v, s256(v), 'S256')).toBe(true)
    expect(pkceMatches('wrong', s256(v), 'S256')).toBe(false)
  })
  it('rejects unknown methods', () => {
    expect(pkceMatches('x', 'x', 'nope')).toBe(false)
  })
})

describe('exchangeAuthorizationCode', () => {
  const verifier = 'verifier-123'
  const base = () => ({
    code_hash: 'h',
    client_id: 'c1',
    user_id: 'u1',
    redirect_uri: 'https://app/cb',
    scopes: ['read'],
    code_challenge: s256(verifier),
    code_challenge_method: 'S256',
    expires_at: future(),
    consumed_at: null,
  })
  const args = { code: 'kref_code_x', clientId: 'c1', redirectUri: 'https://app/cb', verifier }

  it('issues tokens on a valid code', async () => {
    const res = await exchangeAuthorizationCode(fakeService({ codeRow: base() }), args)
    expect(res.tokens.access_token).toMatch(/^kref_at_/)
    expect(res.tokens.refresh_token).toMatch(/^kref_rt_/)
    expect(res.tokens.scope).toBe('read')
  })
  it('rejects an expired code', async () => {
    const res = await exchangeAuthorizationCode(fakeService({ codeRow: { ...base(), expires_at: past() } }), args)
    expect(res.error).toBe('invalid_grant')
  })
  it('rejects an already-consumed code', async () => {
    const res = await exchangeAuthorizationCode(fakeService({ codeRow: { ...base(), consumed_at: future() } }), args)
    expect(res.error).toBe('invalid_grant')
  })
  it('rejects a redirect_uri mismatch', async () => {
    const res = await exchangeAuthorizationCode(fakeService({ codeRow: base() }), { ...args, redirectUri: 'https://evil/cb' })
    expect(res.error).toBe('invalid_grant')
  })
  it('rejects a bad PKCE verifier', async () => {
    const res = await exchangeAuthorizationCode(fakeService({ codeRow: base() }), { ...args, verifier: 'nope' })
    expect(res.error).toBe('invalid_grant')
  })
})

describe('resolveAccessToken', () => {
  const row = { user_id: 'u1', scopes: ['read'], client_id: 'c1', expires_at: future(), revoked_at: null }

  it('ignores non-OAuth tokens', async () => {
    expect(await resolveAccessToken(fakeService({}), 'kref_personal')).toBeNull()
  })
  it('resolves a valid access token', async () => {
    const r = await resolveAccessToken(fakeService({ accessRow: row }), 'kref_at_abc')
    expect(r).toEqual({ userId: 'u1', scopes: ['read'], clientId: 'c1' })
  })
  it('rejects an expired token', async () => {
    expect(await resolveAccessToken(fakeService({ accessRow: { ...row, expires_at: past() } }), 'kref_at_abc')).toBeNull()
  })
  it('rejects a revoked token', async () => {
    expect(await resolveAccessToken(fakeService({ accessRow: { ...row, revoked_at: past() } }), 'kref_at_abc')).toBeNull()
  })
})
