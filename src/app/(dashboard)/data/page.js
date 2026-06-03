import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDailySteps, getDayStepBuckets, getStepSourceData } from '@/lib/google-data'
import { refreshGoogleToken } from '@/lib/google-auth'
import { istIsoDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { StepsBarChart } from '@/components/steps-bar-chart'
import { DayStepsChart } from '@/components/day-steps-chart'
import { StepSourceDrawer } from '@/components/step-source-drawer'
import { Icon } from '@/components/icon'

export const metadata = { title: 'My Data — KyaReFitting aa' }

function sessionDuration(startIso, endIso) {
  const ms = new Date(endIso) - new Date(startIso)
  const totalSecs = Math.round(ms / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}m ${String(secs).padStart(2, '0')}s`
}

export default async function DataPage() {
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

  let dailySteps = [], dayBuckets = [], stepSource = []
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
      ;[dailySteps, dayBuckets, stepSource] = await Promise.all([
        getDailySteps(accessToken),
        getDayStepBuckets(accessToken),
        getStepSourceData(accessToken),
      ])
    } catch { /* token may be revoked */ }
  }

  // Today's activity sessions from DB (synced by dashboard/sync)
  const todayIso = istIsoDate(0)
  const todayStartIST = new Date(todayIso + 'T00:00:00+05:30').toISOString()
  const { data: todaySessions } = await supabase
    .from('activity_sessions')
    .select('name, icon, start_time, end_time, steps')
    .eq('user_id', user.id)
    .gte('start_time', todayStartIST)
    .order('start_time', { ascending: true })

  const chartData = dailySteps.map((d) => ({
    date: new Date((d.isoDate || d.date) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    steps: d.steps,
  }))

  const todayLabel = new Date(todayIso + 'T12:00:00+05:30').toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const totalStepsToday = dayBuckets.reduce((s, b) => s + b.steps, 0)

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">My Data</h1>
        <p className="text-muted-foreground text-sm">Your step activity</p>
      </div>

      {!profile?.google_access_token && (
        <div className="mb-6 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
          <p className="text-sm text-gray-700 dark:text-blue-200">Connect your Google Fit account to see your health data.</p>
          <a href="/auth/google" className="shrink-0 text-sm font-medium underline hover:opacity-80 transition-opacity">Connect</a>
        </div>
      )}

      {sessionExpired && (
        <div className="mb-6 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
          <p className="text-sm text-gray-700 dark:text-orange-200">Your Google Fit session expired — showing last synced data.</p>
          <a href="/auth/google" className="shrink-0 text-sm font-medium underline hover:opacity-80 transition-opacity">Reconnect</a>
        </div>
      )}

      {dayBuckets.length > 0 && (
        <section className="mb-10">
          <div className="text-center mb-3">
            <p className="text-base font-semibold">{todayLabel}</p>
            <p className="text-sm text-muted-foreground">{totalStepsToday.toLocaleString()} steps</p>
          </div>

          <Card>
            <CardContent className="pt-4 pb-2 px-2">
              <DayStepsChart data={dayBuckets} />
            </CardContent>
          </Card>

          {/* Activity sessions */}
          {todaySessions && todaySessions.length > 0 && (
            <div className="mt-4 flex flex-col divide-y divide-border border-t border-border">
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

          <div className="mt-4">
            <StepSourceDrawer steps={stepSource} dateLabel={todayLabel} />
          </div>
        </section>
      )}

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
