"use client"

import { ChevronDown } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

/**
 * Kartu satu lokasi slip Property yang bisa dilipat, karena satu lokasi saja
 * sudah panjang (Agus, 5 November 2026). Ringkasan di kepala kartu tetap
 * terlihat saat terlipat.
 */
export function UnitCard({
  title,
  summary,
  status,
  action,
  open,
  onOpenChange,
  children,
}: {
  title: string
  /** Baris ringkasan di bawah judul. */
  summary?: React.ReactNode
  /** Penanda di samping judul, misalnya "Belum lengkap". */
  status?: React.ReactNode
  /** Tombol di kanan kepala kartu, di luar tombol lipat. */
  action?: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="rounded-xl border"
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <CollapsibleTrigger
          render={<button type="button" />}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150",
              !open && "-rotate-90"
            )}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{title}</span>
              {status}
            </span>
            {summary ? (
              <span className="text-xs text-muted-foreground">{summary}</span>
            ) : null}
          </span>
        </CollapsibleTrigger>
        {action}
      </div>
      <CollapsibleContent className="overflow-hidden data-open:animate-collapse-down data-closed:animate-collapse-up">
        <div className="flex flex-col gap-4 border-t p-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
