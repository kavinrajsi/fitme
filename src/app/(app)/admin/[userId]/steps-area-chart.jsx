'use client'

/**
 * Daily-steps area chart for the admin user-detail page (recharts via the shadcn chart
 * primitives). Client component because recharts renders in the browser; expects
 * chronological { date, steps } points.
 */
import { Activity } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

const chartConfig = {
  steps: {
    label: 'Steps',
    color: 'var(--chart-1)',
    icon: Activity,
  },
}

// "Mon D" axis/tooltip label for a date-only value.
const fmtDay = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

// Card-wrapped step area chart; the description spans the first→last date in `data`.
export function StepsAreaChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily steps</CardTitle>
        <CardDescription>
          {data.length ? `${fmtDay(data[0].date)} – ${fmtDay(data[data.length - 1].date)}` : 'No data'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
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
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={fmtDay} />}
            />
            <Area
              dataKey="steps"
              type="step"
              fill="var(--color-steps)"
              fillOpacity={0.4}
              stroke="var(--color-steps)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
