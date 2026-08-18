"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"

export function DocumentShell({
  backHref,
  children,
}: {
  backHref: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 p-4 md:p-6">
      <div className="no-print flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          render={<Link href={backHref} />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          Print / Save PDF
        </Button>
      </div>

      <article className="print-sheet rounded-2xl border bg-card p-8 text-card-foreground shadow-sm md:p-12">
        {children}
      </article>

      <p className="no-print pb-6 text-center text-xs text-muted-foreground">
        Halaman ini dioptimalkan untuk cetak A4 — margin, page break, dan elemen
        non-cetak sudah diatur.
      </p>
    </div>
  )
}
