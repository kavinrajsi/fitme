/**
 * IST (UTC+5:30) date helpers. The server runs UTC; readings are attributed to the
 * IST calendar date they were recorded against. Centralized here so the dashboard,
 * leaderboard, gamification, and Google Health client all agree.
 */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

// YYYY-MM-DD for today shifted by offsetDays (negative = past).
export function isoDate(offsetDays = 0) {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  if (offsetDays) ist.setUTCDate(ist.getUTCDate() + offsetDays)
  return ist.toISOString().slice(0, 10)
}

// YYYY-MM-DD for `daysAgo` days before today (IST). dkey(0) = today.
export function dkey(daysAgo = 0) {
  return isoDate(-daysAgo)
}

// CivilDateTime object for a YYYY-MM-DD (Google Health dailyRollUp range).
export function civil(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    date: { year, month, day },
    time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
  }
}

// Add n days to a YYYY-MM-DD string (UTC-safe).
export function addDays(dateStr, n) {
  const date = new Date(dateStr + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + n)
  return date.toISOString().slice(0, 10)
}

// YYYY-MM-DD from a Google Health civil { year, month, day }, guarding bogus years.
export function civilKey(date) {
  return date?.year && Number(date.year) >= 2000
    ? `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
    : null
}

// YYYY-MM-DD of the first day of the current IST calendar month.
export function istMonthStart() {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-01`
}
