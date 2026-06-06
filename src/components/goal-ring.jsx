/**
 * SVG progress ring for the daily step goal. Server component (pure SVG).
 */
// `pct` is a 0..1 fraction of the goal; the foreground arc length tracks it via the
// stroke dash offset. `label`/`sublabel` render centered inside the ring.
export function GoalRing({ pct, label, sublabel, size = 148, stroke = 12 }) {
  const clamped = Math.min(Math.max(pct ?? 0, 0), 1)
  // Inset the radius by half the stroke so the ring stays inside the viewBox.
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // Dash array = full circumference; offsetting by the unfilled remainder reveals `pct` of it.
  const offset = circumference * (1 - clamped)
  const center = size / 2

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Rotate -90° so the arc begins at 12 o'clock instead of 3 o'clock. */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-semibold tabular-nums">{label}</span>
        {sublabel && <span className="text-muted-foreground text-xs">{sublabel}</span>}
      </div>
    </div>
  )
}
