"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { MonthlyProductionRow } from "@/lib/data"

const config = {
  premium: { label: "Premium (jt)", color: "var(--chart-1)" },
  brokerage: { label: "Brokerage (jt)", color: "var(--chart-2)" },
} satisfies ChartConfig

export function ProductionTrend({ data }: { data: MonthlyProductionRow[] }) {
  return (
    <ChartContainer config={config} className="h-[280px] w-full">
      <BarChart data={data} margin={{ left: -8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={11}
          width={44}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="premium"
          fill="var(--color-premium)"
          radius={[6, 6, 0, 0]}
          maxBarSize={26}
        />
        <Bar
          dataKey="brokerage"
          fill="var(--color-brokerage)"
          radius={[6, 6, 0, 0]}
          maxBarSize={26}
        />
      </BarChart>
    </ChartContainer>
  )
}
