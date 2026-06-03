import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDailySteps, getActivityTimeline, getStepSourceData } from '@/lib/google-data'
import { refreshGoogleToken } from '@/lib/google-auth'
import { Card, CardContent } from '@/components/ui/card'
import { StepsBarChart } from '@/components/steps-bar-chart'
import { ActivityTimeline } from '@/components/activity-timeline'
import { StepSourceDrawer } from '@/components/step-source-drawer'

export const metadata = { title: 'My Data — KyaReFitting aa' }

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

  let dailySteps = [], timeline = [], stepSource = []
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
      ;[dailySteps, timeline, stepSource] = await Promise.all([
        getDailySteps(accessToken),
        getActivityTimeline(accessToken),
        getStepSourceData(accessToken),
      ])
    } catch { /* token may be revoked */ }
  }

  const chartData = dailySteps.map((d) => ({
    date: new Date((d.isoDate || d.date) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    steps: d.steps,
  }))

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">My Data</h1>
        <p className="text-muted-foreground text-sm">Your step activity for the last 7 days</p>
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

      {timeline.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Today&apos;s activity</h2>
            <StepSourceDrawer steps={stepSource} />
          </div>
          <Card>
            <CardContent className="pt-5 pb-5">
              <ActivityTimeline slots={timeline} />
            </CardContent>
          </Card>
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
