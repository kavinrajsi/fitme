/**
 * Dashboard — shadcn cards + trend badges (dashboard-01 style) wired to the user's
 * real Google Health data: section cards, an activity chart with a range toggle, and
 * achievements. Steps from daily_metrics; goal from profiles.daily_step_goal.
 *
 * force-dynamic server component, own-row RLS. ?range=7d|30d|90d (default 30d) drives
 * the activity chart and the HR/sleep trend windows; dates are IST via dkey().
 */
import {
  TrendingUpIcon,
  TrendingDownIcon,
  FlameIcon,
  HeartPulseIcon,
  DropletIcon,
  ActivityIcon,
  GaugeIcon,
  WindIcon,
  HeartIcon,
  ZapIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { computeGamification } from '@/lib/gamification'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { dkey } from '@/lib/date-utils'
import { HourlyStepsChart, MetricTrendChart } from '@/components/charts'
import { GoalRing } from '@/components/goal-ring'
import { HourHeatmap } from '@/components/hour-heatmap'
import { ActivityChartCard } from '@/components/activity-chart-card'
import { buildHeatmap } from '@/lib/heatmap'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard — KyaReFitting aa' }

const RANGES = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
]

// Percent change current-vs-previous; +100% when there's no prior value to compare.
const pct = (current, previous) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0

// Loads the user's goal + all daily/hourly metrics in one round-trip, then derives
// every stat card, trend series, and heatmap from those rows (no per-card queries).
export default async function DashboardPage({ searchParams }) {
  const { range: rangeParam } = await searchParams
  const range = RANGES.find((option) => option.key === rangeParam) ?? RANGES[1]

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: dailyMetrics },
    { data: hourlyToday },
    { data: hourlyRange },
    details,
  ] = await Promise.all([
    supabase.from('profiles').select('daily_step_goal').eq('id', user.id).maybeSingle(),
    supabase
      .from('daily_metrics')
      .select(
        'date, steps, active_min, resting_hr, hydration_ml, vo2_max, spo2, hrv_ms, total_calories, hr_avg, hr_min, hr_max, sleep_min'
      )
      .eq('user_id', user.id),
    supabase.from('steps_hourly').select('hour, steps').eq('user_id', user.id).eq('day', dkey(0)),
    supabase
      .from('steps_hourly')
      .select('day, hour, steps')
      .eq('user_id', user.id)
      .gte('day', dkey(89)),
    getUserDetails(),
  ])

  const goal = profile?.daily_step_goal ?? 10000
  // Streaks + achievements are derived purely from the daily rows vs. the goal.
  const game = computeGamification(dailyMetrics ?? [], goal)

  // Index steps by IST day-key so the sum/latest helpers can look up by days-ago.
  const stepsByDate = {}
  for (const metric of dailyMetrics ?? []) stepsByDate[metric.date] = metric.steps ?? 0
  const sum = (fromDaysAgo, toDaysAgo) => {
    let total = 0
    for (let i = fromDaysAgo; i <= toDaysAgo; i++) total += stepsByDate[dkey(i)] ?? 0
    return total
  }
  const today = stepsByDate[dkey(0)] ?? 0
  const yesterday = stepsByDate[dkey(1)] ?? 0
  const last7 = sum(0, 6)
  const prev7 = sum(7, 13)
  const avg7 = Math.round(last7 / 7)

  // Most-recent value for sparse daily metrics (these aren't recorded every day).
  const latest = (field) => {
    const valueByDate = {}
    for (const metric of dailyMetrics ?? [])
      if (metric[field] != null) valueByDate[metric.date] = metric[field]
    for (let i = 0; i < 90; i++) if (valueByDate[dkey(i)] != null) return valueByDate[dkey(i)]
    return null
  }
  const restingHr = latest('resting_hr')
  const hydrationMl = latest('hydration_ml')
  const vo2Max = latest('vo2_max')
  const spo2 = latest('spo2')
  const hrv = latest('hrv_ms')
  const activeMin = (dailyMetrics ?? []).find((metric) => metric.date === dkey(0))?.active_min ?? null
  const totalCalories = latest('total_calories')
  const heartRateRow = [...(dailyMetrics ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((metric) => metric.hr_avg != null)

  // Build the activity series oldest→newest across the selected range, filling gaps with 0.
  const series = []
  let chartTotal = 0
  for (let i = range.days - 1; i >= 0; i--) {
    const steps = stepsByDate[dkey(i)] ?? 0
    chartTotal += steps
    series.push({ key: dkey(i), steps })
  }
  const chartAvg = Math.round(chartTotal / range.days)
  const stepsSeries = series.map((point) => ({ date: point.key, steps: point.steps }))

  // Intraday hourly steps for today (0–23).
  const hourlyByHour = {}
  for (const bucket of hourlyToday ?? []) hourlyByHour[bucket.hour] = bucket.steps
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    label: String(hour).padStart(2, '0'),
    steps: hourlyByHour[hour] ?? 0,
  }))
  const hasHourly = (hourlyToday ?? []).length > 0

  // Activity heatmap (weekday × hour) over the last ~90 days, + the "most active" insight.
  const {
    grid: heatGrid,
    max: heatMax,
    has: hasHeatmap,
    insight: activeInsight,
  } = buildHeatmap(hourlyRange)

  // Heart-rate and sleep trends over the selected range (gaps where no reading).
  const hrByDate = {}
  const sleepByDate = {}
  for (const metric of dailyMetrics ?? []) {
    const hrValue = metric.hr_avg ?? metric.resting_hr
    if (hrValue != null) hrByDate[metric.date] = Math.round(hrValue)
    if (metric.sleep_min != null) sleepByDate[metric.date] = metric.sleep_min
  }
  const hrSeries = []
  const sleepSeries = []
  for (let i = range.days - 1; i >= 0; i--) {
    const date = dkey(i)
    hrSeries.push({ date, hr: hrByDate[date] ?? null })
    sleepSeries.push({ date, sleep: sleepByDate[date] ?? null })
  }
  const hasHr = hrSeries.some((point) => point.hr != null)
  const hasSleep = sleepSeries.some((point) => point.sleep != null)

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric
          label="Steps today"
          value={today.toLocaleString()}
          trend={pct(today, yesterday)}
          foot={today >= goal ? 'Goal reached 🎉' : 'Keep moving'}
          note={`${Math.round(game.pct * 100)}% of ${goal.toLocaleString()} goal`}
        />
        <Metric
          label="This week"
          value={last7.toLocaleString()}
          trend={pct(last7, prev7)}
          foot="vs. previous 7 days"
          note={`${avg7.toLocaleString()} avg/day`}
        />
        <Metric
          label="Current streak"
          value={`${game.currentStreak}d`}
          icon={<FlameIcon className="size-4" />}
          foot={`Best: ${game.bestStreak} days`}
          note={`Goal ${goal.toLocaleString()}/day`}
        />
        <Card className="items-center justify-center gap-0 py-4">
          <GoalRing
            pct={game.pct}
            size={108}
            stroke={10}
            label={`${Math.round(game.pct * 100)}%`}
          />
          <span className="text-muted-foreground mt-2 text-xs">
            {today.toLocaleString()} / {goal.toLocaleString()}
          </span>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Health</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Metric
            label="Active minutes"
            value={activeMin != null ? `${activeMin} min` : '—'}
            icon={<ActivityIcon className="size-4" />}
            foot="Active time"
            note="Today"
          />
          <Metric
            label="Resting HR"
            value={restingHr != null ? `${restingHr} bpm` : '—'}
            icon={<HeartPulseIcon className="size-4" />}
            foot="Resting heart rate"
            note="Most recent"
          />
          <Metric
            label="Cardio fitness"
            value={vo2Max != null ? `${vo2Max}` : '—'}
            icon={<GaugeIcon className="size-4" />}
            foot="VO₂ max"
            note="mL/kg/min"
          />
          <Metric
            label="SpO₂"
            value={spo2 != null ? `${spo2}%` : '—'}
            icon={<WindIcon className="size-4" />}
            foot="Blood oxygen"
            note={spo2 != null ? 'Most recent' : 'No data yet'}
          />
          <Metric
            label="HRV"
            value={hrv != null ? `${hrv} ms` : '—'}
            icon={<HeartIcon className="size-4" />}
            foot="Heart rate variability"
            note={hrv != null ? 'Most recent' : 'No data yet'}
          />
          <Metric
            label="Hydration"
            value={hydrationMl != null ? `${(hydrationMl / 1000).toFixed(1)} L` : '—'}
            icon={<DropletIcon className="size-4" />}
            foot="Water intake"
            note={hydrationMl != null ? 'Most recent day' : 'No data yet'}
          />
          <Metric
            label="Total calories"
            value={totalCalories != null ? `${totalCalories.toLocaleString()} kcal` : '—'}
            icon={<ZapIcon className="size-4" />}
            foot="Total burned"
            note="Most recent"
          />
          <Metric
            label="Heart rate"
            value={heartRateRow?.hr_avg != null ? `${Math.round(heartRateRow.hr_avg)} bpm` : '—'}
            icon={<HeartIcon className="size-4" />}
            foot="Average"
            note={
              heartRateRow?.hr_min != null && heartRateRow?.hr_max != null
                ? `${heartRateRow.hr_min}–${heartRateRow.hr_max} bpm range`
                : 'Most recent'
            }
          />
        </div>
      </div>

      <ActivityChartCard
        data={stepsSeries}
        total={chartTotal}
        avg={chartAvg}
        rangeKey={range.key}
        ranges={RANGES}
      />

      {hasHourly && (
        <Card>
          <CardHeader>
            <CardTitle>Today by hour</CardTitle>
            <CardDescription>Intraday steps</CardDescription>
          </CardHeader>
          <CardContent>
            <HourlyStepsChart data={hourlyData} />
          </CardContent>
        </Card>
      )}

      {hasHeatmap && (
        <Card>
          <CardHeader>
            <CardTitle>When you&apos;re active</CardTitle>
            <CardDescription>{activeInsight}</CardDescription>
          </CardHeader>
          <CardContent>
            <HourHeatmap grid={heatGrid} max={heatMax} />
          </CardContent>
        </Card>
      )}

      {hasHr && (
        <Card>
          <CardHeader>
            <CardTitle>Heart rate trend</CardTitle>
            <CardDescription>Daily average bpm</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricTrendChart data={hrSeries} dataKey="hr" label="Heart rate" color="var(--chart-2)" />
          </CardContent>
        </Card>
      )}

      {hasSleep && (
        <Card>
          <CardHeader>
            <CardTitle>Sleep trend</CardTitle>
            <CardDescription>Minutes per night</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricTrendChart data={sleepSeries} dataKey="sleep" label="Sleep" color="var(--chart-3)" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {game.achievements.map((achievement) => (
              <div
                key={achievement.id}
                title={achievement.name}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border p-3 text-center',
                  achievement.earned ? 'bg-muted/50' : 'opacity-40'
                )}
              >
                <span className="text-2xl leading-none">
                  {achievement.earned ? achievement.icon : '🔒'}
                </span>
                <span className="text-muted-foreground text-[0.7rem] font-medium">
                  {achievement.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Incremental Health consent (separate OAuth) — shown only when not yet connected */}
      {!details?.healthConnected && (
        <a href="/auth/google/health" className={cn(buttonVariants(), 'w-full')}>
          Connect Google Health
        </a>
      )}
    </div>
  )
}

// Reusable stat card. Shows a trend badge when `trend` is given, else the `icon`;
// renders an optional progress bar. Used for every tile in the grids above.
function Metric({ label, value, trend, icon, progress, foot, note }) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
        <CardAction>
          {trend != null ? (
            <Badge variant="outline">
              {trend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {trend >= 0 ? '+' : ''}
              {trend}%
            </Badge>
          ) : (
            icon && <Badge variant="outline">{icon}</Badge>
          )}
        </CardAction>
      </CardHeader>
      {progress != null && (
        <CardContent>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
        </CardContent>
      )}
      <CardFooter className="mt-auto flex-col items-start gap-0.5 text-sm">
        <span className="font-medium">{foot}</span>
        <span className="text-muted-foreground text-xs">{note}</span>
      </CardFooter>
    </Card>
  )
}
