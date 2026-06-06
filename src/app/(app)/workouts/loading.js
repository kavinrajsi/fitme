/** Loading skeleton for /workouts — placeholder rows for the sessions table. */
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Loading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1fr_4rem_4rem_4rem_4rem] items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12 justify-self-end" />
            <Skeleton className="h-3 w-12 justify-self-end" />
            <Skeleton className="h-3 w-10 justify-self-end" />
            <Skeleton className="h-3 w-12 justify-self-end" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
