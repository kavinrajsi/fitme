import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getHealthSummary, getDailySteps, getBodyMetrics } from '@/lib/google-fit'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StepsBarChart } from '@/components/steps-bar-chart'
import { Icon } from '@/components/icon'

export const metadata = { title: 'Dashboard — FitMe' }

const STEP_GOAL = 10000
const STREAK_THRESHOLD = 8000

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

  if (tokenValid) {
    try {
      const [health, dailySteps, body] = await Promise.all([
        getHealthSummary(profile.google_access_token),
        getDailySteps(profile.google_access_token),
        getBodyMetrics(profile.google_access_token),
      ])

      const today = new Date().toISOString().slice(0, 10)

      if (dailySteps.length > 0) {
        const historicalRows = dailySteps
          .map((d, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (dailySteps.length - 1 - i))
            return {
              user_id: user.id,
              date: date.toISOString().slice(0, 10),
              steps: d.steps,
              calories: d.calories ?? 0,
              avg_heart_rate: null,
              synced_at: new Date().toISOString(),
            }
          })
          .filter((r) => r.date !== today)
        if (historicalRows.length > 0) {
          await supabase.from('health_daily').upsert(historicalRows, { onConflict: 'user_id,date' })
        }
      }

      await supabase.from('health_daily').upsert({
        user_id: user.id,
        date: today,
        steps: health.stepsToday,
        calories: health.caloriesToday,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' })

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

  const today = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)

  const [
    { data: todayRow },
    { data: weekRows },
    { data: freshProfile },
    { data: topUsers },
    { data: streakRows },
    { data: pbRows },
  ] = await Promise.all([
    supabase.from('health_daily').select('steps, calories').eq('user_id', user.id).eq('date', today).maybeSingle(),
    supabase.from('health_daily').select('date, steps').eq('user_id', user.id).gte('date', sevenDaysAgo).order('date', { ascending: true }),
    supabase.from('profiles').select('weight_kg, height_cm').eq('id', user.id).single(),
    supabase.rpc('get_leaderboard', { period: 'today' }),
    supabase.from('health_daily').select('date, steps').eq('user_id', user.id).gte('date', thirtyDaysAgo).order('date', { ascending: false }),
    supabase.from('health_daily').select('steps').eq('user_id', user.id).lt('date', today).order('steps', { ascending: false }).limit(1),
  ])

  const hasData = !!todayRow
  const weightKg = freshProfile?.weight_kg ?? profile?.weight_kg
  const heightCm = freshProfile?.height_cm ?? profile?.height_cm

  // Gamification: streak
  const streakMap = Object.fromEntries((streakRows || []).map(r => [r.date, r.steps]))
  let streak = 0
  const checkDate = new Date()
  if ((streakMap[today] ?? 0) < STREAK_THRESHOLD) checkDate.setDate(checkDate.getDate() - 1)
  for (let i = 0; i < 30; i++) {
    const d = checkDate.toISOString().slice(0, 10)
    if ((streakMap[d] ?? 0) >= STREAK_THRESHOLD) { streak++; checkDate.setDate(checkDate.getDate() - 1) }
    else break
  }

  // 7-day calendar for streak card
  const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    return {
      date: dateStr,
      dayLetter: DAY_LETTERS[d.getDay()],
      dayNum: d.getDate(),
      active: (streakMap[dateStr] ?? 0) >= STREAK_THRESHOLD,
      isToday: dateStr === today,
    }
  })

  // Gamification: personal best
  const todaySteps = todayRow?.steps ?? 0
  const prevBest = pbRows?.[0]?.steps ?? 0
  const isPersonalBest = todaySteps > 0 && todaySteps > prevBest

  // Gamification: step goal progress
  const stepGoalPct = Math.min(100, Math.round((todaySteps / STEP_GOAL) * 100))

  // Gamification: badges
  const monthSteps = (streakRows || []).reduce((s, r) => s + (r.steps || 0), 0)
  const everHit10k = prevBest >= STEP_GOAL || todaySteps >= STEP_GOAL
  const badges = []
  if (everHit10k) badges.push({ icon: 'emoji_events', label: '10K Club', color: 'text-yellow-500', title: 'Hit 10,000 steps in a day' })
  if (streak >= 7) badges.push({ icon: 'local_fire_department', label: 'Week Warrior', color: 'text-orange-500', title: '7-day active streak' })
  else if (streak >= 3) badges.push({ icon: 'bolt', label: 'On a Roll', color: 'text-blue-500', title: '3-day active streak' })
  if (monthSteps >= 100000) badges.push({ icon: 'star', label: 'Century Club', color: 'text-purple-500', title: '100K steps this month' })

  const chartData = (weekRows ?? []).map((r) => ({
    date: new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    steps: r.steps,
  }))

  const stats = hasData
    ? [
        { label: 'Steps today', value: (todayRow.steps ?? 0).toLocaleString(), icon: 'directions_walk' },
        { label: 'Calories burned', value: `${(todayRow.calories ?? 0).toLocaleString()} kcal`, icon: 'local_fire_department' },
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
          <a href="/auth/google" className={buttonVariants({ size: 'sm', className: 'shrink-0' })}>
            Connect Google Fit
          </a>
        </Alert>
      )}

      {profile?.google_access_token && !tokenValid && (
        <Alert className="mb-6 flex items-center justify-between gap-4 bg-orange-50 border-orange-200">
          <AlertDescription className="text-sm text-gray-700">
            Your Google Fit session expired — showing last synced data.
          </AlertDescription>
          <a href="/auth/google" className={buttonVariants({ size: 'sm', className: 'shrink-0' })}>
            Reconnect Google Fit
          </a>
        </Alert>
      )}

      {isPersonalBest && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
          <Icon name="emoji_events" size={24} className="text-yellow-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">New personal best! 🎉</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400">{todaySteps.toLocaleString()} steps — your best day ever</p>
          </div>
        </div>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 mb-6">
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

      {hasData && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">Daily goal</span>
            <span className="text-sm text-muted-foreground">{todaySteps.toLocaleString()} / {STEP_GOAL.toLocaleString()} steps</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${stepGoalPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{stepGoalPct}% of daily goal{stepGoalPct >= 100 ? ' — goal reached! 🎯' : ''}</p>
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="pt-5 pb-5">
          <p className="text-sm font-semibold mb-4">Your streak</p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center min-w-[52px]">
              <Icon name="local_fire_department" size={34} className="text-orange-500" />
              <span className="text-2xl font-bold leading-tight">{streak}</span>
              <span className="text-[11px] text-muted-foreground">{streak === 1 ? 'day' : 'days'}</span>
            </div>
            <div className="flex-1 flex justify-between">
              {last7Days.map(({ date, dayLetter, dayNum, active, isToday }) => (
                <div key={date} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium">{dayLetter}</span>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-foreground text-background'
                      : isToday
                      ? 'border-2 border-foreground text-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {active
                      ? <Icon name="directions_walk" size={17} />
                      : dayNum}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {badges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {badges.map((b) => (
            <div key={b.label} title={b.title} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border">
              <Icon name={b.icon} size={16} className={b.color} />
              <span className="text-sm font-medium">{b.label}</span>
            </div>
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
                      {row.avatar_url && <AvatarImage src={row.avatar_url} alt={row.full_name} />}
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
