import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Tone = "neutral" | "info" | "success" | "warning" | "danger"

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
}

const STATUS_TONE: Record<string, Tone> = {
  /* slip */
  Draft: "neutral",
  Released: "info",
  Quoted: "warning",
  Closed: "success",
  /* policy */
  Active: "success",
  Expiring: "warning",
  Expired: "danger",
  /* client */
  Prospect: "info",
  Inactive: "neutral",
  /* policy type */
  Baru: "info",
  Renewal: "success",
  /* claim */
  Open: "warning",
  "Dokumen Lengkap": "info",
  "Proses Adjuster": "info",
  Approved: "success",
  Paid: "success",
  Rejected: "danger",
}

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const tone = STATUS_TONE[status] ?? "neutral"
  return (
    <Badge
      variant="secondary"
      className={cn("border-0", TONE_CLASS[tone], className)}
    >
      {status}
    </Badge>
  )
}

export function ToneBadge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-0", TONE_CLASS[tone], className)}
    >
      {children}
    </Badge>
  )
}
