'use client'

/**
 * Error boundary for the authenticated area — shows a friendly message with a retry
 * instead of a blank screen when a page throws.
 */
import { Button } from '@/components/ui/button'

export default function AppError({ reset }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          We couldn&apos;t load this page. Please try again.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
