import { describe, it, expect } from 'vitest'
import { getStepStats, getLeaderboard } from './fitness-data'
import { dkey } from './date-utils'

// A chainable Supabase stub: every builder method returns itself; awaiting it (or
// calling .rpc) resolves to { data: rows }. Enough for the single-query accessors.
function fakeService(rows) {
  const b = {
    from: () => b,
    select: () => b,
    eq: () => b,
    gte: () => b,
    lte: () => b,
    order: () => b,
    limit: () => b,
    maybeSingle: () => Promise.resolve({ data: null }),
    rpc: () => Promise.resolve({ data: rows }),
    then: (resolve, reject) => Promise.resolve({ data: rows }).then(resolve, reject),
  }
  return b
}

describe('getStepStats', () => {
  it('computes today/yesterday/7d/30d windows from daily rows', async () => {
    const rows = [
      { date: dkey(0), steps: 1000 },
      { date: dkey(1), steps: 2000 },
      { date: dkey(7), steps: 500 },
    ]
    const stats = await getStepStats(fakeService(rows), 'u1')
    expect(stats.today).toBe(1000)
    expect(stats.yesterday).toBe(2000)
    expect(stats.last7Total).toBe(3000) // dkey0..dkey6 → 1000 + 2000
    expect(stats.last7Avg).toBe(Math.round(3000 / 7))
    expect(stats.prev7Total).toBe(500) // dkey7..dkey13 → 500
    expect(stats.last30Avg).toBe(Math.round(3500 / 30))
  })
})

describe('getLeaderboard', () => {
  it('ranks rows, flags the caller, and defaults to 7d', async () => {
    const rows = [
      { id: 'a', full_name: 'A', total_steps: 100 },
      { id: 'u1', full_name: 'Me', total_steps: 50 },
    ]
    const res = await getLeaderboard(fakeService(rows), 'u1', {})
    expect(res.period).toBe('7d')
    expect(res.ranking[0]).toEqual({ rank: 1, name: 'A', totalSteps: 100, isYou: false })
    expect(res.ranking[1].isYou).toBe(true)
  })

  it('falls back to 7d for an unknown period', async () => {
    const res = await getLeaderboard(fakeService([]), 'u1', { period: 'bogus' })
    expect(res.period).toBe('7d')
  })
})
