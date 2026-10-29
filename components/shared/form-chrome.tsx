"use client"

import Link from "next/link"
import { ArrowLeft, ChevronsDownUp, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const ROW = "mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 md:px-6"

/**
 * Toolbar sticky di bawah topbar aplikasi. Menahan identitas record yang
 * sedang diedit tetap terlihat selama form panjang di-scroll.
 */
export function FormToolbar({
  title,
  subtitle,
  badge,
  meta,
  backHref,
  allOpen,
  onToggleAll,
  children,
}: {
  title: string
  subtitle?: React.ReactNode
  badge?: React.ReactNode
  meta?: React.ReactNode
  backHref: string
  allOpen?: boolean
  onToggleAll?: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="bg-background/95 sticky top-(--topbar-h) z-10 border-b backdrop-blur-sm">
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
            {badge}
          </div>
          {subtitle ? <p className="text-muted-foreground truncate text-xs">{subtitle}</p> : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {meta ? <span className="text-muted-foreground hidden text-xs lg:inline">{meta}</span> : null}
          {meta && (onToggleAll || children) ? (
            <Separator orientation="vertical" className="hidden h-4 lg:block" />
          ) : null}
          {onToggleAll ? (
            <Button variant="outline" size="sm" onClick={onToggleAll}>
              {allOpen ? <ChevronsDownUp data-icon="inline-start" /> : <ChevronsUpDown data-icon="inline-start" />}
              <span className="max-sm:hidden">{allOpen ? "Tutup semua" : "Buka semua"}</span>
            </Button>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}

/** Action bar sticky di dasar viewport. */
export function FormActions({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="bg-background/95 sticky bottom-0 z-10 border-t backdrop-blur-sm">
      <div className={cn(ROW, "flex-wrap gap-2 py-3", className)}>{children}</div>
    </div>
  )
}

/**
 * Wrapper konten di antara kedua bar sticky.
 *
 * Latarnya abu-abu tipis supaya kartu section yang putih terbaca sebagai
 * bagian-bagian terpisah; form slip punya delapan section dan di atas latar
 * putih batasnya cuma garis tipis. Di tema gelap latarnya tetap `background`,
 * karena di sana `muted` lebih terang dari kartu dan urutannya jadi terbalik.
 */
export function FormBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 bg-muted dark:bg-background">
      <div className={cn("mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 md:px-6", className)}>
        {children}
      </div>
    </div>
  )
}
