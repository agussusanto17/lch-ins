"use client"

import Link from "next/link"
import { ArrowLeft, ChevronsDownUp, ChevronsUpDown } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const ROW = "mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 md:px-6"

/**
 * Toolbar sticky di bawah topbar aplikasi. Menahan identitas slip (judul,
 * nomor, status, angka kunci) tetap terlihat selama form panjang di-scroll.
 */
export function SlipFormToolbar({
  title,
  subtitle,
  status,
  slipNo,
  meta,
  backHref,
  allOpen,
  onToggleAll,
}: {
  title: string
  subtitle: string
  status: string
  slipNo: string | null
  meta?: React.ReactNode
  backHref: string
  allOpen?: boolean
  onToggleAll?: () => void
}) {
  return (
    <div className="sticky top-(--topbar-h) z-10 border-b bg-background/95 backdrop-blur-sm">
      <div className={cn(ROW, "h-(--subbar-h)")}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Kembali"
          render={<Link href={backHref} />}
          nativeButton={false}
        >
          <ArrowLeft />
        </Button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {slipNo ? (
              <span className="tabular font-medium text-primary">{slipNo}</span>
            ) : (
              "Nomor digenerate saat release"
            )}
            <span className="mx-1.5">·</span>
            {subtitle}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {meta ? (
            <span className="hidden text-xs text-muted-foreground lg:inline">
              {meta}
            </span>
          ) : null}
          {meta && onToggleAll ? (
            <Separator orientation="vertical" className="hidden h-4 lg:block" />
          ) : null}
          {onToggleAll ? (
            <Button variant="outline" size="sm" onClick={onToggleAll}>
              {allOpen ? (
                <ChevronsDownUp data-icon="inline-start" />
              ) : (
                <ChevronsUpDown data-icon="inline-start" />
              )}
              <span className="max-sm:hidden">
                {allOpen ? "Tutup semua" : "Buka semua"}
              </span>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Action bar sticky di dasar viewport. */
export function SlipFormActions({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur-sm">
      <div className={cn(ROW, "flex-wrap gap-2 py-3", className)}>
        {children}
      </div>
    </div>
  )
}

/** Wrapper konten di antara kedua bar sticky. */
export function SlipFormBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 md:px-6">
      {children}
    </div>
  )
}
