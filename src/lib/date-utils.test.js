import { describe, it, expect } from 'vitest'
import { isoDate, dkey, civil, addDays, civilKey, istMonthStart } from './date-utils'

describe('date-utils', () => {
  it('dkey(daysAgo) equals isoDate(-daysAgo)', () => {
    expect(dkey(0)).toBe(isoDate(0))
    expect(dkey(7)).toBe(isoDate(-7))
  })

  it('dkey produces descending, valid YYYY-MM-DD strings', () => {
    expect(dkey(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(dkey(1) < dkey(0)).toBe(true)
  })

  it('civil() builds a CivilDateTime', () => {
    expect(civil('2026-06-05')).toEqual({
      date: { year: 2026, month: 6, day: 5 },
      time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
    })
  })

  it('addDays() crosses month and year boundaries', () => {
    expect(addDays('2026-06-05', 1)).toBe('2026-06-06')
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('civilKey() formats and guards bogus/sentinel years', () => {
    expect(civilKey({ year: 2026, month: 6, day: 5 })).toBe('2026-06-05')
    expect(civilKey({ year: 9998, month: 12, day: 31 })).toBe('9998-12-31')
    expect(civilKey({ year: 1970, month: 1, day: 1 })).toBeNull()
    expect(civilKey(undefined)).toBeNull()
  })

  it('istMonthStart() returns the 1st of a month', () => {
    expect(istMonthStart()).toMatch(/^\d{4}-\d{2}-01$/)
  })
})
