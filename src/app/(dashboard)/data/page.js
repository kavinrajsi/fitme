import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDailySteps } from '@/lib/google-data'
import { refreshGoogleToken } from '@/lib/google-auth'
import { istIsoDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { StepsBarChart } from '@/components/steps-bar-chart'
import { Icon } from '@/components/icon'
import Link from 'next/link'

export const metadata = { title: 'My Data — KyaReFitting aa' }

function sessionDuration(startIso, endIso) {
  const totalSecs = Math.round((new Date(endIso) - new Date(startIso)) / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}m ${String(secs).padStart(2, '0')}s`
}

function shiftDate(isoDate, days) {
  const d = new Date(isoDate + 'T12:00:00+05:30')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default async function DataPage({ searchParams }) {
  const { date } = await searchParams
  const todayDate = istIsoDate(0)
  const selectedDate = (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= todayDate)
    ? date
    : todayDate
  const prevDate = shiftDate(selectedDate, -1)
  const nextDate = shiftDate(selectedDate, 1)
  const isToday  = selectedDate === todayDate

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', user.id)
    .single()

  const tokenValid =
    profile?.google_access_token &&
    profile?.google_token_expires_at &&
    new Date(profile.google_token_expires_at) > new Date()

  let dailySteps = []
  let sessionExpired = profile?.google_access_token && !tokenValid

  let accessToken = profile?.google_access_token
  if (!tokenValid && profile?.google_refresh_token) {
    try {
      const refreshed = await refreshGoogleToken(profile.google_refresh_token)
      if (refreshed) {
        accessToken = refreshed.access_token
        const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString()
        await supabase.from('profiles').update({
          google_access_token: accessToken,
          google_token_expires_at: expiresAt,
        }).eq('id', user.id)
        sessionExpired = false
      }
    } catch { /* refresh failed — fall through */ }
  }

  if (accessToken && (tokenValid || !sessionExpired)) {
    try {
      dailySteps = await getDailySteps(accessToken)
    } catch { /* token may be revoked */ }
  }

  // Sessions for the selected day from DB
  const dayStartIST = new Date(selectedDate + 'T00:00:00+05:30').toISOString()
  const dayEndIST   = new Date(new Date(selectedDate + 'T00:00:00+05:30').getTime() + 86400000).toISOString()
  const { data: todaySessions } = await supabase
    .from('activity_sessions')
    .select('name, icon, start_time, end_time, steps')
    .eq('user_id', user.id)
    .gte('start_time', dayStartIST)
    .lt('start_time', dayEndIST)
    .order('start_time', { ascending: true })

  // Selected day's step total from the DB (Google Health has no intra-day buckets)
  const { data: dayRow } = await supabase
    .from('health_daily')
    .select('steps')
    .eq('user_id', user.id)
    .eq('date', selectedDate)
    .maybeSingle()

  const chartData = dailySteps.map((d) => ({
    date: new Date((d.isoDate || d.date) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    steps: d.steps,
  }))

  const dateLabel = new Date(selectedDate + 'T12:00:00+05:30').toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const totalStepsToday = dayRow?.steps ?? 0

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">My Data</h1>
        <p className="text-muted-foreground text-sm">Your step activity</p>
      </div>

      {!profile?.google_access_token && (
        <div className="mb-6 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
          <p className="text-sm text-gray-700 dark:text-blue-200">Connect your Google Health account to see your health data.</p>
          <a href="/auth/google" className="shrink-0 text-sm font-medium underline hover:opacity-80 transition-opacity">Connect</a>
        </div>
      )}

      {sessionExpired && (
        <div className="mb-6 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
          <p className="text-sm text-gray-700 dark:text-orange-200">Your Google Health session expired — showing last synced data.</p>
          <a href="/auth/google" className="shrink-0 text-sm font-medium underline hover:opacity-80 transition-opacity">Reconnect</a>
        </div>
      )}

      <section className="mb-10">
        {/* Date navigation */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Link
            href={`/data?date=${prevDate}`}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Previous day"
          >
            <Icon name="chevron_left" size={22} />
          </Link>

          <div className="text-center min-w-[180px]">
            <p className="font-semibold">{dateLabel}</p>
            <p className="text-sm text-muted-foreground">
              {totalStepsToday > 0 ? `${totalStepsToday.toLocaleString()} steps` : 'No data'}
            </p>
          </div>

          {isToday ? (
            <span className="w-9 h-9 flex-shrink-0" />
          ) : (
            <Link
              href={nextDate <= todayDate ? `/data?date=${nextDate}` : '/data'}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Next day"
            >
              <Icon name="chevron_right" size={22} />
            </Link>
          )}
        </div>

        {/* Activity sessions */}
        {todaySessions && todaySessions.length > 0 && (
          <div className="mt-2 flex flex-col divide-y divide-border border-t border-border">
            {todaySessions.map((s, i) => (
              <div key={i} className="flex items-start gap-4 py-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted flex-shrink-0 mt-0.5">
                  <Icon name={s.icon || 'directions_walk'} size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {new Date(s.start_time).toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true,
                    })}
                  </p>
                  <p className="font-semibold">{s.name}</p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <span>{sessionDuration(s.start_time, s.end_time)}</span>
                    {s.steps > 0 && (
                      <>
                        <span>·</span>
                        <Icon name="directions_walk" size={14} />
                        <span>{s.steps.toLocaleString()} steps</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>

      {chartData.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">Steps — Last 7 days</h2>
          <Card>
            <CardContent className="pt-6">
              <StepsBarChart data={chartData} />
            </CardContent>
          </Card>
        </section>
      )}
    </>
  )
}
