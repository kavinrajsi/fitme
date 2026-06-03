/**
 * Google Health API client — replaces google-fit.js.
 *
 * Base URL: https://health.googleapis.com/v4/users/me/dataTypes
 * Auth:     Bearer token from Google OAuth (googlehealth.* scopes)
 *
 * Two request patterns:
 * - dailyRollUp  (POST) — daily aggregates for numeric metrics (steps, calories, distance, HR, weight)
 * - listPoints   (GET)  — individual records for sessions (sleep, exercise)
 *
 * Weight comes back in grams → divide by 1000 for kg.
 * Height comes back in mm    → divide by 10 for cm.
 *
 * NOTE: This API originates from the Fitbit platform. Users without a
 * Fitbit / Pixel Watch may return empty data until Google fully migrates
 * Health Connect data into this API.
 */

const HEALTH_API = 'https://health.googleapis.com/v4/users/me/dataTypes'

// Server runs UTC; shift by IST offset so UTC date components reflect the IST calendar date.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function isoDate(offsetDays = 0) {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  if (offsetDays) ist.setUTCDate(ist.getUTCDate() + offsetDays)
  return ist.toISOString().slice(0, 10)
}

// RollupDataPoint.startTime can be a civil-time object { year, month, day }
// or an ISO date string depending on the request type.
function dateFromPoint(pt) {
  const t = pt?.startTime
  if (!t) return null
  if (typeof t === 'string') return t.slice(0, 10)
  if (t.year != null) {
    return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
  }
  return null
}

async function dailyRollUp(token, dataType, startDate, endDate) {
  const res = await fetch(`${HEALTH_API}/${dataType}/dataPoints:dailyRollUp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      range: { startTime: startDate, endTime: endDate },
      windowSizeDays: 1,
    }),
    next: { revalidate: 300 },
  })
  if (!res.ok) return null
  return res.json()
}

async function listPoints(token, dataType, filter) {
  const params = new URLSearchParams({ pageSize: '25' })
  if (filter) params.set('filter', filter)
  const res = await fetch(`${HEALTH_API}/${dataType}/dataPoints?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function getHealthSummary(token) {
  const today = isoDate(0)
  const tomorrow = isoDate(1)

  const [stepsData, calsData, distData] = await Promise.all([
    dailyRollUp(token, 'steps', today, tomorrow),
    dailyRollUp(token, 'active-energy-burned', today, tomorrow),
    dailyRollUp(token, 'distance', today, tomorrow),
  ])

  const stepsVal = stepsData?.rollupDataPoints?.[0]?.value?.stepsRollupValue
  const calsVal  = calsData?.rollupDataPoints?.[0]?.value?.activeEnergyBurnedRollupValue
  const distVal  = distData?.rollupDataPoints?.[0]?.value?.distanceRollupValue

  return {
    stepsToday:         Number(stepsVal?.steps ?? 0),
    caloriesToday:      Math.round(calsVal?.activeEnergyBurnedKcal ?? 0),
    activeMinutesToday: 0, // active-zone-minutes is Fitbit-specific; returns 0 for other devices
    distanceKm:         distVal ? Math.round((distVal.distanceMeters ?? 0) / 10) / 100 : 0,
  }
}

export async function getDailySteps(token) {
  const start    = isoDate(-6)
  const tomorrow = isoDate(1)

  const [stepsData, calsData, distData] = await Promise.all([
    dailyRollUp(token, 'steps', start, tomorrow),
    dailyRollUp(token, 'active-energy-burned', start, tomorrow),
    dailyRollUp(token, 'distance', start, tomorrow),
  ])

  const calsByDate = {}
  for (const pt of calsData?.rollupDataPoints ?? []) {
    const d = dateFromPoint(pt)
    if (d) calsByDate[d] = Math.round(pt.value?.activeEnergyBurnedRollupValue?.activeEnergyBurnedKcal ?? 0)
  }

  const distByDate = {}
  for (const pt of distData?.rollupDataPoints ?? []) {
    const d = dateFromPoint(pt)
    if (d) distByDate[d] = Math.round((pt.value?.distanceRollupValue?.distanceMeters ?? 0) / 10) / 100
  }

  return (stepsData?.rollupDataPoints ?? []).map((pt) => {
    const d = dateFromPoint(pt)
    return {
      date:         d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '',
      isoDate:      d,
      steps:        Number(pt.value?.stepsRollupValue?.steps ?? 0),
      calories:     calsByDate[d] ?? 0,
      activeMinutes: 0,
      distanceKm:   distByDate[d] ?? 0,
    }
  })
}

export async function getBodyMetrics(token) {
  const start    = isoDate(-365)
  const tomorrow = isoDate(1)

  const [weightData, heightData] = await Promise.all([
    dailyRollUp(token, 'weight', start, tomorrow),
    dailyRollUp(token, 'height', start, tomorrow),
  ])

  // Most recent non-null reading (rollup returns oldest-first)
  const weightPts = weightData?.rollupDataPoints ?? []
  const heightPts = heightData?.rollupDataPoints ?? []

  const latestWeightG  = [...weightPts].reverse().find(pt => pt.value?.weightRollupValue?.averageWeightGrams != null)?.value?.weightRollupValue?.averageWeightGrams
  const latestHeightMm = [...heightPts].reverse().find(pt => pt.value?.heightRollupValue?.averageHeightMillimeters != null)?.value?.heightRollupValue?.averageHeightMillimeters

  return {
    weightKg: latestWeightG  != null ? Math.round(latestWeightG  / 100) / 10 : null, // grams → kg (1 dp)
    heightCm: latestHeightMm != null ? Math.round(latestHeightMm / 10)       : null, // mm → cm
  }
}

// Exercise type strings used by the Google Health API
const EXERCISE_NAMES = {
  WALKING: 'Walking', RUNNING: 'Running', CYCLING: 'Biking',
  SWIMMING: 'Swimming', STRENGTH_TRAINING: 'Strength training',
  YOGA: 'Yoga', HIKING: 'Hiking', ELLIPTICAL: 'Elliptical',
  STAIR_CLIMBING: 'Stair climbing', ROWING: 'Rowing',
  SKIING: 'Skiing', SNOWBOARDING: 'Snowboarding',
  SOCCER: 'Soccer', TENNIS: 'Tennis', DANCING: 'Dancing',
  MARTIAL_ARTS: 'Martial arts', PILATES: 'Pilates',
  BOXING: 'Boxing', JUMP_ROPE: 'Jump rope',
}

const EXERCISE_ICONS = {
  WALKING: 'directions_walk', RUNNING: 'directions_run',
  CYCLING: 'directions_bike', SWIMMING: 'pool',
  STRENGTH_TRAINING: 'fitness_center', YOGA: 'self_improvement',
  HIKING: 'hiking', ELLIPTICAL: 'directions_run',
  STAIR_CLIMBING: 'stairs', ROWING: 'rowing',
  SKIING: 'downhill_skiing', SNOWBOARDING: 'snowboarding',
  SOCCER: 'sports_soccer', TENNIS: 'sports_tennis',
  DANCING: 'music_note', MARTIAL_ARTS: 'sports_martial_arts',
  PILATES: 'self_improvement', BOXING: 'sports_mma',
  JUMP_ROPE: 'fitness_center',
}

export async function getActivitySessions(token, days = 7) {
  const startDate = isoDate(-days)
  const data = await listPoints(
    token,
    'exercise',
    `exercise.interval.civil_start_time >= "${startDate}"`
  )

  return (data?.dataPoints ?? [])
    .map((pt) => {
      const ex = pt.exerciseDataPoint
      if (!ex?.interval) return null

      const startMs   = new Date(ex.interval.startTime ?? '').getTime()
      const endMs     = new Date(ex.interval.endTime ?? '').getTime()
      const type      = ex.exerciseType ?? ex.type ?? 'UNKNOWN'

      if (!startMs || !endMs) return null

      return {
        id:           `${ex.interval.startTime}-${type}`,
        name:         ex.name || EXERCISE_NAMES[type] || 'Activity',
        icon:         EXERCISE_ICONS[type] || 'directions_run',
        activityType: type,
        startMs,
        endMs,
        durationMin:  Math.round((endMs - startMs) / 60000),
        date:         new Date(startMs).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        steps:        Number(ex.steps ?? 0),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.startMs - a.startMs)
}

export async function getSleepData(token) {
  const yesterday = isoDate(-1)
  const data = await listPoints(
    token,
    'sleep',
    `sleep.interval.civil_start_time >= "${yesterday}"`
  )

  let totalMs = 0
  for (const pt of data?.dataPoints ?? []) {
    const sleep = pt.sleepDataPoint
    if (!sleep?.interval) continue
    const start = new Date(sleep.interval.startTime ?? '')
    const end   = new Date(sleep.interval.endTime ?? '')
    if (!isNaN(start) && !isNaN(end) && end > start) {
      totalMs += end - start
    }
  }

  if (!totalMs) return null
  const hours = Math.floor(totalMs / 3600000)
  const mins  = Math.floor((totalMs % 3600000) / 60000)
  return { display: `${hours}h ${mins}m`, minutes: Math.round(totalMs / 60000) }
}
