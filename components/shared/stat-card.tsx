import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  className,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: LucideIcon
  trend?: { value: string; direction: "up" | "down" }
  className?: string
}) {
  return (
    <Card className={cn("gap-3 px-5 py-4", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        <span className="text-[11px] font-medium tracking-[0.05em] uppercase">
          {label}
        </span>
      </div>
      <p className="tabular text-[26px] leading-none font-semibold tracking-tight">
        {value}
      </p>
      {trend || sub ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                trend.direction === "up" ? "text-success" : "text-destructive"
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {trend.value}
            </span>
          ) : null}
          {sub ? (
            <span className="truncate text-xs text-muted-foreground">
              {sub}
            </span>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
