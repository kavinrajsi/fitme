import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Loading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-44" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[3.5rem_1fr_4rem] items-center gap-3">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-2 rounded-full" style={{ width: `${20 + ((index * 13) % 70)}%` }} />
              <Skeleton className="h-3 w-12 justify-self-end" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
