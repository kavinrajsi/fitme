/**
 * /leaderboard — ranks all users by total steps for the selected window. Tabs
 * (Today / 7D / 30D, ?period=, default 7D) switch which window loads.
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

export const metadata = { title: 'Leaderboard — KyaReFitting aa' }

const PERIODS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
]

export default async function LeaderboardPage({ searchParams }) {
  const { period: periodParam } = await searchParams
  const period = PERIODS.find((p) => p.key === periodParam) ?? PERIODS[1] // default 7D

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createServiceClient()
  const istNow = Date.now() + 5.5 * 3600 * 1000
  const since = new Date(istNow - (period.days - 1) * 86400000).toISOString().slice(0, 10)

  const [{ data: metrics }, { data: profiles }] = await Promise.all([
    service.from('daily_metrics').select('user_id, steps').gte('date', since),
    service.from('profiles').select('id, full_name, avatar_url'),
  ])

  const stepsByUser = {}
  for (const m of metrics ?? []) {
    stepsByUser[m.user_id] = (stepsByUser[m.user_id] ?? 0) + (m.steps ?? 0)
  }

  const ranked = (profiles ?? [])
    .map((p) => ({
      id: p.id,
      name: p.full_name ?? 'Anonymous',
      avatar: p.avatar_url,
      steps: stepsByUser[p.id] ?? 0,
    }))
    .sort((a, b) => b.steps - a.steps)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  const shown = ranked.filter((r) => r.steps > 0 || r.id === user.id)
  const anySteps = ranked.some((r) => r.steps > 0)

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Total steps · {period.label}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
          {PERIODS.map((p) => {
            const active = p.key === period.key
            return (
              <a
                key={p.key}
                href={`/leaderboard?period=${p.key}`}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
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
              {shown.map((r) => {
                const isYou = r.id === user.id
                return (
                  <TableRow key={r.id} className={cn(isYou && 'bg-muted/50')}>
                    <TableCell className="pl-4 text-center font-medium text-muted-foreground tabular-nums">
                      {r.rank}
                    </TableCell>
                    <TableCell>
                      <Avatar size="sm">
                        {r.avatar ? <AvatarImage src={r.avatar} alt="" /> : null}
                        <AvatarFallback>
                          {(r.name?.[0] ?? '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.name}
                      {isYou && (
                        <span className="text-muted-foreground"> (you)</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">
                      {r.steps.toLocaleString()}
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
