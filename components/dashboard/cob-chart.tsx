"use client"

import { Cell, Pie, PieChart } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { compactMoney } from "@/lib/format"

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.62 0.13 240)",
  "oklch(0.72 0.12 140)",
  "oklch(0.68 0.11 40)",
]

export function CobChart({
  data,
}: {
  data: { cob: string; premium: number }[]
}) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.cob,
      { label: d.cob, color: PALETTE[i % PALETTE.length] },
    ])
  )
  const total = data.reduce((a, d) => a + d.premium, 0)

  return (
    <div className="flex flex-col items-center gap-4">
      <ChartContainer config={config} className="aspect-square h-[190px]">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="tabular font-medium">
                      Rp {compactMoney(Number(value))}
                    </span>
                  </span>
                )}
              />
            }
          />
          <Pie
            data={data}
            dataKey="premium"
            nameKey="cob"
            innerRadius={52}
            outerRadius={82}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((d, i) => (
              <Cell key={d.cob} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="grid w-full gap-1.5">
        {data.map((d, i) => (
          <li key={d.cob} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="truncate">{d.cob}</span>
            <span className="tabular ml-auto text-xs text-muted-foreground">
              {total ? Math.round((d.premium / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
