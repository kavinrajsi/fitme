/**
 * Google Health API client (web) — NOT Google Fit.
 *
 * Base URL: https://health.googleapis.com/v4/users/me
 * Auth:     Bearer token from Google OAuth (googlehealth.* scopes — restricted)
 *
 * This API is the rebuilt Fitbit Web API: height/weight come back only for users
 * with a Fitbit / Pixel Watch, otherwise the endpoints return 403 or empty data
 * (callers treat null as "no reading" and fall back to manual entry).
 *
 * Units: weight in grams → kg; height in millimetres → cm.
 */

const HEALTH_API = 'https://health.googleapis.com/v4/users/me/dataTypes'

// Server runs UTC; shift by the IST offset so the date components reflect the
// IST calendar date the readings were recorded against.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function isoDate(offsetDays = 0) {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  if (offsetDays) ist.setUTCDate(ist.getUTCDate() + offsetDays)
  return ist.toISOString().slice(0, 10)
}

// The dailyRollUp range uses CivilDateTime objects ({ date:{year,month,day},
// time:{hours,...} }) — NOT RFC3339 strings — for its closed-open interval.
function civil(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    date: { year, month, day },
    time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
  }
}

async function dailyRollUp(token, dataType, startDate, endDate) {
  const res = await fetch(`${HEALTH_API}/${dataType}/dataPoints:dailyRollUp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      range: { start: civil(startDate), end: civil(endDate) },
      windowSizeDays: 1,
    }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

/**
 * Latest height (cm) and weight (kg) over the past year, or null per metric when
 * the Google Health API has no readings for this account.
 */
export async function getBodyMetrics(token) {
  const start = isoDate(-365)
  const tomorrow = isoDate(1)

  const [weightData, heightData] = await Promise.all([
    dailyRollUp(token, 'weight', start, tomorrow),
    dailyRollUp(token, 'height', start, tomorrow),
  ])

  // Most recent non-null reading (rollup returns oldest-first).
  const weightPts = weightData?.rollupDataPoints ?? []
  const heightPts = heightData?.rollupDataPoints ?? []

  const latestWeightG = [...weightPts]
    .reverse()
    .find((pt) => pt.value?.weightRollupValue?.averageWeightGrams != null)
    ?.value?.weightRollupValue?.averageWeightGrams
  const latestHeightMm = [...heightPts]
    .reverse()
    .find((pt) => pt.value?.heightRollupValue?.averageHeightMillimeters != null)
    ?.value?.heightRollupValue?.averageHeightMillimeters

  return {
    weightKg: latestWeightG != null ? Math.round(latestWeightG / 100) / 10 : null,
    heightCm: latestHeightMm != null ? Math.round(latestHeightMm / 10) : null,
  }
}

/**
 * Google Health profile — only `age` is broadly useful here. Returns null on 403
 * (non-Fitbit accounts). GET /v4/users/me/profile (scope googlehealth.profile.readonly).
 */
export async function getHealthProfile(token) {
  const res = await fetch('https://health.googleapis.com/v4/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  return { age: data.age ?? null }
}
