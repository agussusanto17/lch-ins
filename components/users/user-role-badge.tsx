import { ROLE_LABELS, type RoleCode } from "@/lib/access"
import { cn } from "@/lib/utils"

const ROLE_STYLES: Record<RoleCode, { bg: string; text: string; border: string }> = {
  admin: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500/30",
  },
  marketing: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
  },
  placement: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
  },
  claim: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
  },
  accounting: {
    bg: "bg-teal-500/10 dark:bg-teal-500/20",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-500/30",
  },
  finance: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
  },
}

export function UserRoleBadge({
  role,
  className,
}: {
  role: RoleCode | string
  className?: string
}) {
  const code = role as RoleCode
  const style = ROLE_STYLES[code] ?? {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  }
  const label = ROLE_LABELS[code] ?? role

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      {label}
    </span>
  )
}
