import { describe, it, expect } from 'vitest'
import { enforceRateLimit } from './rate-limit'

// Minimal service stub whose rpc returns a count (or an error).
const svc = (countOrError) => ({
  rpc: async () =>
    countOrError instanceof Error
      ? { data: null, error: countOrError }
      : { data: countOrError, error: null },
})

describe('enforceRateLimit', () => {
  it('allows when under the limit and reports remaining', async () => {
    const r = await enforceRateLimit(svc(5), 'k', { limit: 10, windowSeconds: 60 })
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(5)
  })

  it('blocks once the count exceeds the limit', async () => {
    const r = await enforceRateLimit(svc(11), 'k', { limit: 10, windowSeconds: 60 })
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('fails open when the RPC errors', async () => {
    const r = await enforceRateLimit(svc(new Error('db down')), 'k', { limit: 10, windowSeconds: 60 })
    expect(r.allowed).toBe(true)
  })
})
