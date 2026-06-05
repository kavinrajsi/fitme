/**
 * Gamification metrics derived from a user's daily step rows + their goal:
 * today's progress, current/best goal streaks, and earned achievements.
 *
 * `rows` is an array of { date: 'YYYY-MM-DD', steps } (IST civil dates, any order).
 */

import { dkey, addDays } from '@/lib/date-utils'

const ACHIEVEMENTS = [
  { id: 'first', name: 'First Steps', icon: '👟', test: (stats) => stats.total > 0 },
  { id: '10k', name: '10k Day', icon: '⚡', test: (stats) => stats.bestDay >= 10000 },
  { id: '15k', name: '15k Day', icon: '🚀', test: (stats) => stats.bestDay >= 15000 },
  { id: 'goal', name: 'Goal Hit', icon: '🎯', test: (stats) => stats.goalDays >= 1 },
  { id: 'streak7', name: '7-Day Streak', icon: '🔥', test: (stats) => stats.bestStreak >= 7 },
  { id: 'streak30', name: '30-Day Streak', icon: '🏆', test: (stats) => stats.bestStreak >= 30 },
  { id: 'week100k', name: '100k Week', icon: '📅', test: (stats) => stats.bestWeek >= 100000 },
  { id: 'half', name: '500k Club', icon: '🥈', test: (stats) => stats.total >= 500000 },
  { id: 'million', name: 'Million Steps', icon: '🥇', test: (stats) => stats.total >= 1000000 },
]

export function computeGamification(rows, goal = 10000) {
  const byDate = {}
  for (const row of rows ?? []) byDate[row.date] = row.steps ?? 0

  const todayKey = dkey(0)
  const today = byDate[todayKey] ?? 0
  const pct = goal ? Math.min(today / goal, 1) : 0

  const dateKeys = Object.keys(byDate)
  let total = 0
  let bestDay = 0
  let goalDays = 0
  for (const dateKey of dateKeys) {
    const steps = byDate[dateKey]
    total += steps
    if (steps > bestDay) bestDay = steps
    if (steps >= goal) goalDays++
  }

  // Current streak: consecutive goal-met days ending today (or yesterday if today
  // isn't done yet, so an in-progress day doesn't break the streak).
  let currentStreak = 0
  let startOffset = today >= goal ? 0 : 1
  for (let i = startOffset; ; i++) {
    const dateKey = dkey(i)
    if ((byDate[dateKey] ?? 0) >= goal) currentStreak++
    else break
  }

  // Best streak + best 7-day rolling total, walking the calendar from first day.
  let bestStreak = 0
  let bestWeek = 0
  if (dateKeys.length) {
    const start = dateKeys.reduce((earliest, candidate) => (earliest < candidate ? earliest : candidate))
    let streakRun = 0
    const window = []
    let windowSum = 0
    for (let dateKey = start; dateKey <= todayKey; dateKey = addDays(dateKey, 1)) {
      const steps = byDate[dateKey] ?? 0
      streakRun = steps >= goal ? streakRun + 1 : 0
      if (streakRun > bestStreak) bestStreak = streakRun
      window.push(steps)
      windowSum += steps
      if (window.length > 7) windowSum -= window.shift()
      if (windowSum > bestWeek) bestWeek = windowSum
    }
  }

  const stats = { today, goal, pct, total, bestDay, goalDays, currentStreak, bestStreak, bestWeek }
  const achievements = ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    name: achievement.name,
    icon: achievement.icon,
    earned: achievement.test(stats),
  }))

  return { ...stats, achievements }
}
