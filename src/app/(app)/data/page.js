/**
 * /data — daily steps (last 90 days) read from public.daily_metrics, which a daily
 * cron syncs from the Google Health API. Prompts to connect Google Health when the
 * user hasn't, or explains the sync hasn't run yet when there are no rows.
 */
import { Fragment } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { HourlyStepsChart } from '@/components/charts'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Steps data — KyaReFitting' }

const RANGES = [
  { key: '90d', label: 'Last 90 days', short: '90D', limit: 90 },
  { key: 'year', label: 'Last year', short: '1Y', limit: 365 },
  { key: 'all', label: 'All time', short: 'All', limit: null },
]

export default async function DataPage({ searchParams }) {
  const { range: rangeParam, day: dayParam } = await searchParams
  const range = RANGES.find((option) => option.key === rangeParam) ?? RANGES[0]
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(dayParam ?? '') ? dayParam : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let metricsQuery = supabase
    .from('daily_metrics')
    .select('date, steps')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
  if (range.limit) metricsQuery = metricsQuery.limit(range.limit)

  const [{ data: profile }, { data: dailyMetrics }, { data: dayHourly }] = await Promise.all([
    supabase.from('profiles').select('google_health_refresh_token').eq('id', user.id).maybeSingle(),
    metricsQuery,
    selectedDay
      ? supabase.from('steps_hourly').select('hour, steps').eq('user_id', user.id).eq('day', selectedDay)
      : Promise.resolve({ data: null }),
  ])

  const connected = !!profile?.google_health_refresh_token
  const days = dailyMetrics ?? []

  // 24-hour breakdown for the selected day (missing hours → 0).
  const hourlyByHour = {}
  for (const bucket of dayHourly ?? []) hourlyByHour[bucket.hour] = bucket.steps
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    label: String(hour).padStart(2, '0'),
    steps: hourlyByHour[hour] ?? 0,
  }))
  const hasDayHourly = (dayHourly ?? []).length > 0
  const hrefFor = (date) =>
    date === selectedDay ? `/data?range=${range.key}` : `/data?range=${range.key}&day=${date}`
  const total = days.reduce((runningTotal, day) => runningTotal + (day.steps ?? 0), 0)
  const max = days.reduce((highest, day) => Math.max(highest, day.steps ?? 0), 0)
  const average = days.length ? Math.round(total / days.length) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Steps</CardTitle>
        <CardDescription>{range.label} · Google Health</CardDescription>
        <CardAction>
          <div className="bg-muted flex gap-0.5 rounded-lg p-0.5">
            {RANGES.map((option) => (
              <Link
                key={option.key}
                href={`/data?range=${option.key}`}
                scroll={false}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium',
                  option.key === range.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                {option.short}
              </Link>
            ))}
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        {days.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-6">
            <p className="text-sm text-muted-foreground">
              {connected
                ? 'No steps synced yet — the daily sync will populate this shortly.'
                : 'Connect Google Health to start syncing your steps.'}
            </p>
            {!connected && (
              <Button asChild>
                <a href="/auth/google/health">Connect Google Health</a>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-xs font-medium text-muted-foreground">Total</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {total.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-xs font-medium text-muted-foreground">Daily avg</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {average.toLocaleString()}
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-full"></TableHead>
                  <TableHead className="text-right">Steps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((day) => {
                  const isSelected = day.date === selectedDay
                  return (
                    <Fragment key={day.date}>
                      <TableRow className={cn(isSelected && 'bg-muted/50')}>
                        <TableCell className="whitespace-nowrap">
                          <Link
                            href={hrefFor(day.date)}
                            scroll={false}
                            className="text-muted-foreground hover:text-foreground font-medium hover:underline"
                          >
                            {formatDate(day.date)}
                          </Link>
                        </TableCell>
                        <TableCell className="w-full">
                          <div
                            className="bg-primary h-2 rounded"
                            style={{ width: max ? `${((day.steps ?? 0) / max) * 100}%` : '0%' }}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {(day.steps ?? 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                      {isSelected && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={3} className="bg-muted/20">
                            {hasDayHourly ? (
                              <div className="py-2">
                                <div className="text-muted-foreground mb-2 text-xs">
                                  Hourly breakdown · {formatDate(day.date)}
                                </div>
                                <HourlyStepsChart data={hourlyData} />
                              </div>
                            ) : (
                              <p className="text-muted-foreground py-3 text-sm">
                                No hourly breakdown for this day.
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
