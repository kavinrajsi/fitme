import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icon } from '@/components/icon'

export const metadata = { title: 'Admin — KyaReFitting aa' }

const ADMIN_EMAIL = 'sikavinraj@gmail.com'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (user.email !== ADMIN_EMAIL) redirect('/dashboard')

  const service = createServiceClient()

  const today = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

  const [
    { data: { users: authUsers } },
    { data: profiles },
    { data: todayRows },
    { data: weekRows },
    { data: sessions },
    { data: syncLogs },
  ] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 1000 }),
    service.from('profiles').select('id, full_name, avatar_url, weight_kg, height_cm, google_refresh_token, google_token_expires_at'),
    service.from('health_daily').select('user_id, steps, calories, active_minutes, distance_km').eq('date', today),
    service.from('health_daily').select('user_id, steps').gte('date', sevenDaysAgo),
    service.from('activity_sessions').select('user_id, name, duration_min, start_time').gte('start_time', new Date(Date.now() - 7 * 86400000).toISOString()).order('start_time', { ascending: false }),
    service.from('sync_logs').select('id, user_id, triggered_by, status, error, steps_today, days_written, created_at').gte('created_at', new Date(Date.now() - 2 * 86400000).toISOString()).order('created_at', { ascending: false }),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const todayMap = Object.fromEntries((todayRows ?? []).map(r => [r.user_id, r]))
  const weekSteps = (weekRows ?? []).reduce((acc, r) => {
    acc[r.user_id] = (acc[r.user_id] ?? 0) + (r.steps ?? 0)
    return acc
  }, {})

  const users = (authUsers ?? []).map(u => {
    const profile = profileMap[u.id] ?? {}
    const today = todayMap[u.id] ?? {}
    const tokenValid = profile.google_token_expires_at && new Date(profile.google_token_expires_at) > new Date()
    return {
      id: u.id,
      email: u.email,
      name: profile.full_name || u.email?.split('@')[0] || '—',
      avatar_url: profile.avatar_url,
      weight_kg: profile.weight_kg,
      height_cm: profile.height_cm,
      googleConnected: !!profile.google_refresh_token,
      tokenValid,
      stepsToday: today.steps ?? 0,
      caloriesToday: today.calories ?? 0,
      activeMinutes: today.active_minutes ?? 0,
      distanceKm: today.distance_km ?? 0,
      stepsWeek: weekSteps[u.id] ?? 0,
      lastSeen: u.last_sign_in_at,
    }
  }).sort((a, b) => b.stepsToday - a.stepsToday)

  const totalStepsToday = users.reduce((s, u) => s + u.stepsToday, 0)
  const connectedCount = users.filter(u => u.googleConnected).length

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Admin</h1>
          <p className="text-muted-foreground text-sm">All users and their health data</p>
        </div>
        <div className="flex gap-3">
          <Pill icon="group" label={`${users.length} users`} />
          <Pill icon="link" label={`${connectedCount} connected`} />
          <Pill icon="directions_walk" label={`${totalStepsToday.toLocaleString()} steps today`} />
        </div>
      </div>

      {/* Users table */}
      <Card className="mb-10">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Google</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Steps today</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Calories</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Active min</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Week steps</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Weight</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                  const lastSeen = u.lastSeen
                    ? new Date(u.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'
                  return (
                    <tr key={u.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarImage src={u.avatar_url} alt={u.name} />
                            <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        {u.googleConnected
                          ? <Icon name={u.tokenValid ? 'check_circle' : 'schedule'} size={16} className={u.tokenValid ? 'text-green-500' : 'text-yellow-500'} />
                          : <Icon name="cancel" size={16} className="text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {u.stepsToday > 0 ? u.stepsToday.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                        {u.caloriesToday > 0 ? `${u.caloriesToday.toLocaleString()} kcal` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                        {u.activeMinutes > 0 ? `${u.activeMinutes} min` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                        {u.stepsWeek > 0 ? u.stepsWeek.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                        {u.weight_kg ? `${u.weight_kg} kg` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden xl:table-cell text-xs">{lastSeen}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sync logs */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sync Logs — Last 2 days</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trigger</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Steps today</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Days written</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Error</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(syncLogs ?? []).map((log, i) => {
                    const profile = profileMap[log.user_id]
                    const userName = profile?.full_name || log.user_id?.slice(0, 8) || '—'
                    const time = new Date(log.created_at).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                    return (
                      <tr key={log.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                        <td className="px-4 py-2.5 font-medium">{userName}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{log.triggered_by}</td>
                        <td className="px-4 py-2.5 text-center">
                          {log.status === 'success'
                            ? <Icon name="check_circle" size={16} className="text-green-500" />
                            : log.status === 'skipped'
                            ? <Icon name="schedule" size={16} className="text-yellow-500" />
                            : <Icon name="error" size={16} className="text-destructive" />}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                          {log.steps_today != null ? log.steps_today.toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                          {log.days_written != null ? log.days_written : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell max-w-[240px] truncate">
                          {log.error ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground text-xs whitespace-nowrap">{time}</td>
                      </tr>
                    )
                  })}
                  {(syncLogs ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No sync logs yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recent activity sessions */}
      {sessions && sessions.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Activity Sessions — Last 7 days</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activity</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Duration</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => {
                      const profile = profileMap[s.user_id]
                      const userName = profile?.full_name || '—'
                      const date = new Date(s.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      const dur = s.duration_min >= 60
                        ? `${Math.floor(s.duration_min / 60)}h ${s.duration_min % 60}m`
                        : `${s.duration_min}m`
                      return (
                        <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                          <td className="px-4 py-3 font-medium">{userName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.name}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{dur}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{date}</td>
                        </tr>
                      )
                    })}
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

function Pill({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-sm font-medium">
      <Icon name={icon} size={15} className="text-muted-foreground" />
      {label}
    </div>
  )
}
