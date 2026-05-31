import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icon } from '@/components/icon'

export const metadata = { title: 'Leaderboard — FitMe' }

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Last 7 days' },
  { key: 'month', label: 'This month' },
]

const MEDAL_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600']

function getDateLabel(tab) {
  const now = new Date()
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (tab === 'today') return fmt(now)
  if (tab === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    return `${fmt(start)} – ${fmt(now)}`
  }
  return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function RankChange({ current, prev }) {
  if (!prev) return null
  const diff = Number(prev) - Number(current)
  if (diff > 0) return <span className="text-xs font-semibold text-green-500">↑{diff}</span>
  if (diff < 0) return <span className="text-xs font-semibold text-red-500">↓{Math.abs(diff)}</span>
  return <span className="text-xs text-muted-foreground">—</span>
}

export default async function LeaderboardPage({ searchParams }) {
  const { tab: rawTab } = await searchParams
  const tab = TABS.find((t) => t.key === rawTab)?.key ?? 'today'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: rows } = await supabase.rpc('get_leaderboard', { period: tab })

  const dateLabel = getDateLabel(tab)

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Leaderboard</h1>
        <p className="text-muted-foreground text-sm">Top walkers among opted-in users</p>
      </div>


      <div className="flex gap-2 mb-3">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/leaderboard?tab=${t.key}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              tab === t.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-6">{dateLabel}</p>

      {!rows || rows.length === 0 ? (
        <Card className="max-w-[600px]">
          <CardContent className="pt-8 pb-8 text-center">
            <Icon name="emoji_events" size={40} className="text-muted-foreground mb-3" />
            <p className="font-semibold mb-1">No one on the leaderboard yet</p>
            <p className="text-muted-foreground text-sm mb-4">
              Sync your steps on the dashboard to appear here.
            </p>
            <Link href="/dashboard" className="text-sm font-medium underline hover:text-foreground transition-colors">
              Go to Dashboard
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3 max-w-[600px]">
          {rows.map((row) => {
            const isMe = row.user_id === user.id
            const initials = (row.full_name || '?')
              .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
            const medalColor = MEDAL_COLORS[row.rank - 1]

            return (
              <Card key={row.user_id} className={isMe ? 'border-primary bg-primary/5' : ''}>
                <CardContent className="py-3 px-4 flex items-center gap-4">
                  <div className="w-10 flex flex-col items-center flex-shrink-0">
                    {medalColor ? (
                      <Icon name="emoji_events" size={22} className={medalColor} />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">#{row.rank}</span>
                    )}
                    <RankChange current={row.rank} prev={row.prev_rank} />
                  </div>

                  <Avatar className="h-9 w-9 flex-shrink-0">
                    {row.avatar_url && <AvatarImage src={row.avatar_url} alt={row.full_name} />}
                    <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>

                  <span className="flex-1 font-medium text-sm">
                    {row.full_name}
                    {isMe && <span className="ml-2 text-xs text-primary font-semibold">you</span>}
                  </span>

                  <span className="font-bold tabular-nums text-sm">
                    {Number(row.total_steps).toLocaleString()} steps
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
