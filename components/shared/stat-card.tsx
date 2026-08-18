import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
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
    <Card className={cn("gap-0 py-5", className)}>
      <CardContent className="flex items-start justify-between gap-3 px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="tabular mt-2 text-2xl leading-none font-bold tracking-tight">
            {value}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
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
        </div>
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
            <Icon className="size-4.5" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}
