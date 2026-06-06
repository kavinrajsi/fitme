'use client'

/**
 * Recharts wrappers (base-nova ChartContainer) for the dashboard: a steps area chart,
 * an intraday hourly bar chart, and a generic metric trend line.
 */
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

// Shared axis/tooltip date formatter, e.g. "Jan 5".
const fmtDay = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

// Daily steps as a filled area; `data` is [{ date, steps }].
export function StepsAreaChart({ data }) {
  return (
    <ChartContainer
      config={{ steps: { label: 'Steps', color: 'var(--chart-1)' } }}
      className="aspect-auto h-[220px] w-full"
    >
      <AreaChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={fmtDay}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={fmtDay} />} />
        <Area
          dataKey="steps"
          type="natural"
          fill="var(--color-steps)"
          fillOpacity={0.4}
          stroke="var(--color-steps)"
        />
      </AreaChart>
    </ChartContainer>
  )
}

// Intraday steps as bars; `data` is [{ label, steps }] per hour (axis labels every 4th).
export function HourlyStepsChart({ data }) {
  return (
    <ChartContainer
      config={{ steps: { label: 'Steps', color: 'var(--chart-1)' } }}
      className="aspect-auto h-[180px] w-full"
    >
      <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={3} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="steps" fill="var(--color-steps)" radius={3} />
      </BarChart>
    </ChartContainer>
  )
}

// Generic single-metric line (weight, heart rate, …); `dataKey` selects the series and
// drives the --color-<dataKey> CSS var. Gaps are bridged with connectNulls.
export function MetricTrendChart({ data, dataKey, label, color = 'var(--chart-2)' }) {
  return (
    <ChartContainer
      config={{ [dataKey]: { label, color } }}
      className="aspect-auto h-[180px] w-full"
    >
      <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={fmtDay}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={fmtDay} />} />
        <Line
          dataKey={dataKey}
          type="monotone"
          stroke={`var(--color-${dataKey})`}
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  )
}
