export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 bg-muted rounded-lg w-44 mb-2" />
      <div className="h-4 bg-muted rounded w-56 mb-6" />

      {/* 4 tabs */}
      <div className="flex bg-muted rounded-full p-1 mb-3 max-w-[600px]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-8 bg-muted-foreground/10 rounded-full mx-0.5" />
        ))}
      </div>
      <div className="h-3 bg-muted rounded w-36 mb-6" />

      {/* Leaderboard rows — rank icon + avatar + name + steps */}
      <div className="flex flex-col gap-3 max-w-[600px]">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl flex items-center gap-4 px-4">
            <div className="w-8 h-8 bg-muted-foreground/10 rounded-full flex-shrink-0" />
            <div className="w-9 h-9 bg-muted-foreground/10 rounded-full flex-shrink-0" />
            <div className="flex-1 h-4 bg-muted-foreground/10 rounded" />
            <div className="w-20 h-4 bg-muted-foreground/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
