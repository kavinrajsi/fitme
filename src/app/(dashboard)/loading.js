export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 bg-muted rounded-lg w-56 mb-2" />
      <div className="h-4 bg-muted rounded w-40 mb-8" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-muted rounded-xl" />
        ))}
      </div>

      {/* Goal progress bar */}
      <div className="h-3 bg-muted rounded-full mb-1.5" />
      <div className="h-3 bg-muted rounded w-24 mb-6" />

      {/* Streak card */}
      <div className="h-40 bg-muted rounded-xl mb-6" />

      {/* Badges row */}
      <div className="flex gap-2 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-7 w-28 bg-muted rounded-full" />
        ))}
      </div>

      {/* Steps chart */}
      <div className="h-6 bg-muted rounded w-36 mb-4" />
      <div className="h-52 bg-muted rounded-xl mb-8" />

      {/* Leaderboard */}
      <div className="h-6 bg-muted rounded w-28 mb-4" />
      <div className="flex flex-col gap-2 max-w-[600px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}
