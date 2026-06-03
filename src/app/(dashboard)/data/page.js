/**
 * Data page — comprehensive view of all Google Fit data. Server component.
 *
 * Sections rendered (each conditional on data availability):
 * - Activity Today: steps, calories, active minutes, distance, heart rate, active days
 * - Body: weight, height, BMI (computed), sleep last night
 * - Activities (last 7 days): workout sessions with name, duration, steps per session
 * - Steps bar chart (last 7 days, from live Google Fit data)
 * - History table (last 30 days from the health_daily DB table)
 *
 * All five Google Fit calls run in parallel via Promise.all.
 * Activity sessions each trigger an additional aggregate call to get per-session steps,
 * also parallelised inside getActivitySessions().
 *
 * Body metric fallback: if the live fetch returns null (no data in Google Fit),
 * the last values stored in profiles.weight_kg / height_cm are shown instead.
 */
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getHealthSummary, getDailySteps, getBodyMetrics, getSleepData, getActivitySessions } from '@/lib/google-data'
import { refreshGoogleToken } from '@/lib/google-auth'
import { Card, CardContent } from '@/components/ui/card'
import { StepsBarChart } from '@/components/steps-bar-chart'
import { Icon } from '@/components/icon'

export const metadata = { title: 'My Data — KyaReFitting aa' }

const STAT = ({ icon, label, value, sub }) => (
  <Card>
    <CardContent className="pt-5 pb-5">
      <Icon name={icon} size={26} className="text-muted-foreground mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{label}</p>
    </CardContent>
  </Card>
)

export default async function DataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_token_expires_at, weight_kg, height_cm')
    .eq('id', user.id)
    .single()

  const tokenValid =
    profile?.google_access_token &&
    profile?.google_token_expires_at &&
    new Date(profile.google_token_expires_at) > new Date()

  let health = null, dailySteps = [], body = { weightKg: null, heightCm: null }, sleep = null, activities = []
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
      ;[health, dailySteps, body, sleep, activities] = await Promise.all([
        getHealthSummary(accessToken),
        getDailySteps(accessToken),
        getBodyMetrics(accessToken),
        getSleepData(accessToken),
        getActivitySessions(accessToken, 7),
      ])
    } catch { /* token may be revoked */ }
  }

  const weightKg = body.weightKg ?? profile?.weight_kg
  const heightCm = body.heightCm ?? profile?.height_cm
  const bmi = weightKg && heightCm
    ? Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
    : null

  // Full history from DB
  const { data: history } = await supabase
    .from('health_daily')
    .select('date, steps, calories, active_minutes, distance_km, sleep_minutes')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  const chartData = dailySteps.map((d) => ({
    date: new Date((d.isoDate || d.date) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    steps: d.steps,
  }))

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">My Data</h1>
        <p className="text-muted-foreground text-sm">All your health data from Google Fit</p>
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

      {/* Activity — Today */}
      {health && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">Activity — Today</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            <STAT icon="directions_walk" label="Steps" value={health.stepsToday.toLocaleString()} />
            <STAT icon="local_fire_department" label="Calories" value={`${health.caloriesToday.toLocaleString()} kcal`} />
            <STAT icon="timer" label="Active minutes" value={`${health.activeMinutesToday} min`} />
            <STAT icon="route" label="Distance" value={`${health.distanceKm} km`} />
          </div>
        </section>
      )}

      {/* Body */}
      {(weightKg || heightCm || sleep) && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">Body</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {weightKg && <STAT icon="monitor_weight" label="Weight" value={`${weightKg} kg`} />}
            {heightCm && <STAT icon="height" label="Height" value={`${heightCm} cm`} />}
            {bmi && (
              <STAT
                icon="straighten"
                label="BMI"
                value={bmi}
                sub={bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'}
              />
            )}
            {sleep && <STAT icon="bedtime" label="Sleep last night" value={sleep.display} />}
          </div>
        </section>
      )}

      {/* Activities */}
      {activities.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">Activities — Last 7 days</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activity</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Duration</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Steps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a, i) => (
                      <tr key={a.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                        <td className="px-4 py-3 font-medium">
                          <Icon name={a.icon} size={18} className="text-muted-foreground mr-2 align-middle" />
                          {a.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{a.date}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {a.durationMin >= 60
                            ? `${Math.floor(a.durationMin / 60)}h ${a.durationMin % 60}m`
                            : `${a.durationMin}m`}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {a.steps > 0 ? a.steps.toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Steps chart */}
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

      {/* History table */}
      {history && history.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">History — Last 30 days</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Steps</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Calories</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Active min</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Distance</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Sleep</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, i) => (
                      <tr
                        key={row.date}
                        className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {row.steps > 0 ? row.steps.toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {row.calories > 0 ? `${row.calories.toLocaleString()} kcal` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                          {row.active_minutes > 0 ? `${row.active_minutes} min` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                          {row.distance_km > 0 ? `${row.distance_km} km` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                          {row.sleep_minutes > 0
                            ? `${Math.floor(row.sleep_minutes / 60)}h ${row.sleep_minutes % 60}m`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </>
  )
}
