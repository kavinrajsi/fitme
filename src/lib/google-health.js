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

// GET list of individual data points for a data type (used where dailyRollUp is
// unsupported, e.g. height).
async function listPoints(token, dataType, pageSize = 50) {
  const res = await fetch(`${HEALTH_API}/${dataType}/dataPoints?pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

/**
 * Latest height (cm) and weight (kg) from the Google Health API, or null per
 * metric when there's no reading. Verified field shapes:
 * - weight: dailyRollUp (capped at 90 days by the API) → weight.weightGramsAvg (grams).
 * - height: does NOT support dailyRollUp → list dataPoints → height.heightMillimeters.
 */
export async function getBodyMetrics(token) {
  const [weightData, heightData] = await Promise.all([
    dailyRollUp(token, 'weight', isoDate(-89), isoDate(1)),
    listPoints(token, 'height'),
  ])

  // Weight: most recent daily-average reading (grams → kg).
  let latestWeightG = null
  let latestWeightKey = ''
  for (const pt of weightData?.rollupDataPoints ?? []) {
    const g = pt.weight?.weightGramsAvg
    const key = pointDate(pt) ?? ''
    if (g != null && key >= latestWeightKey) {
      latestWeightG = g
      latestWeightKey = key
    }
  }

  // Height: most recent data point by sample time (mm → cm).
  let latestHeightMm = null
  let latestHeightTime = ''
  for (const pt of heightData?.dataPoints ?? []) {
    const mm = pt.height?.heightMillimeters
    const t = pt.height?.sampleTime?.physicalTime ?? ''
    if (mm != null && t >= latestHeightTime) {
      latestHeightMm = Number(mm)
      latestHeightTime = t
    }
  }

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

/**
 * The user's stable Google Health id (healthUserId) from GET /v4/users/me/identity,
 * used to map inbound webhook notifications back to our user. Returns null on failure.
 */
export async function getHealthUserId(token) {
  const res = await fetch('https://health.googleapis.com/v4/users/me/identity', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.healthUserId ?? null
}

// Extract a YYYY-MM-DD key from a rollup point's civilStartTime ({date}) or
// startTime (string), depending on which the API returns.
function pointDate(pt) {
  const c = pt?.civilStartTime?.date ?? pt?.civilStartTime
  if (c?.year != null) {
    return `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`
  }
  if (typeof pt?.startTime === 'string') return pt.startTime.slice(0, 10)
  return null
}

/**
 * Daily step counts for the last `days` days from the Google Health API.
 * Requires the googlehealth.activity_and_fitness.readonly scope.
 *
 * Returns a newest-first series with missing days filled as 0, plus total /
 * average / max (max is used by the UI to scale the bars). Returns null when the
 * request fails (e.g. 403 because the health token lacks the activity scope), so
 * the page can prompt a reconnect.
 */
export async function getDailySteps(token, days = 90) {
  const start = isoDate(-(days - 1))
  const tomorrow = isoDate(1)

  const data = await dailyRollUp(token, 'steps', start, tomorrow)
  if (!data) return null

  // Map any returned rollups by date. The steps rollup value is { steps: { countSum } }.
  const byDate = {}
  for (const pt of data.rollupDataPoints ?? []) {
    const key = pointDate(pt)
    if (key) byDate[key] = Number(pt.steps?.countSum ?? 0)
  }

  // Build the full series, newest day first.
  const series = []
  let total = 0
  let max = 0
  for (let i = 0; i < days; i++) {
    const iso = isoDate(-i)
    const steps = byDate[iso] ?? 0
    total += steps
    if (steps > max) max = steps
    series.push({
      isoDate: iso,
      label: new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      steps,
    })
  }

  return {
    days: series,
    total,
    average: Math.round(total / days),
    max,
  }
}

/**
 * All daily metrics for the last `days` days, one object per day with data.
 * Verified field shapes (rollupDataPoints[].<dataType>.<aggregate>):
 *   steps    → steps.countSum
 *   calories → activeEnergyBurned.kcalSum (active kcal)
 *   distance → distance.millimetersSum (mm → km)
 *   heart    → heartRate.beatsPerMinuteMin (used as a resting-HR proxy; no
 *              dedicated resting-heart-rate data type exists)
 *   sleep    → sleep.interval.{startTime,endTime} from the list endpoint (sleep does
 *              not support rollup); duration is attributed to the IST wake date.
 *
 * NOTE: sleep parsing follows the documented filter members (sleep.interval.end_time);
 * it is defensive (any shape mismatch yields no sleep) and pending confirmation against
 * a real sleep record.
 */
export async function getDailyMetrics(token, days = 90) {
  const start = isoDate(-(days - 1))
  const end = isoDate(1)

  const [stepsD, calD, distD, rhrD, sleepD, hydD] = await Promise.all([
    dailyRollUp(token, 'steps', start, end),
    dailyRollUp(token, 'active-energy-burned', start, end),
    dailyRollUp(token, 'distance', start, end),
    listPoints(token, 'daily-resting-heart-rate', 200),
    listSleep(token, days),
    listPoints(token, 'hydration-log', 200),
  ])

  const byDate = {}
  const row = (k) =>
    (byDate[k] ??= {
      date: k,
      steps: 0,
      calories: 0,
      distance_km: 0,
      sleep_min: null,
      resting_hr: null,
      hydration_ml: null,
    })

  for (const pt of stepsD?.rollupDataPoints ?? []) {
    const k = pointDate(pt)
    if (k) row(k).steps = Number(pt.steps?.countSum ?? 0)
  }
  for (const pt of calD?.rollupDataPoints ?? []) {
    const k = pointDate(pt)
    if (k) row(k).calories = Math.round(Number(pt.activeEnergyBurned?.kcalSum ?? 0))
  }
  for (const pt of distD?.rollupDataPoints ?? []) {
    const k = pointDate(pt)
    if (k) row(k).distance_km = Math.round((Number(pt.distance?.millimetersSum ?? 0) / 1e6) * 100) / 100
  }
  // Resting heart rate — the dedicated daily type (real RHR, not a proxy). List only;
  // value at dailyRestingHeartRate.beatsPerMinute, keyed by its civil date.
  for (const pt of rhrD?.dataPoints ?? []) {
    const v = pt.dailyRestingHeartRate
    if (v?.beatsPerMinute == null || !v.date?.year || Number(v.date.year) < 2000) continue
    const k = `${v.date.year}-${String(v.date.month).padStart(2, '0')}-${String(v.date.day).padStart(2, '0')}`
    row(k).resting_hr = Math.round(Number(v.beatsPerMinute))
  }

  // Sleep sessions → minutes per night, keyed by the IST date the user woke up.
  for (const pt of sleepD?.dataPoints ?? []) {
    const iv = pt.sleep?.interval
    const startT = iv?.startTime ?? iv?.start_time
    const endT = iv?.endTime ?? iv?.end_time
    if (!startT || !endT) continue
    const mins = Math.round((new Date(endT).getTime() - new Date(startT).getTime()) / 60000)
    if (!(mins > 0)) continue
    const k = new Date(new Date(endT).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
    const r = row(k)
    r.sleep_min = (r.sleep_min ?? 0) + mins
  }

  // Hydration (nutrition scope) — sum logged volume per day → ml. Session type; the
  // volume/date field shape is parsed defensively, pending real-data confirmation.
  for (const pt of hydD?.dataPoints ?? []) {
    const h = pt.hydrationLog
    if (!h) continue
    const ml = Number(h.volumeMilliliters ?? h.milliliters ?? h.volume ?? 0)
    if (!(ml > 0)) continue
    const t = h.interval?.endTime ?? h.interval?.startTime ?? h.sampleTime?.physicalTime
    const k = t ? new Date(new Date(t).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10) : null
    if (!k) continue
    const r = row(k)
    r.hydration_ml = (r.hydration_ml ?? 0) + ml
  }

  return Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date))
}

// Sleep sessions for the last `days` days (sleep doesn't support dailyRollUp).
// Filters by the documented member sleep.interval.end_time.
async function listSleep(token, days) {
  const since = isoDate(-(days - 1))
  const params = new URLSearchParams({ pageSize: '200' })
  params.set('filter', `sleep.interval.end_time >= "${since}T00:00:00Z"`)
  const res = await fetch(`${HEALTH_API}/sleep/dataPoints?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}
