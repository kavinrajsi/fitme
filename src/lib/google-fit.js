/**
 * Google Fitness REST API client.
 *
 * All functions accept a Google OAuth access token stored in profiles.google_access_token.
 * Tokens expire after 1 hour — callers should check google_token_expires_at before calling.
 *
 * Two API patterns are used:
 * - `dataset:aggregate` — for delta metrics (steps, calories, heart rate, active minutes,
 *   distance). Returns bucketed aggregates over a time range.
 * - `dataSources/{id}/datasets/{startNs}-{endNs}` — for instantaneous measurements
 *   (weight, height). Timestamps are nanoseconds; BigInt is required to avoid precision
 *   loss because a 1-year range in nanoseconds exceeds Number.MAX_SAFE_INTEGER.
 *
 * `cache: 'no-store'` on all fetches ensures every call returns live data from Google
 * so the Sync button and dashboard always reflect the latest step counts.
 *
 * Activity session steps: each session triggers a separate aggregate call to get steps
 * for that session's time window. These run in parallel via Promise.all inside
 * getActivitySessions() to keep total latency low.
 */
const FITNESS_API = 'https://www.googleapis.com/fitness/v1/users/me'

// Server runs in UTC; IST is UTC+5:30. Shift Date.now() by the offset so
// getUTCFullYear/Month/Date return the IST calendar date, then subtract the
// offset again to get the correct UTC timestamp for IST midnight.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function istMidnight(daysOffset = 0) {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + daysOffset) - IST_OFFSET_MS
}

function todayRange() {
  return { startTimeMillis: istMidnight(0), endTimeMillis: Date.now() }
}

function weekRange() {
  return { startTimeMillis: istMidnight(-6), endTimeMillis: Date.now() }
}

function yesterdayRange() {
  return { startTimeMillis: istMidnight(-1), endTimeMillis: istMidnight(0) }
}

async function aggregate(token, dataTypeName, range) {
  const res = await fetch(`${FITNESS_API}/dataset:aggregate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName }],
      bucketByTime: { durationMillis: range.endTimeMillis - range.startTimeMillis },
      startTimeMillis: range.startTimeMillis,
      endTimeMillis: range.endTimeMillis,
    }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

function extractInt(data) {
  const point = data?.bucket?.[0]?.dataset?.[0]?.point?.[0]
  return point?.value?.[0]?.intVal ?? 0
}

function extractFp(data) {
  const point = data?.bucket?.[0]?.dataset?.[0]?.point?.[0]
  return Math.round(point?.value?.[0]?.fpVal ?? 0)
}

async function getLatestDataPoint(token, dataSourceId, lookbackDays = 365) {
  const endMs = Date.now()
  const startMs = endMs - lookbackDays * 24 * 60 * 60 * 1000
  const startNs = (BigInt(startMs) * 1000000n).toString()
  const endNs = (BigInt(endMs) * 1000000n).toString()

  const res = await fetch(
    `${FITNESS_API}/dataSources/${dataSourceId}/datasets/${startNs}-${endNs}?limit=1`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.point?.[0]?.value?.[0]?.fpVal ?? null
}

export async function getHealthSummary(googleAccessToken) {
  const today = todayRange()
  const week = weekRange()

  const [stepsToday, calsToday, activeData, distanceData] =
    await Promise.all([
      aggregate(googleAccessToken, 'com.google.step_count.delta', today),
      aggregate(googleAccessToken, 'com.google.calories.expended', today),
      aggregate(googleAccessToken, 'com.google.active_minutes', today),
      aggregate(googleAccessToken, 'com.google.distance.delta', today),
    ])

  const distM = distanceData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal ?? 0

  return {
    stepsToday: extractInt(stepsToday),
    caloriesToday: extractFp(calsToday),
    activeMinutesToday: extractInt(activeData),
    distanceKm: distM ? Math.round(distM / 10) / 100 : 0,
  }
}

// Returns steps in 48 half-hour IST-aligned buckets for the given IST date (YYYY-MM-DD).
export async function getDayStepBuckets(googleAccessToken, isoDate) {
  const startMs = new Date(isoDate + 'T00:00:00+05:30').getTime()
  const endMs   = startMs + 86400000

  const res = await fetch(`${FITNESS_API}/dataset:aggregate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
      bucketByTime: { durationMillis: 30 * 60 * 1000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    }),
    cache: 'no-store',
  })
  if (!res.ok) return []

  return ((await res.json()).bucket ?? []).slice(0, 48).map((bucket, i) => ({
    index: i,
    steps: bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal ?? 0,
  }))
}

// Returns raw step segments from the estimated_steps data source for the given IST date.
export async function getStepSourceData(googleAccessToken, isoDate) {
  const startMs = new Date(isoDate + 'T00:00:00+05:30').getTime()
  const endMs   = startMs + 86400000
  const startNs = (BigInt(startMs) * 1000000n).toString()
  const endNs   = (BigInt(endMs)   * 1000000n).toString()

  const res = await fetch(
    `${FITNESS_API}/dataSources/derived:com.google.step_count.delta:com.google.android.gms:estimated_steps/datasets/${startNs}-${endNs}`,
    { headers: { Authorization: `Bearer ${googleAccessToken}` }, cache: 'no-store' }
  )
  if (!res.ok) return []

  const data = await res.json()
  return (data.point ?? [])
    .filter(pt => (pt.value?.[0]?.intVal ?? 0) > 0)
    .map(pt => ({
      startMs: Number(BigInt(pt.startTimeNanos) / 1000000n),
      endMs:   Number(BigInt(pt.endTimeNanos)   / 1000000n),
      steps:   pt.value?.[0]?.intVal ?? 0,
    }))
    .sort((a, b) => a.startMs - b.startMs)
}

// Returns today's steps in six 4-hour IST-aligned slots.
// Labels are the end of each slot: 4am, 8am, 12pm, 4pm, 8pm, 12am.
export async function getActivityTimeline(googleAccessToken) {
  const startMs = istMidnight(0)
  const endMs   = istMidnight(1)  // end of today IST

  const res = await fetch(`${FITNESS_API}/dataset:aggregate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
      bucketByTime: { durationMillis: 4 * 60 * 60 * 1000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    }),
    cache: 'no-store',
  })
  if (!res.ok) return []

  const labels = ['4am', '8am', '12pm', '4pm', '8pm', '12am']
  return (await res.json()).bucket?.slice(0, 6).map((bucket, i) => ({
    time: labels[i],
    steps: bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal ?? 0,
  })) ?? []
}

export async function getDailySteps(googleAccessToken) {
  const res = await fetch(`${FITNESS_API}/dataset:aggregate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
        { dataTypeName: 'com.google.active_minutes' },
        { dataTypeName: 'com.google.distance.delta' },
      ],
      // 24h buckets starting at IST midnight — IST has no DST so this is equivalent
      // to calendar-day bucketing. durationMillis is more reliable than period.timeZoneId
      // on the Google Fit REST API.
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: istMidnight(-6),
      endTimeMillis: Date.now(),
    }),
    cache: 'no-store',
  })
  if (!res.ok) return []

  const data = await res.json()
  return (data.bucket ?? []).map((bucket) => {
    // bucket.startTimeMillis is the IST midnight in UTC ms; shift into IST to read the date
    const istDate = new Date(Number(bucket.startTimeMillis) + IST_OFFSET_MS)
    const isoDate = istDate.toISOString().slice(0, 10)
    const distM = bucket.dataset?.[3]?.point?.[0]?.value?.[0]?.fpVal ?? 0
    return {
      date: new Date(isoDate + 'T12:00:00+05:30').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      isoDate,
      steps: bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal ?? 0,
      calories: Math.round(bucket.dataset?.[1]?.point?.[0]?.value?.[0]?.fpVal ?? 0),
      activeMinutes: bucket.dataset?.[2]?.point?.[0]?.value?.[0]?.intVal ?? 0,
      distanceKm: distM ? Math.round(distM / 10) / 100 : 0,
    }
  })
}

export async function getBodyMetrics(googleAccessToken) {
  const [weightKg, heightM] = await Promise.all([
    getLatestDataPoint(googleAccessToken, 'derived:com.google.weight:com.google.android.gms:merge_weight'),
    getLatestDataPoint(googleAccessToken, 'derived:com.google.height:com.google.android.gms:merge_height'),
  ])
  return {
    weightKg: weightKg !== null ? Math.round(weightKg * 10) / 10 : null,
    heightCm: heightM !== null ? Math.round(heightM * 100) : null,
  }
}

const ACTIVITY_NAMES = {
  0: 'In vehicle', 1: 'Biking', 2: 'On foot', 3: 'Still', 7: 'Walking',
  8: 'Running', 9: 'Aerobics', 14: 'Handbiking', 15: 'Mountain biking',
  16: 'Road biking', 17: 'Spinning', 18: 'Stationary biking', 20: 'Boxing',
  21: 'Calisthenics', 22: 'Circuit training', 26: 'Dancing', 29: 'Elliptical',
  32: 'Fencing', 33: 'Football', 35: 'Soccer', 38: 'Golf', 39: 'Gymnastics',
  41: 'Hiking', 42: 'Hockey', 45: 'Ice skating', 47: 'Interval training',
  48: 'Jump rope', 49: 'Kayaking', 51: 'Kickboxing', 53: 'Martial arts',
  54: 'Meditation', 58: 'Pilates', 60: 'Racquetball', 61: 'Rock climbing',
  62: 'Rowing', 63: 'Rowing machine', 64: 'Rugby', 66: 'Running (treadmill)',
  69: 'Skateboarding', 70: 'Skating', 71: 'Cross-country skiing',
  72: 'Downhill skiing', 76: 'Snowboarding', 78: 'Snowshoeing', 79: 'Squash',
  80: 'Stair climbing', 82: 'Stand-up paddleboarding', 83: 'Strength training',
  84: 'Surfing', 85: 'Swimming', 86: 'Swimming (pool)', 89: 'Tennis',
  90: 'Treadmill (walking)', 91: 'Volleyball', 95: 'Walking (fitness)',
  97: 'Walking (treadmill)', 99: 'Weightlifting', 100: 'Wheelchair',
  102: 'Yoga', 111: 'HIIT',
}

const ACTIVITY_ICON = {
  1: 'directions_bike', 7: 'directions_walk', 8: 'directions_run',
  9: 'sports_gymnastics', 15: 'directions_bike', 16: 'directions_bike',
  18: 'directions_bike', 20: 'sports_mma', 21: 'fitness_center',
  22: 'fitness_center', 26: 'music_note', 29: 'directions_run',
  32: 'sports_martial_arts', 33: 'sports_football', 35: 'sports_soccer',
  38: 'sports_golf', 39: 'sports_gymnastics', 41: 'hiking', 42: 'sports_hockey',
  45: 'ice_skating', 47: 'bolt', 48: 'fitness_center', 49: 'kayaking',
  51: 'sports_martial_arts', 53: 'sports_martial_arts', 54: 'self_improvement',
  58: 'self_improvement', 60: 'sports_tennis', 61: 'hiking', 62: 'rowing',
  63: 'rowing', 64: 'sports_rugby', 66: 'directions_run', 70: 'ice_skating',
  71: 'downhill_skiing', 72: 'downhill_skiing', 76: 'snowboarding',
  79: 'sports_tennis', 80: 'stairs', 83: 'fitness_center', 84: 'surfing',
  85: 'pool', 86: 'pool', 89: 'sports_tennis', 90: 'directions_walk',
  91: 'sports_volleyball', 95: 'directions_walk', 97: 'directions_walk',
  99: 'fitness_center', 102: 'self_improvement', 111: 'bolt',
}

export async function getActivitySessions(googleAccessToken, days = 7) {
  const endTime = new Date()
  const startTime = new Date()
  startTime.setDate(endTime.getDate() - days)

  const res = await fetch(
    `${FITNESS_API}/sessions?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}&includeDeleted=false`,
    { headers: { Authorization: `Bearer ${googleAccessToken}` }, cache: 'no-store' }
  )
  if (!res.ok) return []

  const data = await res.json()
  const sessions = (data.session ?? [])
    .filter((s) => s.activityType !== 3 && s.activityType !== 4) // exclude still/unknown
    .map((s) => ({
      id: s.id,
      name: s.name || ACTIVITY_NAMES[s.activityType] || 'Activity',
      icon: ACTIVITY_ICON[s.activityType] || 'directions_run',
      activityType: s.activityType,
      startMs: Number(s.startTimeMillis),
      endMs: Number(s.endTimeMillis),
      durationMin: Math.round((Number(s.endTimeMillis) - Number(s.startTimeMillis)) / 60000),
      date: new Date(Number(s.startTimeMillis)).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      }),
    }))

  // Fetch steps for each session in parallel
  const withSteps = await Promise.all(
    sessions.map(async (session) => {
      try {
        const stepsData = await aggregate(googleAccessToken, 'com.google.step_count.delta', {
          startTimeMillis: session.startMs,
          endTimeMillis: session.endMs,
        })
        const steps = stepsData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal ?? 0
        return { ...session, steps }
      } catch {
        return { ...session, steps: 0 }
      }
    })
  )

  return withSteps.sort((a, b) => b.startMs - a.startMs)
}

export async function getSleepData(googleAccessToken) {
  const yesterday = yesterdayRange()

  const res = await fetch(`${FITNESS_API}/dataset:aggregate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }],
      bucketByTime: { durationMillis: yesterday.endTimeMillis - yesterday.startTimeMillis },
      startTimeMillis: yesterday.startTimeMillis,
      endTimeMillis: yesterday.endTimeMillis,
    }),
    cache: 'no-store',
  })
  if (!res.ok) return null

  const data = await res.json()
  const points = data?.bucket?.[0]?.dataset?.[0]?.point ?? []

  // activity type 72 = sleep (all types except 112 = awake)
  let totalMs = 0
  for (const pt of points) {
    const type = pt.value?.[0]?.intVal
    if (type !== 112) {
      totalMs += Number(BigInt(pt.endTimeNanos) - BigInt(pt.startTimeNanos)) / 1e6
    }
  }

  const hours = Math.floor(totalMs / 3600000)
  const mins = Math.floor((totalMs % 3600000) / 60000)
  return totalMs > 0 ? { display: `${hours}h ${mins}m`, minutes: Math.round(totalMs / 60000) } : null
}

// Returns sleep duration keyed by IST date string for the past 7 nights.
export async function getSleepWeek(googleAccessToken) {
  const res = await fetch(`${FITNESS_API}/dataset:aggregate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }],
      bucketByTime: { period: { type: 'day', value: 1, timeZoneId: 'Asia/Kolkata' } },
      startTimeMillis: istMidnight(-7),
      endTimeMillis: Date.now(),
    }),
    cache: 'no-store',
  })
  if (!res.ok) return {}

  const data = await res.json()
  const result = {}

  for (const bucket of data.bucket ?? []) {
    const istDate = new Date(Number(bucket.startTimeMillis) + IST_OFFSET_MS)
    const isoDate = istDate.toISOString().slice(0, 10)
    const points = bucket.dataset?.[0]?.point ?? []

    let totalMs = 0
    for (const pt of points) {
      if (pt.value?.[0]?.intVal !== 112) {
        totalMs += Number(BigInt(pt.endTimeNanos) - BigInt(pt.startTimeNanos)) / 1e6
      }
    }

    if (totalMs > 0) {
      const h = Math.floor(totalMs / 3600000)
      const m = Math.floor((totalMs % 3600000) / 60000)
      result[isoDate] = { display: `${h}h ${m}m`, minutes: Math.round(totalMs / 60000) }
    }
  }

  return result
}
