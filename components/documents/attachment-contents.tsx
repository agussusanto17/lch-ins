"use client"

import * as React from "react"

import { SectionHeading } from "@/components/documents/doc-blocks"
import type { AttachmentPrints, AttachmentSheet } from "@/lib/attachment-print"
import { PRINT_TABLE_LIMITS } from "@/lib/attachment-print"
import type { PlacingSlip, SlipAttachment } from "@/lib/data/types"
import { beginPrintTask } from "@/lib/print-tasks"
import { cn } from "@/lib/utils"

/** PDF lampiran yang lebih panjang dari ini dicetak sebagian saja. */
const MAX_PDF_PAGES = 30

/** Tinggi isi satu halaman A4 di antara kop dan footer cetak. */
const PAGE_IMAGE = "mx-auto block h-auto max-h-[215mm] w-auto max-w-full object-contain"

let worker: Worker | null = null

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist")
  if (!worker) {
    worker = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), {
      type: "module",
    })
    pdfjs.GlobalWorkerOptions.workerPort = worker
  }
  return pdfjs
}

/** Gambar lampiran; tombol cetak menunggu sampai gambarnya termuat. */
function AttachmentImage({ src, alt }: { src: string; alt: string }) {
  const ref = React.useRef<HTMLImageElement>(null)
  React.useEffect(() => {
    const img = ref.current
    if (!img || img.complete) return
    const done = beginPrintTask()
    img.addEventListener("load", done, { once: true })
    img.addEventListener("error", done, { once: true })
    return done
  }, [src])
  // eslint-disable-next-line @next/next/no-img-element -- berkas privat dari /api/files, bukan aset statis
  return <img ref={ref} src={src} alt={alt} className={PAGE_IMAGE} />
}

/**
 * Halaman PDF lampiran dirender menjadi gambar di browser, karena isi PDF di
 * iframe tidak ikut tercetak. Satu halaman PDF menjadi satu halaman cetak.
 */
function PdfPages({ url, title, no }: { url: string; title: string; no: number }) {
  const [pages, setPages] = React.useState<string[]>([])
  const [total, setTotal] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const done = beginPrintTask()
    const urls: string[] = []
    void (async () => {
      try {
        const pdfjs = await loadPdfJs()
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = new Uint8Array(await res.arrayBuffer())
        const doc = await pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false }).promise
        if (cancelled) return
        setTotal(doc.numPages)
        for (let i = 1; i <= Math.min(doc.numPages, MAX_PDF_PAGES); i++) {
          const page = await doc.getPage(i)
          // Skala 2 sekitar 144 dpi, cukup tajam untuk teks hasil scan.
          const viewport = page.getViewport({ scale: 2 })
          const canvas = document.createElement("canvas")
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          await page.render({ canvas, viewport }).promise
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.92)
          )
          page.cleanup()
          if (cancelled || !blob) return
          urls.push(URL.createObjectURL(blob))
          setPages([...urls])
        }
        await doc.destroy()
      } catch (err) {
        console.error("Gagal merender lampiran PDF:", err)
        if (!cancelled) setError("Isi PDF tidak bisa ditampilkan. Buka lampirannya terpisah.")
      } finally {
        done()
      }
    })()
    return () => {
      cancelled = true
      done()
      for (const u of urls) URL.revokeObjectURL(u)
    }
  }, [url])

  if (error) return <Unreadable detail={error} />
  if (!pages.length) {
    return <p className="no-print text-[12px] text-muted-foreground">Menyiapkan isi PDF…</p>
  }
  return (
    <>
      {pages.map((src, i) => (
        <div key={src} className={cn(i > 0 && "print-break mt-6")}>
          {i > 0 ? (
            <p className="mb-2 text-[11px] text-muted-foreground">
              Attachment {no} · page {i + 1} of {total}
            </p>
          ) : null}
          <AttachmentImage src={src} alt={`${title}, page ${i + 1}`} />
        </div>
      ))}
      {total > pages.length && pages.length === MAX_PDF_PAGES ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Only the first {MAX_PDF_PAGES} of {total} pages are printed; see the
          attached file for the rest.
        </p>
      ) : null}
    </>
  )
}

/**
 * Isi yang gagal dibaca: dokumen cetak merujuk ke berkas lampiran, alasannya
 * hanya tampil di layar.
 */
function Unreadable({ detail }: { detail: string }) {
  return (
    <>
      <p className="text-[12px]">See the attached file.</p>
      <p className="no-print mt-1 text-[12px] text-muted-foreground">{detail}</p>
    </>
  )
}

function SheetTable({ sheet, showName }: { sheet: AttachmentSheet; showName: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      {showName ? <p className="text-[12px] font-semibold">{sheet.name}</p> : null}
      <table className="w-full border-collapse text-[10px] leading-snug">
        <tbody>
          {sheet.rows.map((row, r) => (
            <tr key={r} className="break-inside-avoid">
              {row.map((cell, c) => (
                <td
                  key={c}
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  className={cn(
                    "border border-border px-1.5 py-1 align-top whitespace-pre-line break-words",
                    cell.numeric && "text-right tabular-nums",
                    cell.bold && "font-semibold"
                  )}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sheet.truncated ? (
        <p className="text-[11px] text-muted-foreground">
          Only the first {PRINT_TABLE_LIMITS.rows} rows and{" "}
          {PRINT_TABLE_LIMITS.columns} columns are printed; see the attached file
          for the rest.
        </p>
      ) : null}
    </div>
  )
}

function AttachmentContent({
  attachment,
  no,
  prints,
}: {
  attachment: SlipAttachment
  no: number
  prints: AttachmentPrints
}) {
  const print = prints[attachment.id]
  const title = attachment.description || attachment.fileName
  if (!print || !attachment.url) return null
  return (
    <section className="print-break">
      <SectionHeading>
        ATTACHMENT {no}: {title.toUpperCase()}
      </SectionHeading>
      {print.error ? (
        <Unreadable detail={print.error} />
      ) : print.kind === "image" ? (
        <AttachmentImage src={attachment.url} alt={title} />
      ) : print.kind === "pdf" ? (
        <PdfPages url={attachment.url} title={title} no={no} />
      ) : (
        <div className="flex flex-col gap-4">
          {(print.sheets ?? []).map((sheet, i) => (
            <SheetTable
              key={`${sheet.name}-${i}`}
              sheet={sheet}
              showName={(print.sheets ?? []).length > 1}
            />
          ))}
          {!print.sheets?.length ? <Unreadable detail="Workbook ini kosong." /> : null}
        </div>
      )}
    </section>
  )
}

/**
 * Isi lampiran yang dicentang Cetak isi, di halaman akhir dokumen (Harry, 9 November 2026).
 * Nomornya sama dengan daftar ATTACHMENTS.
 */
export function AttachmentContents({
  slip,
  prints,
}: {
  slip: PlacingSlip
  prints?: AttachmentPrints
}) {
  const list = slip.attachments ?? []
  if (!prints || !list.some((a) => prints[a.id])) return null
  return (
    <>
      {list.map((a, i) => (
        <AttachmentContent key={a.id} attachment={a} no={i + 1} prints={prints} />
      ))}
    </>
  )
}
