'use client'

import { Bar, BarChart, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const chartConfig = { steps: { label: 'Steps', color: 'var(--color-primary)' } }

// Show label only at the 7 major tick positions (every 8 slots = every 4h)
const TICK_LABELS = { 0: '12am', 8: '4am', 16: '8am', 24: '12pm', 32: '4pm', 40: '8pm', 47: '12am' }

function CustomTick({ x, y, payload }) {
  const label = TICK_LABELS[payload.value]
  if (!label) return null
  return (
    <text x={x} y={y + 14} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10}>
      {label}
    </text>
  )
}

export function DayStepsChart({ data }) {
  return (
    <ChartContainer config={chartConfig} className="h-44 w-full">
      <BarChart data={data} barCategoryGap="15%" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="index"
          type="number"
          domain={[0, 47]}
          ticks={[0, 8, 16, 24, 32, 40, 47]}
          tick={<CustomTick />}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          interval={0}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [value.toLocaleString(), 'Steps']}
              labelFormatter={(label) => {
                const h = Math.floor(label / 2)
                const m = label % 2 === 0 ? '00' : '30'
                const ampm = h >= 12 ? 'PM' : 'AM'
                const h12 = h % 12 || 12
                return `${h12}:${m} ${ampm}`
              }}
            />
          }
        />
        <Bar dataKey="steps" fill="var(--color-primary)" radius={[2, 2, 0, 0]} maxBarSize={12} />
      </BarChart>
    </ChartContainer>
  )
}
