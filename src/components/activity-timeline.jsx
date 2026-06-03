export function ActivityTimeline({ slots }) {
  const maxSteps = Math.max(...slots.map((s) => s.steps), 1)

  return (
    <div className="flex flex-col gap-4 py-1">
      {slots.map(({ time, steps }) => {
        const pct = Math.round((steps / maxSteps) * 100)
        const isPast = steps > 0
        return (
          <div key={time} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-9 text-right flex-shrink-0 tabular-nums">
              {time}
            </span>
            <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
              {pct > 0 && (
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>
            <span className={`text-xs tabular-nums w-20 text-right flex-shrink-0 ${isPast ? 'font-medium' : 'text-muted-foreground'}`}>
              {steps > 0 ? steps.toLocaleString() : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
