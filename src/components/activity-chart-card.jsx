'use client'

/**
 * Activity card with a range toggle. Switching range is a transition so the chart dims
 * + shows a spinner while the new range's data loads (no full page reload).
 */
import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StepsAreaChart } from '@/components/charts'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function ActivityChartCard({ data, total, avg, rangeKey, ranges }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Push the new range to the URL (the server refetches), preserving any other params
  // (e.g. the leaderboard's ?lb=) so they don't reset. scroll:false keeps the viewport put.
  const select = (key) => {
    if (key === rangeKey) return
    const params = new URLSearchParams(searchParams)
    params.set('range', key)
    startTransition(() => router.push(`/dashboard?${params.toString()}`, { scroll: false }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          {total.toLocaleString()} steps · {avg.toLocaleString()}/day avg
        </CardDescription>
        <CardAction>
          <div className="bg-muted flex gap-0.5 rounded-lg p-0.5">
            {ranges.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => select(option.key)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  option.key === rangeKey
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className={cn('transition-opacity duration-200', isPending && 'opacity-40')}>
            <StepsAreaChart data={data} />
          </div>
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="border-muted border-t-foreground size-5 animate-spin rounded-full border-2"
                role="status"
                aria-label="Loading"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
