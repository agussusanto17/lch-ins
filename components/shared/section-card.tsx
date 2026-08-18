"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Ringkasan singkat yang tetap terlihat saat section ditutup. */
  summary?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  collapsible?: boolean
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SectionCard({
  title,
  description,
  summary,
  action,
  children,
  className,
  contentClassName,
  collapsible,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
}: SectionCardProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolled

  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }

  const heading = (
    <div className="min-w-0">
      <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )

  if (!collapsible || !title) {
    return (
      <Card className={cn("gap-0", className)}>
        {title ? (
          <CardHeader className="flex-wrap items-center gap-x-4 gap-y-2 border-b pb-4">
            {heading}
            {action ? (
              <CardAction className="self-center">{action}</CardAction>
            ) : null}
          </CardHeader>
        ) : null}
        <CardContent className={cn("pt-5", contentClassName)}>
          {children}
        </CardContent>
      </Card>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn("gap-0", className)}>
        <CardHeader
          className={cn(
            "grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 transition-[padding]",
            open ? "border-b pb-4" : "pb-0"
          )}
        >
          <CollapsibleTrigger
            render={<button type="button" />}
            className="-my-1 flex min-w-0 cursor-pointer items-center gap-2 py-1 text-left hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
                !open && "-rotate-90"
              )}
            />
            {heading}
          </CollapsibleTrigger>
          <CardAction className="flex items-center gap-3 self-center">
            {summary ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {summary}
              </span>
            ) : null}
            {action}
          </CardAction>
        </CardHeader>
        <CollapsibleContent className="overflow-hidden data-open:animate-collapse-down data-closed:animate-collapse-up">
          <CardContent className={cn("pt-5", contentClassName)}>
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
