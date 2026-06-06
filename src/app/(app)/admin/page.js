/**
 * /admin — internal dashboard, restricted to the admin account. Everyone else gets
 * a 404 (notFound). Not indexed by search engines (robots: noindex). Reads ALL users'
 * data with the service-role client (bypasses RLS) for an aggregate, detailed view.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ADMIN_EMAIL } from '@/lib/constants'
import { TestPushButton } from '@/components/test-push-button'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin — KyaReFitting aa',
  robots: { index: false, follow: false },
}

// Short "MMM D, YY" date, or an em dash when null.
function fmtDate(value) {
  return value ? new Date(value).toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' }) : '—'
}

// 0–23 hour index to a 12-hour clock label (e.g. 13 -> "1 PM"); used for the peak hour.
function formatHour(hour) {
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`
}

// Admin-only aggregate table. Service-role reads ALL users' rows (bypassing RLS), then
// rolls them up per user in-memory: step totals, date range, latest RHR/VO₂, sleep/
// hydration day counts, workout + hourly-bucket counts, and the per-user peak step hour.
export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) notFound()

  const service = createServiceClient()
  const [{ data: profiles }, { data: metrics }, { data: workouts }, { data: hourly }] =
    await Promise.all([
      service
        .from('profiles')
        .select(
          'id, email, full_name, daily_step_goal, height_cm, weight_kg, age, gender, birthday, google_health_refresh_token, details_synced_at'
        ),
      service
        .from('daily_metrics')
        .select('user_id, date, steps, resting_hr, vo2_max, sleep_min, hydration_ml'),
      service.from('workouts').select('user_id'),
      service.from('steps_hourly').select('user_id, hour, steps'),
    ])

  // Seed one accumulator per profile, then fold the metric/workout/hourly rows into it.
  const byUser = {}
  for (const profile of profiles ?? []) {
    byUser[profile.id] = {
      profile,
      days: 0,
      totalSteps: 0,
      minDate: null,
      maxDate: null,
      restingHr: null,
      restingHrDate: null,
      vo2: null,
      vo2Date: null,
      sleepDays: 0,
      hydrationDays: 0,
      workouts: 0,
      hourly: 0,
      hourSums: new Array(24).fill(0),
    }
  }
  for (const metric of metrics ?? []) {
    const entry = byUser[metric.user_id]
    if (!entry) continue
    entry.days += 1
    entry.totalSteps += metric.steps ?? 0
    if (!entry.minDate || metric.date < entry.minDate) entry.minDate = metric.date
    if (!entry.maxDate || metric.date > entry.maxDate) entry.maxDate = metric.date
    if (metric.resting_hr != null && (!entry.restingHrDate || metric.date > entry.restingHrDate)) {
      entry.restingHr = metric.resting_hr
      entry.restingHrDate = metric.date
    }
    if (metric.vo2_max != null && (!entry.vo2Date || metric.date > entry.vo2Date)) {
      entry.vo2 = metric.vo2_max
      entry.vo2Date = metric.date
    }
    if (metric.sleep_min != null) entry.sleepDays += 1
    if (metric.hydration_ml != null) entry.hydrationDays += 1
  }
  for (const workout of workouts ?? []) if (byUser[workout.user_id]) byUser[workout.user_id].workouts += 1
  for (const bucket of hourly ?? []) {
    const entry = byUser[bucket.user_id]
    if (!entry) continue
    entry.hourly += 1
    entry.hourSums[bucket.hour] += bucket.steps ?? 0
  }
  // Peak hour = the hour-of-day bucket with the most cumulative steps (null if none).
  for (const entry of Object.values(byUser)) {
    const peak = Math.max(...entry.hourSums)
    entry.peakHour = peak > 0 ? entry.hourSums.indexOf(peak) : null
  }

  const rows = Object.values(byUser).sort((a, b) => b.totalSteps - a.totalSteps)
  const connectedCount = rows.filter((row) => row.profile.google_health_refresh_token).length
  const totalSteps = rows.reduce((sum, row) => sum + row.totalSteps, 0)
  const totalWorkouts = (workouts ?? []).length

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground text-sm">All users and their Google Health data</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/notifications"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Notification log
          </Link>
          <TestPushButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Users" value={rows.length.toLocaleString()} />
        <Stat label="Health connected" value={connectedCount.toLocaleString()} />
        <Stat label="Total steps" value={totalSteps.toLocaleString()} />
        <Stat label="Workouts" value={totalWorkouts.toLocaleString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Sorted by total stored steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right">Goal</TableHead>
                  <TableHead>Sex / Age</TableHead>
                  <TableHead>H / W</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead className="text-right">Total steps</TableHead>
                  <TableHead className="text-right">RHR</TableHead>
                  <TableHead className="text-right">VO₂</TableHead>
                  <TableHead className="text-right">Sleep d</TableHead>
                  <TableHead className="text-right">Hydr d</TableHead>
                  <TableHead className="text-right">Workouts</TableHead>
                  <TableHead className="text-right">Hourly</TableHead>
                  <TableHead className="text-right">Peak hr</TableHead>
                  <TableHead>Last sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const p = row.profile
                  return (
                    <TableRow key={p.id}>
                      {/* Name cell links into the full per-user drill-down */}
                      <TableCell className="max-w-[14rem]">
                        <Link href={`/admin/${p.id}`} className="group block">
                          <div className="font-medium group-hover:underline">
                            {p.full_name ?? '—'}
                          </div>
                          <div className="text-muted-foreground truncate text-xs">{p.email}</div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {p.google_health_refresh_token ? (
                          <Badge variant="outline">connected</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(p.daily_step_goal ?? 10000).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(p.gender ?? '—')}
                        {p.age != null ? ` · ${p.age}` : ''}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {p.height_cm != null ? `${p.height_cm}cm` : '—'} /{' '}
                        {p.weight_kg != null ? `${p.weight_kg}kg` : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.days}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {fmtDate(row.minDate)} – {fmtDate(row.maxDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {row.totalSteps.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.restingHr ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.vo2 ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.sleepDays}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.hydrationDays}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.workouts}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.hourly}</TableCell>
                      <TableCell className="text-right text-xs">
                        {row.peakHour != null ? formatHour(row.peakHour) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {fmtDate(p.details_synced_at)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Small headline metric card used in the summary row at the top of the admin page.
function Stat({ label, value }) {
  return (
    <Card className="gap-1">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}
