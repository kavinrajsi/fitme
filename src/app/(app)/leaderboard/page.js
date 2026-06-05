/**
 * /leaderboard — ranks all users by total steps for the selected window. Tabs
 * (Today / 7D / 30D, ?period=, default Today) switch which window loads.
 *
 * daily_metrics + profiles are RLS "own-row only", so the ranking is built with the
 * service-role client server-side. Only leaderboard-safe fields are surfaced
 * (display name, avatar, step total) — never emails or tokens.
 */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

export const metadata = { title: 'Leaderboard — KyaReFitting' }

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

  const service = createServiceClient()
  const istNow = Date.now() + 5.5 * 3600 * 1000
  const istDate = new Date(istNow)
  // "This month" = from the 1st of the current (IST) calendar month; otherwise a
  // rolling N-day window.
  const since = period.month
    ? new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), 1))
        .toISOString()
        .slice(0, 10)
    : new Date(istNow - (period.days - 1) * 86400000).toISOString().slice(0, 10)

  const [{ data: metrics }, { data: profiles }] = await Promise.all([
    service.from('daily_metrics').select('user_id, steps').gte('date', since),
    service.from('profiles').select('id, full_name, avatar_url'),
  ])

  const stepsByUser = {}
  for (const metric of metrics ?? []) {
    stepsByUser[metric.user_id] = (stepsByUser[metric.user_id] ?? 0) + (metric.steps ?? 0)
  }

  const ranked = (profiles ?? [])
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name ?? 'Anonymous',
      avatar: profile.avatar_url,
      steps: stepsByUser[profile.id] ?? 0,
    }))
    .sort((first, second) => second.steps - first.steps)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))

  const shown = ranked.filter((entry) => entry.steps > 0 || entry.id === user.id)
  const anySteps = ranked.some((entry) => entry.steps > 0)

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Total steps · {period.label}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
          {PERIODS.map((option) => {
            const active = option.key === period.key
            return (
              <a
                key={option.key}
                href={`/leaderboard?period=${option.key}`}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </a>
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
