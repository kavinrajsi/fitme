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
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7D', days: 7 },
  { key: 'month', label: 'This month', month: true },
]

export default async function LeaderboardPage({ searchParams }) {
  const { period: periodParam } = await searchParams
  const period = PERIODS.find((option) => option.key === periodParam) ?? PERIODS[0] // default Today

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // "This month" = from the 1st of the current IST month; otherwise a rolling
  // N-day window. Aggregation happens in Postgres, ordered by total desc.
  const since = period.month ? istMonthStart() : dkey(period.days - 1)
  const { data: rows } = await supabase.rpc('leaderboard_since', { since_date: since })

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
        <CardDescription>Total steps · {period.label}</CardDescription>
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
