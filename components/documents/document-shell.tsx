"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSyncExternalStore } from "react"
import { ArrowLeft, Printer, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LchLogo } from "@/components/documents/letterhead"
import { PrintedAt } from "@/components/documents/printed-at"
import { hasAppShellHistory } from "@/lib/app-shell-history"
import { repeatsPrintHeaderFooter } from "@/lib/print-support"

const noSubscribe = () => () => {}

export function DocumentShell({
  backHref,
  children,
  wide = false,
  letterhead = true,
}: {
  backHref: string
  children: React.ReactNode
  /** Dokumen tabel lebar (misal rekap sheet Excel) memakai kontainer lebih longgar. */
  wide?: boolean
  /** False drops the repeating LCH logo; the top spacer stays as the page margin. */
  letterhead?: boolean
}) {
  // Server dan render pertama menganggap browser mendukung, jadi tidak ada
  // hydration mismatch; peringatan baru muncul setelah user agent terbaca.
  const router = useRouter()
  const repeatsHeaderFooter = useSyncExternalStore(
    noSubscribe,
    () => repeatsPrintHeaderFooter(navigator.userAgent),
    () => true
  )

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-4 px-4 pb-4 md:px-6 md:pb-6 print:m-0 print:p-0 print:max-w-none print:w-full",
        wide ? "max-w-[1100px]" : "max-w-[900px]"
      )}
    >
      <div className="no-print sticky top-0 z-10 -mx-4 flex items-center justify-between bg-muted/50 px-4 py-3 backdrop-blur-sm md:-mx-6 md:px-6">
        <Button
          variant="outline"
          size="sm"
          render={<Link href={backHref} />}
          nativeButton={false}
          onClick={(event) => {
            // Browser back restores the app page from the router cache, with no
            // refetch or loading skeleton; a fresh Link navigation does both.
            if (!hasAppShellHistory()) return
            event.preventDefault()
            router.back()
          }}
        >
          <ArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
        <div className="flex items-center gap-3">
          {repeatsHeaderFooter ? null : (
            <p className="flex max-w-xs items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              Safari hanya mencetak kop dan footer sekali. Cetak lewat Chrome
              atau Edge supaya muncul di setiap halaman.
            </p>
          )}
          <Button size="sm" onClick={() => window.print()}>
            <Printer data-icon="inline-start" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      <article className="print-sheet rounded-2xl border bg-card p-8 text-card-foreground shadow-sm md:p-12 overflow-x-auto print:overflow-visible">
        {/* Header berulang di setiap halaman cetak */}
        {letterhead ? (
          <div className="print-header-fixed hidden print:block">
            <LchLogo className="h-14 w-auto" />
          </div>
        ) : null}

        {/* Footer navy berulang di setiap halaman cetak */}
        <div className="print-footer-fixed hidden print:block">
          <PrintedAt isPrintFixed />
        </div>

        {/* Tabel layout cetak: thead/tfoot spacer otomatis memberi ruang kosong di setiap halaman */}
        {/* table-fixed keeps wide content from stretching the cell past the card on narrow screens. */}
        <table className="print-page-table w-full table-fixed border-collapse">
          <thead className="hidden print:table-header-group">
            <tr>
              <td className="print-header-spacer border-0 p-0"></td>
            </tr>
          </thead>
          <tfoot className="hidden print:table-footer-group">
            <tr>
              <td className="print-footer-spacer border-0 p-0"></td>
            </tr>
          </tfoot>
          <tbody className="print:table-row-group">
            <tr>
              <td className="border-0 p-0 align-top print:px-[18mm]">
                {children}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Screen footer sits outside the table so it always spans the full card width. */}
        <PrintedAt />
      </article>

      <p className="no-print pb-6 text-center text-xs text-muted-foreground">
        Halaman ini dioptimalkan untuk cetak A4 — margin, page break, dan elemen
        non-cetak sudah diatur.
      </p>
    </div>
  )
}
