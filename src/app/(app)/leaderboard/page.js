/**
 * /leaderboard — ranks all users by total steps for the selected window. Tabs
 * (Today / 7D / 30D, ?period=, default Today) switch which window loads.
 *
 * daily_metrics + profiles are RLS "own-row only", so the cross-user ranking is
 * aggregated by the leaderboard_since() security-definer SQL function — only
 * leaderboard-safe fields (display name, avatar, step total) are returned.
 */
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { dkey, istMonthStart } from '@/lib/date-utils'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LeaderboardShareButton } from '@/components/leaderboard-share-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Leaderboard — KyaReFitting aa' }

const PERIODS = [
  { key: 'today', label: 'Today', since: () => dkey(0), until: () => dkey(0) },
  { key: 'yesterday', label: 'Yesterday', since: () => dkey(1), until: () => dkey(1) },
  { key: '7d', label: '7D', since: () => dkey(6), until: () => dkey(0) },
  { key: 'month', label: 'This month', since: () => istMonthStart(), until: () => dkey(0) },
]

export default async function LeaderboardPage({ searchParams }) {
  const { period: periodParam } = await searchParams
  const period = PERIODS.find((option) => option.key === periodParam) ?? PERIODS[0] // default Today

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Aggregation happens in Postgres over the period's [since, until] window.
  const since = period.since()
  const until = period.until()
  const { data: rows } = await supabase.rpc('leaderboard_between', {
    since_date: since,
    until_date: until,
  })

  const fmtDay = (d) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const dateLabel = since === until ? fmtDay(since) : `${fmtDay(since)} – ${fmtDay(until)}`

  const ranked = (rows ?? []).map((row, i) => ({
    id: row.id,
    name: row.full_name ?? 'Anonymous',
    avatar: row.avatar_url,
    steps: Number(row.total_steps) || 0,
    rank: i + 1,
  }))

  const shown = ranked.filter((entry) => entry.steps > 0 || entry.id === user.id)
  const anySteps = ranked.some((entry) => entry.steps > 0)

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Total steps · {period.label} · {dateLabel}</CardDescription>
        <CardAction>
          <LeaderboardShareButton period={period.key} />
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
          {PERIODS.map((option) => {
            const active = option.key === period.key
            return (
              <Link
                key={option.key}
                href={`/leaderboard?period=${option.key}`}
                scroll={false}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </Link>
            )
          })}
        </div>
      </CardContent>

      {!anySteps ? (
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No steps on the leaderboard yet — sync to get on the board.
          </p>
        </CardContent>
      ) : (
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-4 text-center">#</TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="pr-4 text-right">Steps</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((entry) => {
                const isYou = entry.id === user.id
                return (
                  <TableRow key={entry.id} className={cn(isYou && 'bg-muted/50')}>
                    <TableCell className="pl-4 text-center font-medium text-muted-foreground tabular-nums">
                      {entry.rank}
                    </TableCell>
                    <TableCell>
                      <Avatar size="sm">
                        {entry.avatar ? <AvatarImage src={entry.avatar} alt="" /> : null}
                        <AvatarFallback>
                          {(entry.name?.[0] ?? '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.name}
                      {isYou && (
                        <span className="text-muted-foreground"> (you)</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">
                      {entry.steps.toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  )
}
