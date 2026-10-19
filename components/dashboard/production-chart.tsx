"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { MonthlyProductionRow } from "@/lib/data"

const config = {
  premium: { label: "Premium", color: "var(--chart-1)" },
  brokerage: { label: "Brokerage", color: "var(--chart-2)" },
} satisfies ChartConfig

export function ProductionChart({
  data,
  showBrokerage = true,
}: {
  data: MonthlyProductionRow[]
  showBrokerage?: boolean
}) {
  return (
    <ChartContainer config={config} className="h-[330px] w-full">
      <AreaChart data={data} margin={{ left: -8, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillPremium" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-premium)"
              stopOpacity={0.28}
            />
            <stop
              offset="100%"
              stopColor="var(--color-premium)"
              stopOpacity={0.02}
            />
          </linearGradient>
          <linearGradient id="fillBrokerage" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-brokerage)"
              stopOpacity={0.24}
            />
            <stop
              offset="100%"
              stopColor="var(--color-brokerage)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
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
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value, name) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground capitalize">
                    {name}
                  </span>
                  <span className="tabular font-medium">
                    Rp {Number(value).toLocaleString("id-ID")} jt
                  </span>
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="premium"
          type="monotone"
          stroke="var(--color-premium)"
          strokeWidth={2}
          fill="url(#fillPremium)"
        />
        {showBrokerage ? (
          <Area
            dataKey="brokerage"
            type="monotone"
            stroke="var(--color-brokerage)"
            strokeWidth={2}
            fill="url(#fillBrokerage)"
          />
        ) : null}
      </AreaChart>
    </ChartContainer>
  )
}
