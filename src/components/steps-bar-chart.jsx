'use client'

/**
 * Steps bar chart — Recharts BarChart wrapped in shadcn ChartContainer.
 * Expects data as `[{ date: string, steps: number }]` (last 7 days, oldest first).
 * Must be a Client Component because Recharts uses browser APIs (ResizeObserver).
 * Y-axis values ≥ 1000 are formatted as "Xk" to save horizontal space.
 * Bar fill and tooltip colours come from CSS variables so they adapt to dark mode.
 */
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

const chartConfig = {
  steps: {
    label: 'Steps',
    color: 'var(--color-primary)',
  },
}

export function StepsBarChart({ data }) {
  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          width={32}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [value.toLocaleString(), 'Steps']}
            />
          }
        />
        <Bar dataKey="steps" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
