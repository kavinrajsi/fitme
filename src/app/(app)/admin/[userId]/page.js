/**
 * /admin/[userId] — full per-user detail (admin only, noindex). Shows the profile,
 * summary stats, devices, a daily-steps chart + when-active heatmap, and the complete
 * daily metrics, workouts, hourly steps, and raw step-sample tables.
 *
 * force-dynamic, service-role reads (bypass RLS). UUID-guarded: a non-UUID or
 * non-admin (or a missing profile) all fall through to notFound().
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { ADMIN_EMAIL } from '@/lib/constants'
import { StepsAreaChart } from './steps-area-chart'
import { HourHeatmap } from '@/components/hour-heatmap'
import { buildHeatmap } from '@/lib/heatmap'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'User detail — Admin',
  robots: { index: false, follow: false },
}

// Short date and date+time formatters; timestamps render in IST (Asia/Kolkata).
const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' }) : '—'
const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    : '—'
// Renders a value with an optional unit suffix, or an em dash when null/undefined.
const dash = (value, suffix = '') => (value == null ? '—' : `${value}${suffix}`)

// Guard the route param before using it in queries — bail early on anything not a UUID.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Pulls every table for one user in parallel (profile, daily metrics, workouts, hourly
// steps, push devices, plus a raw-samples page and the oldest-sample timestamp for range).
export default async function AdminUserPage({ params }) {
  const { userId } = await params
  if (!UUID_RE.test(userId)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) notFound()

  const service = createServiceClient()
  const [
    { data: profile },
    { data: metrics },
    { data: workouts },
    { data: hourly },
    { data: devices },
    { data: rawSamples, count: rawCount },
    { data: rawOldest },
  ] = await Promise.all([
      service
        .from('profiles')
        .select(
          'id, email, full_name, avatar_url, daily_step_goal, height_cm, weight_kg, age, gender, birthday, google_health_user_id, google_health_refresh_token, details_synced_at'
        )
        .eq('id', userId)
        .maybeSingle(),
      service
        .from('daily_metrics')
        .select(
          'date, steps, calories, total_calories, distance_km, resting_hr, hr_avg, vo2_max, spo2, hrv_ms, sleep_min, hydration_ml, active_min'
        )
        .eq('user_id', userId)
        .order('date', { ascending: false }),
      service
        .from('workouts')
        .select('source_id, started_at, type, duration_min, calories, distance_km, steps, active_zone_minutes')
        .eq('user_id', userId)
        .order('started_at', { ascending: false }),
      service
        .from('steps_hourly')
        .select('day, hour, steps')
        .eq('user_id', userId)
        .order('day', { ascending: false })
        .order('hour', { ascending: false }),
      service
        .from('push_subscriptions')
        .select('endpoint, device, user_agent, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      service
        .from('steps_raw')
        .select('started_at, count', { count: 'exact' })
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(200),
      service
        .from('steps_raw')
        .select('started_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: true })
        .limit(1),
    ])

  if (!profile) notFound()

  const dailyRows = metrics ?? []
  const totalSteps = dailyRows.reduce((sum, day) => sum + (day.steps ?? 0), 0)
  // dailyRows are newest-first; the chart needs chronological order.
  const stepsChartData = [...dailyRows]
    .reverse()
    .map((day) => ({ date: day.date, steps: day.steps ?? 0 }))
  const goal = profile.daily_step_goal ?? 10000
  const name = profile.full_name ?? 'Account'
  const initial = (name?.[0] ?? profile.email?.[0] ?? '?').toUpperCase()
  const heat = buildHeatmap(hourly)

  const details = [
    ['Goal', `${goal.toLocaleString()} steps/day`],
    ['Height', dash(profile.height_cm, ' cm')],
    ['Weight', dash(profile.weight_kg, ' kg')],
    ['Age', dash(profile.age)],
    ['Gender', dash(profile.gender)],
    ['Birthday', dash(profile.birthday)],
    ['Health user id', dash(profile.google_health_user_id)],
    ['Last sync', fmtDate(profile.details_synced_at)],
    ['User id', profile.id],
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" /> Back to admin
      </Link>

      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">{name}</h1>
          <p className="text-muted-foreground truncate text-sm">{profile.email}</p>
        </div>
        <div className="ml-auto">
          {profile.google_health_refresh_token ? (
            <Badge variant="outline">Health connected</Badge>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Days of data" value={dailyRows.length.toLocaleString()} />
        <Stat label="Total steps" value={totalSteps.toLocaleString()} />
        <Stat label="Workouts" value={(workouts ?? []).length.toLocaleString()} />
        <Stat label="Hourly buckets" value={(hourly ?? []).length.toLocaleString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            {dailyRows.length
              ? `${fmtDate(dailyRows[dailyRows.length - 1].date)} – ${fmtDate(dailyRows[0].date)}`
              : 'No data'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {details.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="truncate font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
          <CardDescription>{(devices ?? []).length} push subscription(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {(devices ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No notification devices.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>User agent</TableHead>
                    <TableHead>Subscribed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(devices ?? []).map((device) => (
                    <TableRow key={device.endpoint}>
                      <TableCell className="font-medium">{device.device ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[24rem] truncate text-xs">
                        {device.user_agent ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                        {fmtDate(device.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <StepsAreaChart data={stepsChartData} />

      {heat.has && (
        <Card>
          <CardHeader>
            <CardTitle>When active</CardTitle>
            <CardDescription>{heat.insight}</CardDescription>
          </CardHeader>
          <CardContent>
            <HourHeatmap grid={heat.grid} max={heat.max} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daily metrics</CardTitle>
          <CardDescription>{dailyRows.length} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[28rem] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Steps</TableHead>
                  <TableHead className="text-right">Cal</TableHead>
                  <TableHead className="text-right">Total cal</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                  <TableHead className="text-right">RHR</TableHead>
                  <TableHead className="text-right">HR avg</TableHead>
                  <TableHead className="text-right">VO₂</TableHead>
                  <TableHead className="text-right">SpO₂</TableHead>
                  <TableHead className="text-right">HRV</TableHead>
                  <TableHead className="text-right">Sleep m</TableHead>
                  <TableHead className="text-right">Hydr ml</TableHead>
                  <TableHead className="text-right">Active m</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyRows.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{day.date}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(day.steps ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.calories)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.total_calories)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.distance_km)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.resting_hr)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.hr_avg)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.vo2_max)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.spo2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.hrv_ms)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.sleep_min)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.hydration_ml)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(day.active_min)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workouts</CardTitle>
          <CardDescription>{(workouts ?? []).length} sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[24rem] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Cal</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                  <TableHead className="text-right">Steps</TableHead>
                  <TableHead className="text-right">AZM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(workouts ?? []).map((workout) => (
                  <TableRow key={workout.source_id}>
                    <TableCell className="font-medium">{workout.type ?? 'Workout'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDateTime(workout.started_at)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {dash(workout.duration_min, ' min')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{dash(workout.calories)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(workout.distance_km)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(workout.steps)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(workout.active_zone_minutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hourly steps</CardTitle>
          <CardDescription>{(hourly ?? []).length} buckets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[24rem] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Hour</TableHead>
                  <TableHead className="text-right">Steps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(hourly ?? []).map((bucket) => (
                  <TableRow key={`${bucket.day}-${bucket.hour}`}>
                    <TableCell>{bucket.day}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {String(bucket.hour).padStart(2, '0')}:00
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(bucket.steps ?? 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Exact total via count:'exact'; the table itself shows only the latest 200 rows */}
      <Card>
        <CardHeader>
          <CardTitle>Raw step samples</CardTitle>
          <CardDescription>
            {(rawCount ?? 0).toLocaleString()} samples
            {rawCount
              ? ` · ${fmtDate(rawOldest?.[0]?.started_at)} – ${fmtDate(rawSamples?.[0]?.started_at)}`
              : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!rawCount ? (
            <p className="text-muted-foreground text-sm">No raw samples.</p>
          ) : (
            <div className="max-h-[24rem] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Steps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rawSamples ?? []).map((sample) => (
                    <TableRow key={sample.started_at}>
                      <TableCell className="text-muted-foreground text-xs">
                        {fmtDateTime(sample.started_at)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{dash(sample.count)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-muted-foreground mt-2 text-xs">
                Showing the {Math.min(rawSamples?.length ?? 0, 200)} most recent of{' '}
                {(rawCount ?? 0).toLocaleString()}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Small headline metric card for the summary row.
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
