import { describe, it, expect } from 'vitest'
import { computeGamification } from './gamification'
import { dkey } from './date-utils'

const earned = (game, id) => game.achievements.find((a) => a.id === id)?.earned

describe('computeGamification', () => {
  it('aggregates totals, best day, goal days', () => {
    const rows = [
      { date: dkey(0), steps: 12000 },
      { date: dkey(1), steps: 11000 },
      { date: dkey(2), steps: 15000 },
      { date: dkey(4), steps: 20000 }, // gap at dkey(3)
    ]
    const game = computeGamification(rows, 10000)
    expect(game.today).toBe(12000)
    expect(game.total).toBe(58000)
    expect(game.bestDay).toBe(20000)
    expect(game.goalDays).toBe(4)
    expect(game.pct).toBe(1) // capped at 1
  })

  it('counts the current streak ending today and stops at a gap', () => {
    const rows = [
      { date: dkey(0), steps: 12000 },
      { date: dkey(1), steps: 11000 },
      { date: dkey(2), steps: 15000 },
      { date: dkey(4), steps: 20000 },
    ]
    const game = computeGamification(rows, 10000)
    expect(game.currentStreak).toBe(3)
    expect(game.bestStreak).toBe(3)
  })

  it("doesn't break the streak when today is still in progress", () => {
    const rows = [
      { date: dkey(0), steps: 4000 }, // today, under goal but in progress
      { date: dkey(1), steps: 11000 },
      { date: dkey(2), steps: 12000 },
    ]
    const game = computeGamification(rows, 10000)
    expect(game.currentStreak).toBe(2)
  })

  it('unlocks the right achievements', () => {
    const game = computeGamification([{ date: dkey(0), steps: 16000 }], 10000)
    expect(earned(game, 'first')).toBe(true)
    expect(earned(game, '10k')).toBe(true)
    expect(earned(game, '15k')).toBe(true)
    expect(earned(game, 'streak7')).toBe(false)
  })

  it('handles empty input', () => {
    const game = computeGamification([], 10000)
    expect(game.total).toBe(0)
    expect(game.currentStreak).toBe(0)
    expect(earned(game, 'first')).toBe(false)
  })
})
