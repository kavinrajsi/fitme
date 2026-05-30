/**
 * Dashboard — main overview page. Server component.
 *
 * Data flow (runs on every page load):
 * 1. If the Google token is valid, fetch live data from Google Fit in parallel
 *    (health summary, 7-day steps, body metrics).
 * 2. Upsert historical days first (steps only, calories=0) then upsert today's
 *    full row (steps + calories + heart rate) LAST — order matters because both
 *    upserts target the same (user_id, date) unique key and we don't want the
 *    historical pass to overwrite today's accurate calorie count with 0.
 * 3. Always read stats and chart data from the DB, so expired-token users still
 *    see their last synced data rather than an empty dashboard.
 *
 * The leaderboard top-5 is fetched in the same Promise.all as the DB reads
 * so it adds zero additional latency.
 */
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getHealthSummary, getDailySteps, getBodyMetrics } from '@/lib/google-fit'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StepsBarChart } from '@/components/steps-bar-chart'
import { Icon } from '@/components/icon'

export const metadata = { title: 'Dashboard — FitMe' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, google_access_token, google_token_expires_at, weight_kg, height_cm')
    .eq('id', user.id)
    .single()

  const name = profile?.full_name || user.email?.split('@')[0] || 'there'
  const tokenValid =
    profile?.google_access_token &&
    profile?.google_token_expires_at &&
    new Date(profile.google_token_expires_at) > new Date()

  // Sync from Google Fit when token is valid
  if (tokenValid) {
    try {
      const [health, dailySteps, body] = await Promise.all([
        getHealthSummary(profile.google_access_token),
        getDailySteps(profile.google_access_token),
        getBodyMetrics(profile.google_access_token),
      ])

      const today = new Date().toISOString().slice(0, 10)

      // Upsert historical step-only rows first (past days, no calorie/HR data)
      if (dailySteps.length > 0) {
        const historicalRows = dailySteps
          .map((d, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (dailySteps.length - 1 - i))
            return {
              user_id: user.id,
              date: date.toISOString().slice(0, 10),
              steps: d.steps,
              calories: 0,
              avg_heart_rate: null,
              synced_at: new Date().toISOString(),
            }
          })
          .filter((r) => r.date !== today) // exclude today — handled below with full data
        if (historicalRows.length > 0) {
          await supabase.from('health_daily').upsert(historicalRows, { onConflict: 'user_id,date' })
        }
      }

      // Upsert today's full summary last so it always wins
      await supabase.from('health_daily').upsert({
        user_id: user.id,
        date: today,
        steps: health.stepsToday,
        calories: health.caloriesToday,
        avg_heart_rate: health.avgHeartRate,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' })

      // Update body metrics on profile
      const bodyUpdate = {}
      if (body.weightKg !== null) bodyUpdate.weight_kg = body.weightKg
      if (body.heightCm !== null) bodyUpdate.height_cm = body.heightCm
      if (Object.keys(bodyUpdate).length > 0) {
        await supabase.from('profiles').update(bodyUpdate).eq('id', user.id)
      }
    } catch {
      // token may be revoked — fall through to serve from DB
    }
  }

  // Always serve from DB
  const today = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

  const [{ data: todayRow }, { data: weekRows }, { data: freshProfile }, { data: topUsers }] = await Promise.all([
    supabase
      .from('health_daily')
      .select('steps, calories, avg_heart_rate')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('health_daily')
      .select('date, steps')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true }),
    supabase
      .from('profiles')
      .select('weight_kg, height_cm')
      .eq('id', user.id)
      .single(),
    supabase.rpc('get_leaderboard', { period: 'today' }),
  ])

  const hasData = !!todayRow
  const weightKg = freshProfile?.weight_kg ?? profile?.weight_kg
  const heightCm = freshProfile?.height_cm ?? profile?.height_cm

  const chartData = (weekRows ?? []).map((r) => ({
    date: new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    steps: r.steps,
  }))

  const stats = hasData
    ? [
        { label: 'Steps today', value: (todayRow.steps ?? 0).toLocaleString(), icon: 'directions_walk' },
        { label: 'Calories burned', value: `${(todayRow.calories ?? 0).toLocaleString()} kcal`, icon: 'local_fire_department' },
        { label: 'Avg heart rate', value: todayRow.avg_heart_rate ? `${todayRow.avg_heart_rate} bpm` : '—', icon: 'monitor_heart' },
        { label: 'Weight', value: weightKg ? `${weightKg} kg` : '—', icon: 'monitor_weight' },
        { label: 'Height', value: heightCm ? `${heightCm} cm` : '—', icon: 'height' },
      ]
    : []

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Good day, {name} 👋</h1>
        <p className="text-muted-foreground text-sm">Here&apos;s your fitness overview</p>
      </div>

      {!profile?.google_access_token && (
        <Alert className="mb-6 flex items-center justify-between gap-4 bg-blue-50 border-blue-200">
          <AlertDescription className="text-sm text-gray-700">
            Connect your Google Fit account to see your health data.
          </AlertDescription>
          <Link href="/auth/google" prefetch={false} className={buttonVariants({ size: 'sm', className: 'shrink-0' })}>
            Connect Google Fit
          </Link>
        </Alert>
      )}

      {profile?.google_access_token && !tokenValid && (
        <Alert className="mb-6 flex items-center justify-between gap-4 bg-orange-50 border-orange-200">
          <AlertDescription className="text-sm text-gray-700">
            Your Google Fit session expired — showing last synced data.
          </AlertDescription>
          <Link href="/auth/google" prefetch={false} className={buttonVariants({ size: 'sm', className: 'shrink-0' })}>
            Reconnect Google Fit
          </Link>
        </Alert>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 mb-10">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <Icon name={s.icon} size={28} className="text-muted-foreground mb-2" />
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Steps — last 7 days</h2>
          <Card>
            <CardContent className="pt-6">
              <StepsBarChart data={chartData} />
            </CardContent>
          </Card>
        </div>
      )}

      {topUsers && topUsers.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top 5 today</h2>
            <Link href="/leaderboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Full leaderboard <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {topUsers.slice(0, 5).map((row) => {
              const isMe = row.user_id === user.id
              const medalColors = ['text-yellow-500', 'text-slate-400', 'text-amber-600']
              const initials = (row.full_name || '?')
                .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
              return (
                <Card key={row.user_id} className={isMe ? 'border-primary bg-primary/5' : ''}>
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <span className="w-7 flex justify-center flex-shrink-0">
                      {medalColors[row.rank - 1]
                        ? <Icon name="emoji_events" size={20} className={medalColors[row.rank - 1]} />
                        : <span className="text-sm font-bold text-muted-foreground">#{row.rank}</span>}
                    </span>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium">
                      {row.full_name}
                      {isMe && <span className="ml-2 text-xs text-primary font-semibold">you</span>}
                    </span>
                    <span className="text-sm font-bold tabular-nums">{Number(row.total_steps).toLocaleString()} steps</span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
