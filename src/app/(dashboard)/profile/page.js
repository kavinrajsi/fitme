'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Icon } from '@/components/icon'

const STREAK_THRESHOLD = 8000
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ full_name: '', avatar_url: null })
  const [activityData, setActivityData] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10)

        const [{ data: profileData }, { data: activity }] = await Promise.all([
          supabase.from('profiles').select('full_name, bio, avatar_url').eq('id', user.id).single(),
          supabase.from('health_daily').select('date, steps').eq('user_id', user.id).gte('date', thirtyDaysAgoStr).order('date', { ascending: false }),
        ])

        const googleName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
        const fullName = profileData?.full_name || googleName
        const avatarUrl = profileData?.avatar_url ?? user.user_metadata?.avatar_url ?? null

        if (!profileData?.full_name && googleName) {
          await supabase.from('profiles').update({ full_name: googleName }).eq('id', user.id)
        }

        setProfile({ full_name: fullName, avatar_url: avatarUrl })
        setActivityData(activity || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const result = await updateProfile(new FormData(e.target))
    setMessage(result?.error ? { type: 'error', text: result.error } : { type: 'success', text: result.success })
    setSaving(false)
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>

  const initials = (profile.full_name || user?.email || '?')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  // --- Calendar & streak computation ---
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first

  const activityMap = Object.fromEntries(activityData.map(r => [r.date, r.steps]))

  // Streak
  let streak = 0
  const checkDate = new Date()
  if ((activityMap[todayStr] ?? 0) < STREAK_THRESHOLD) checkDate.setDate(checkDate.getDate() - 1)
  for (let i = 0; i < 30; i++) {
    const d = checkDate.toISOString().slice(0, 10)
    if ((activityMap[d] ?? 0) >= STREAK_THRESHOLD) { streak++; checkDate.setDate(checkDate.getDate() - 1) }
    else break
  }

  // Active days this month
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  const activeDaysThisMonth = activityData.filter(r => r.date.startsWith(monthPrefix) && r.steps >= STREAK_THRESHOLD).length

  // Build calendar cells
  const cells = []
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, 1 - startOffset + i)
    cells.push({ dayNum: d.getDate(), currentMonth: false, active: false, isToday: false, isFuture: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const dateStr = date.toISOString().slice(0, 10)
    const isFuture = dateStr > todayStr
    cells.push({
      dateStr, dayNum: d, currentMonth: true, isToday: dateStr === todayStr,
      active: !isFuture && (activityMap[dateStr] ?? 0) >= STREAK_THRESHOLD,
      isFuture,
    })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account details</p>
      </div>

      {/* Activity calendar */}
      <Card className="max-w-[540px] mb-6">
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold mb-4">{monthLabel}</h2>
          <div className="flex gap-5 mb-5">
            <div>
              <p className="text-xs text-muted-foreground">Your Streak</p>
              <p className="text-lg font-bold">{streak} {streak === 1 ? 'day' : 'days'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Days</p>
              <p className="text-lg font-bold">{activeDaysThisMonth}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Calendar grid */}
            <div className="flex-1">
              <div className="grid grid-cols-7 mb-2">
                {DAY_LETTERS.slice(1).concat(DAY_LETTERS[0]).map((d, i) => (
                  <div key={i} className="flex justify-center">
                    <span className="text-[11px] text-muted-foreground font-medium">{d}</span>
                  </div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 mb-1">
                  {week.map((cell, ci) => (
                    <div key={ci} className="flex justify-center py-0.5">
                      {cell ? (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                          cell.active
                            ? 'bg-foreground text-background'
                            : cell.isToday
                            ? 'border-2 border-foreground text-foreground'
                            : cell.currentMonth && !cell.isFuture
                            ? 'bg-muted text-muted-foreground'
                            : 'text-muted-foreground/30'
                        }`}>
                          {cell.active
                            ? <Icon name="directions_walk" size={15} />
                            : cell.dayNum}
                        </div>
                      ) : <div className="w-8 h-8" />}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Weekly streak column */}
            <div className="flex flex-col" style={{ paddingTop: '28px' }}>
              {weeks.map((week, wi) => {
                const weekActive = week.some(c => c?.active)
                return (
                  <div key={wi} className="flex justify-center items-center h-9 mb-1 py-0.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${weekActive ? 'bg-orange-400' : 'bg-muted'}`}>
                      {weekActive && <Icon name="check" size={14} className="text-white" />}
                    </div>
                  </div>
                )
              })}
              <div className="flex flex-col items-center mt-2">
                <Icon name="local_fire_department" size={24} className="text-orange-500" />
                <span className="text-sm font-bold text-orange-500">{streak}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-[540px] mb-6">
        <CardContent className="pt-6">
          <h2 className="text-base font-semibold mb-1">Privacy</h2>
          <p className="text-muted-foreground text-sm mb-3">Your steps appear on the leaderboard.</p>
          <p className="text-sm font-medium flex items-center gap-2">
            <Icon name="emoji_events" size={18} className="text-muted-foreground" /> Show me on the leaderboard
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-[540px] mb-6">
        <CardContent className="pt-6">
          <h2 className="text-base font-semibold mb-1">Appearance</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Choose your preferred color mode. <span className="font-medium">System</span> follows your browser setting.
          </p>
          <ThemeSwitcher />
        </CardContent>
      </Card>

      <Card className="max-w-[540px]">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-7">
            <Avatar className="h-14 w-14 text-base font-bold">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{profile.full_name || 'No name set'}</p>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
            </div>
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-5">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Full name
              <input
                name="full_name"
                type="text"
                defaultValue={profile.full_name}
                placeholder="Your full name"
                className="px-3.5 py-2.5 rounded-lg border border-input bg-background text-base outline-none focus:ring-2 focus:ring-ring font-[inherit]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium opacity-60">
              Email (cannot be changed here)
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="px-3.5 py-2.5 rounded-lg border border-input bg-muted text-base cursor-not-allowed font-[inherit]"
              />
            </label>

            <Button type="submit" disabled={saving} className="mt-2">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
