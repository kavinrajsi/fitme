/**
 * Unified health data client — calls Google Health API and Google Fit API in parallel,
 * then picks whichever returned more data. This lets Fitbit/Pixel Watch users benefit
 * from the Health API while regular Android users fall back to Google Fit seamlessly.
 *
 * Both sets of OAuth scopes (googlehealth.* and fitness.*) are requested at sign-in so
 * the token works for both APIs. If a user only has Fit scopes (pre-migration), the
 * Health API calls return null/empty and the wrapper transparently uses Fit data.
 */
import * as healthApi from '@/lib/google-health'
import * as fitApi from '@/lib/google-fit'

async function both(healthPromise, fitPromise, pick) {
  const [hr, fr] = await Promise.allSettled([healthPromise, fitPromise])
  const h = hr.status === 'fulfilled' ? hr.value : null
  const f = fr.status === 'fulfilled' ? fr.value : null
  return pick(h, f)
}

export function getHealthSummary(token) {
  return both(
    healthApi.getHealthSummary(token),
    fitApi.getHealthSummary(token),
    (h, f) => {
      if (h && f) return h.stepsToday >= f.stepsToday ? h : f
      return h ?? f ?? { stepsToday: 0, caloriesToday: 0, activeMinutesToday: 0, distanceKm: 0 }
    }
  )
}

export function getDailySteps(token) {
  return both(
    healthApi.getDailySteps(token),
    fitApi.getDailySteps(token),
    (h, f) => {
      const hs = (h ?? []).reduce((s, d) => s + (d.steps || 0), 0)
      const fs = (f ?? []).reduce((s, d) => s + (d.steps || 0), 0)
      return hs >= fs ? (h ?? []) : (f ?? [])
    }
  )
}

export function getBodyMetrics(token) {
  return both(
    healthApi.getBodyMetrics(token),
    fitApi.getBodyMetrics(token),
    (h, f) => ({
      weightKg: h?.weightKg ?? f?.weightKg ?? null,
      heightCm: h?.heightCm ?? f?.heightCm ?? null,
    })
  )
}

export function getSleepData(token) {
  return both(
    healthApi.getSleepData(token),
    fitApi.getSleepData(token),
    (h, f) => {
      if (h && f) return h.minutes >= f.minutes ? h : f
      return h ?? f ?? null
    }
  )
}

export function getActivitySessions(token, days = 7) {
  return both(
    healthApi.getActivitySessions(token, days),
    fitApi.getActivitySessions(token, days),
    (h, f) => {
      if (h?.length > 0) return h
      return f ?? []
    }
  )
}

export function getHeartRateWeek(token) {
  return both(
    healthApi.getHeartRateWeek(token),
    fitApi.getHeartRateWeek(token),
    (h, f) => {
      // Merge both sources; Health API takes precedence per date
      const merged = { ...(f ?? {}) }
      for (const [date, bpm] of Object.entries(h ?? {})) {
        merged[date] = bpm
      }
      return merged
    }
  )
}

// Health API has no intra-day granularity — delegate directly to Fit.
export function getActivityTimeline(token) {
  return fitApi.getActivityTimeline(token)
}

export function getStepSourceData(token, isoDate) {
  return fitApi.getStepSourceData(token, isoDate)
}

export function getDayStepBuckets(token, isoDate) {
  return fitApi.getDayStepBuckets(token, isoDate)
}

// Returns { [isoDate]: { display, minutes } } for the past 7 nights.
// Per date: prefer whichever source reports more sleep.
export function getSleepWeek(token) {
  return both(
    healthApi.getSleepWeek(token),
    fitApi.getSleepWeek(token),
    (h, f) => {
      const merged = { ...(f ?? {}) }
      for (const [date, data] of Object.entries(h ?? {})) {
        if (!merged[date] || data.minutes >= merged[date].minutes) merged[date] = data
      }
      return merged
    }
  )
}
