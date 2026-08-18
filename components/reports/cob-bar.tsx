"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { compactMoney } from "@/lib/format"

const config = {
  premium: { label: "Premium", color: "var(--chart-1)" },
} satisfies ChartConfig

export function CobBar({ data }: { data: { cob: string; premium: number }[] }) {
  return (
    <ChartContainer config={config} className="h-[300px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(v) => compactMoney(Number(v))}
        />
        <YAxis
          type="category"
          dataKey="cob"
          tickLine={false}
          axisLine={false}
          width={116}
          fontSize={11}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => (
                <span className="tabular font-medium">
                  Rp {compactMoney(Number(value))}
                </span>
              )}
            />
          }
        />
        <Bar
          dataKey="premium"
          fill="var(--color-premium)"
          radius={[0, 6, 6, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ChartContainer>
  )
}
