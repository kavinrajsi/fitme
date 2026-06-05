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
  const response = await fetch(`${HEALTH_API}/${dataType}/dataPoints:dailyRollUp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      range: { start: civil(startDate), end: civil(endDate) },
      windowSizeDays: 1,
    }),
    cache: 'no-store',
  })
  if (!response.ok) return null
  return response.json()
}

// GET list of individual data points for a data type (used where dailyRollUp is
// unsupported, e.g. height).
async function listPoints(token, dataType, pageSize = 50) {
  const response = await fetch(`${HEALTH_API}/${dataType}/dataPoints?pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  return response.json()
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
  for (const point of weightData?.rollupDataPoints ?? []) {
    const weightGrams = point.weight?.weightGramsAvg
    const dateKey = pointDate(point) ?? ''
    if (weightGrams != null && dateKey >= latestWeightKey) {
      latestWeightG = weightGrams
      latestWeightKey = dateKey
    }
  }

  // Height: most recent data point by sample time (mm → cm).
  let latestHeightMm = null
  let latestHeightTime = ''
  for (const point of heightData?.dataPoints ?? []) {
    const heightMm = point.height?.heightMillimeters
    const sampleTime = point.height?.sampleTime?.physicalTime ?? ''
    if (heightMm != null && sampleTime >= latestHeightTime) {
      latestHeightMm = Number(heightMm)
      latestHeightTime = sampleTime
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
  const response = await fetch('https://health.googleapis.com/v4/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  const data = await response.json()
  return { age: data.age ?? null }
}

/**
 * The user's stable Google Health id (healthUserId) from GET /v4/users/me/identity,
 * used to map inbound webhook notifications back to our user. Returns null on failure.
 */
export async function getHealthUserId(token) {
  const response = await fetch('https://health.googleapis.com/v4/users/me/identity', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  const data = await response.json()
  return data.healthUserId ?? null
}

// Extract a YYYY-MM-DD key from a rollup point's civilStartTime ({date}) or
// startTime (string), depending on which the API returns.
function pointDate(point) {
  const civilDate = point?.civilStartTime?.date ?? point?.civilStartTime
  if (civilDate?.year != null) {
    return `${civilDate.year}-${String(civilDate.month).padStart(2, '0')}-${String(civilDate.day).padStart(2, '0')}`
  }
  if (typeof point?.startTime === 'string') return point.startTime.slice(0, 10)
  return null
}

/**
 * Full daily step history (beyond the 90-day rollup cap) by paginating the step
 * rollup in 90-day chunks back `months` months. Returns [{ date, steps }].
 */
export async function getStepHistory(token, months = 24) {
  const totalDays = months * 30
  const stepsByDate = {}
  for (let offsetDays = totalDays; offsetDays >= 90; offsetDays -= 90) {
    const data = await dailyRollUp(
      token,
      'steps',
      isoDate(-offsetDays),
      isoDate(-(offsetDays - 90))
    )
    for (const point of data?.rollupDataPoints ?? []) {
      const dateKey = pointDate(point)
      if (dateKey) stepsByDate[dateKey] = Number(point.steps?.countSum ?? 0)
    }
  }
  return Object.entries(stepsByDate).map(([date, steps]) => ({ date, steps }))
}

/**
 * Intraday hourly step buckets for the last `days` days, from the step LIST data
 * (steps.interval.civilStartTime + steps.count). Returns [{ day, hour, steps }].
 */
export async function getHourlySteps(token, days = 14) {
  const since = isoDate(-(days - 1))
  const params = new URLSearchParams({ pageSize: '5000' })
  params.set('filter', `steps.interval.end_time >= "${since}T00:00:00Z"`)
  let response = await fetch(`${HEALTH_API}/steps/dataPoints?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) {
    // Filter unsupported — fall back to an unfiltered page and clip client-side.
    response = await fetch(`${HEALTH_API}/steps/dataPoints?pageSize=5000`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return []
  }
  const data = await response.json()

  const buckets = {}
  for (const point of data.dataPoints ?? []) {
    const civilStart = point.steps?.interval?.civilStartTime
    const count = Number(point.steps?.count ?? 0)
    if (!civilStart?.date?.year || Number(civilStart.date.year) < 2000 || count <= 0) continue
    const day = `${civilStart.date.year}-${String(civilStart.date.month).padStart(2, '0')}-${String(civilStart.date.day).padStart(2, '0')}`
    if (day < since) continue
    const hour = civilStart.time?.hours ?? 0
    const bucketKey = `${day}|${hour}`
    buckets[bucketKey] = (buckets[bucketKey] ?? 0) + count
  }
  return Object.entries(buckets).map(([bucketKey, steps]) => {
    const [day, hour] = bucketKey.split('|')
    return { day, hour: Number(hour), steps }
  })
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
  for (const point of data.rollupDataPoints ?? []) {
    const dateKey = pointDate(point)
    if (dateKey) byDate[dateKey] = Number(point.steps?.countSum ?? 0)
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

  const [stepsD, calD, distD, rhrD, sleepD, hydD, amD, vo2D, spo2D, hrvD] = await Promise.all([
    dailyRollUp(token, 'steps', start, end),
    dailyRollUp(token, 'active-energy-burned', start, end),
    dailyRollUp(token, 'distance', start, end),
    listPoints(token, 'daily-resting-heart-rate', 200),
    listSleep(token, days),
    listPoints(token, 'hydration-log', 200),
    listPoints(token, 'active-minutes', 1000),
    listPoints(token, 'daily-vo2-max', 200),
    listPoints(token, 'daily-oxygen-saturation', 200),
    listPoints(token, 'daily-heart-rate-variability', 200),
  ])

  const byDate = {}
  const row = (dateKey) =>
    (byDate[dateKey] ??= {
      date: dateKey,
      steps: 0,
      calories: 0,
      distance_km: 0,
      sleep_min: null,
      resting_hr: null,
      hydration_ml: null,
      active_min: null,
      vo2_max: null,
      spo2: null,
      hrv_ms: null,
    })

  const civilKey = (date) =>
    date?.year && Number(date.year) >= 2000
      ? `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
      : null

  for (const point of stepsD?.rollupDataPoints ?? []) {
    const dateKey = pointDate(point)
    if (dateKey) row(dateKey).steps = Number(point.steps?.countSum ?? 0)
  }
  for (const point of calD?.rollupDataPoints ?? []) {
    const dateKey = pointDate(point)
    if (dateKey) row(dateKey).calories = Math.round(Number(point.activeEnergyBurned?.kcalSum ?? 0))
  }
  for (const point of distD?.rollupDataPoints ?? []) {
    const dateKey = pointDate(point)
    if (dateKey) row(dateKey).distance_km = Math.round((Number(point.distance?.millimetersSum ?? 0) / 1e6) * 100) / 100
  }
  // Resting heart rate — the dedicated daily type (real RHR, not a proxy). List only;
  // value at dailyRestingHeartRate.beatsPerMinute, keyed by its civil date.
  for (const point of rhrD?.dataPoints ?? []) {
    const restingHeartRate = point.dailyRestingHeartRate
    if (restingHeartRate?.beatsPerMinute == null || !restingHeartRate.date?.year || Number(restingHeartRate.date.year) < 2000) continue
    const dateKey = `${restingHeartRate.date.year}-${String(restingHeartRate.date.month).padStart(2, '0')}-${String(restingHeartRate.date.day).padStart(2, '0')}`
    row(dateKey).resting_hr = Math.round(Number(restingHeartRate.beatsPerMinute))
  }

  // Sleep sessions → minutes per night, keyed by the IST date the user woke up.
  for (const point of sleepD?.dataPoints ?? []) {
    const interval = point.sleep?.interval
    const startTime = interval?.startTime ?? interval?.start_time
    const endTime = interval?.endTime ?? interval?.end_time
    if (!startTime || !endTime) continue
    const minutes = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
    if (!(minutes > 0)) continue
    const dateKey = new Date(new Date(endTime).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
    const dayRow = row(dateKey)
    dayRow.sleep_min = (dayRow.sleep_min ?? 0) + minutes
  }

  // Hydration (nutrition scope) — sum logged volume per day → ml. Verified shape:
  // hydrationLog.amountConsumed.milliliters, keyed by the interval's civil start date.
  for (const point of hydD?.dataPoints ?? []) {
    const hydrationLog = point.hydrationLog
    const milliliters = Number(hydrationLog?.amountConsumed?.milliliters ?? 0)
    if (!(milliliters > 0)) continue
    const dateKey =
      civilKey(hydrationLog.interval?.civilStartTime?.date) ??
      (hydrationLog.interval?.startTime
        ? new Date(new Date(hydrationLog.interval.startTime).getTime() + IST_OFFSET_MS)
            .toISOString()
            .slice(0, 10)
        : null)
    if (!dateKey || dateKey < start) continue
    const dayRow = row(dateKey)
    dayRow.hydration_ml = (dayRow.hydration_ml ?? 0) + milliliters
  }

  // Active minutes — sum the per-activity-level minutes for each (civil) day.
  for (const point of amD?.dataPoints ?? []) {
    const activeMinutes = point.activeMinutes
    const dateKey = civilKey(activeMinutes?.interval?.civilStartTime?.date)
    if (!dateKey) continue
    let minutes = 0
    for (const level of activeMinutes.activeMinutesByActivityLevel ?? []) minutes += Number(level.activeMinutes ?? 0)
    if (minutes > 0) row(dateKey).active_min = (row(dateKey).active_min ?? 0) + minutes
  }

  // VO2 max — daily cardio-fitness value.
  for (const point of vo2D?.dataPoints ?? []) {
    const vo2Max = point.dailyVo2Max
    const dateKey = civilKey(vo2Max?.date)
    if (dateKey && vo2Max.vo2Max != null) row(dateKey).vo2_max = Math.round(Number(vo2Max.vo2Max) * 10) / 10
  }

  // SpO2 (defensive — no data in test account; field name unverified).
  for (const point of spo2D?.dataPoints ?? []) {
    const oxygenSaturation = point.dailyOxygenSaturation
    const dateKey = civilKey(oxygenSaturation?.date)
    const percentage = oxygenSaturation?.averagePercentage ?? oxygenSaturation?.percentage ?? oxygenSaturation?.avgPercentage
    if (dateKey && percentage != null) row(dateKey).spo2 = Math.round(Number(percentage) * 10) / 10
  }

  // HRV (defensive — no data in test account; field name unverified).
  for (const point of hrvD?.dataPoints ?? []) {
    const heartRateVariability = point.dailyHeartRateVariability
    const dateKey = civilKey(heartRateVariability?.date)
    const hrvMs = heartRateVariability?.heartRateVariabilityMillis ?? heartRateVariability?.hrvMillis ?? heartRateVariability?.millis ?? heartRateVariability?.rmssd
    if (dateKey && hrvMs != null) row(dateKey).hrv_ms = Math.round(Number(hrvMs) * 10) / 10
  }

  return Object.values(byDate).sort((rowA, rowB) => rowB.date.localeCompare(rowA.date))
}

// Sleep sessions for the last `days` days (sleep doesn't support dailyRollUp).
// Filters by the documented member sleep.interval.end_time.
async function listSleep(token, days) {
  const since = isoDate(-(days - 1))
  const params = new URLSearchParams({ pageSize: '200' })
  params.set('filter', `sleep.interval.end_time >= "${since}T00:00:00Z"`)
  const response = await fetch(`${HEALTH_API}/sleep/dataPoints?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  return response.json()
}

function titleCase(text) {
  return text
    ? text.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : text
}

/**
 * Exercise sessions (workouts) for the last `days` days from the Google Health
 * `exercise` data type. Verified fields: exercise.interval.{startTime,endTime},
 * exerciseType, displayName, activeDuration ("Ns"), metricsSummary.{caloriesKcal,
 * distanceMillimeters}. source_id is the trailing id of the dataPoint `name`.
 */
export async function getWorkouts(token, days = 90) {
  const data = await listPoints(token, 'exercise', 1000)
  if (!data) return []

  const cutoff = Date.now() - days * 86400000
  const workouts = []
  for (const point of data.dataPoints ?? []) {
    const exercise = point.exercise
    const start = exercise?.interval?.startTime
    if (!start || new Date(start).getTime() < cutoff) continue
    const id = (point.name ?? '').split('/').pop()
    if (!id) continue

    const end = exercise.interval?.endTime ?? null
    const durationSec = exercise.activeDuration
      ? parseFloat(exercise.activeDuration)
      : end
        ? (new Date(end).getTime() - new Date(start).getTime()) / 1000
        : 0
    const metricsSummary = exercise.metricsSummary ?? {}
    workouts.push({
      source_id: id,
      started_at: start,
      ended_at: end,
      type: exercise.displayName ?? titleCase(exercise.exerciseType) ?? 'Workout',
      duration_min: durationSec ? Math.round(durationSec / 60) : null,
      calories: metricsSummary.caloriesKcal != null ? Math.round(Number(metricsSummary.caloriesKcal)) : null,
      distance_km:
        metricsSummary.distanceMillimeters != null
          ? Math.round((Number(metricsSummary.distanceMillimeters) / 1e6) * 100) / 100
          : null,
    })
  }
  return workouts
}
