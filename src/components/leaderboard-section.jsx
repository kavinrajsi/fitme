/**
 * Shared, server-rendered leaderboard (period tabs + ranked table). Used by the
 * /leaderboard page AND the dashboard home card so they can never drift.
 *
 * Aggregates cross-user step totals via the leaderboard_between() security-definer RPC for
 * the selected [since, until] IST window. Callers are force-dynamic, so each tab navigation
 * re-renders on the server with fresh data. Tab links preserve the page's other query params
 * (e.g. the dashboard's ?range=) by namespacing the period param per caller.
 */
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { dkey, istMonthStart } from '@/lib/date-utils'
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

export const LEADERBOARD_PERIODS = [
  { key: 'today', label: 'Today', since: () => dkey(0), until: () => dkey(0) },
  { key: 'yesterday', label: 'Yesterday', since: () => dkey(1), until: () => dkey(1) },
  { key: '7d', label: '7D', since: () => dkey(6), until: () => dkey(0) },
  { key: 'month', label: 'This month', since: () => istMonthStart(), until: () => dkey(0) },
]

/** Resolve a period key to its window definition, defaulting to Today. */
export function resolvePeriod(key) {
  return LEADERBOARD_PERIODS.find((option) => option.key === key) ?? LEADERBOARD_PERIODS[0]
}

// Same-route href that flips one tab param while keeping the others (so the dashboard's
// chart `range` and the leaderboard period can coexist without clobbering each other).
function tabHref(basePath, paramName, key, currentParams) {
  const params = new URLSearchParams(currentParams)
  params.set(paramName, key)
  return `${basePath}?${params.toString()}`
}

export async function LeaderboardSection({
  userId,
  periodKey,
  basePath,
  paramName = 'period',
  currentParams = {},
  limit,
}) {
  const period = resolvePeriod(periodKey)
  const supabase = await createClient()
  const { data: rows } = await supabase.rpc('leaderboard_between', {
    since_date: period.since(),
    until_date: period.until(),
  })

  // RPC returns rows pre-sorted by steps desc; rank is the 1-based position.
  const ranked = (rows ?? []).map((row, i) => ({
    id: row.id,
    name: row.full_name ?? 'Anonymous',
    avatar: row.avatar_url,
    steps: Number(row.total_steps) || 0,
    rank: i + 1,
  }))
  // Hide zero-step users, except yourself (so you always see your own row).
  const visible = ranked.filter((entry) => entry.steps > 0 || entry.id === userId)
  const shown = limit ? visible.slice(0, limit) : visible
  const anySteps = ranked.some((entry) => entry.steps > 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
        {LEADERBOARD_PERIODS.map((option) => {
          const active = option.key === period.key
          return (
            <Link
              key={option.key}
              href={tabHref(basePath, paramName, option.key, currentParams)}
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

      {!anySteps ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No steps on the leaderboard yet — sync to get on the board.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="w-10"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Steps</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((entry) => {
              const isYou = entry.id === userId
              return (
                <TableRow key={entry.id} className={cn(isYou && 'bg-muted/50')}>
                  <TableCell className="text-center font-medium text-muted-foreground tabular-nums">
                    {entry.rank}
                  </TableCell>
                  <TableCell>
                    <Avatar size="sm">
                      {entry.avatar ? <AvatarImage src={entry.avatar} alt="" /> : null}
                      <AvatarFallback>{(entry.name?.[0] ?? '?').toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.name}
                    {isYou && <span className="text-muted-foreground"> (you)</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.steps.toLocaleString()}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
