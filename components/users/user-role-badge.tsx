import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { isValidRoleCode, ROLE_LABELS, type RoleCode } from "@/lib/access"
import { cn } from "@/lib/utils"

export const userRoleBadgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
  {
    variants: {
      roleVariant: {
        admin:
          "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
        marketing:
          "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
        placement:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        claim:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        accounting:
          "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
        finance:
          "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
        fallback: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      roleVariant: "fallback",
    },
  }
)

export interface UserRoleBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof userRoleBadgeVariants> {
  role: RoleCode | string
}

export function UserRoleBadge({
  role,
  className,
  ...props
}: UserRoleBadgeProps) {
  const isKnown = isValidRoleCode(role)
  const roleVariant = isKnown ? role : "fallback"
  const label = isKnown ? ROLE_LABELS[role] : role

  return (
    <span
      className={cn(userRoleBadgeVariants({ roleVariant }), className)}
      {...props}
    >
      {label}
    </span>
  )
}

