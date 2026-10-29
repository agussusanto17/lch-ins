import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { isValidRoleCode, ROLE_LABELS, type RoleCode } from "@/lib/access"
import { cn } from "@/lib/utils"

export const userRoleBadgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center rounded-4xl px-2 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      roleVariant: {
        admin:
          "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
        marketing:
          "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
        placement:
          "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        claim:
          "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        accounting:
          "bg-teal-500/10 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
        finance:
          "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
        fallback: "bg-muted text-muted-foreground",
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

