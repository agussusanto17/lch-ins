/**
 * Export tabel ke Excel (.xlsx) dan CSV dari browser (PRD A-20). ExcelJS dimuat saat
 * tombol diklik supaya ±900 KB library tidak ikut bundle awal.
 */

import type { Workbook } from "exceljs"

export type ExportCellType = "text" | "number" | "money" | "percent" | "date"

export interface ExportColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
  type?: ExportCellType
  width?: number
  /** Format angka Excel khusus kolom ini, misalnya "0.00%"; kosong berarti format bawaan `type`. */
  numFmt?: string
}

export interface ExportSpec<T> {
  /** Nama file tanpa ekstensi, misalnya "polis-lch". */
  filename: string
  sheet?: string
  columns: ExportColumn<T>[]
  rows: T[]
  /** Fetches the full set at click time when `rows` holds only the visible page. */
  loadRows?: () => Promise<T[]>
}

function stamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Beri waktu browser memulai unduhan sebelum URL dilepas.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function csvCell(value: string | number | null | undefined) {
  if (value == null) return ""
  const text = String(value)
  // Cegah formula injection saat CSV dibuka di Excel.
  const safe =
    /^[=+\-@\t\r]/.test(text) && typeof value === "string" ? `'${text}` : text
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function exportCsv<T>(spec: ExportSpec<T>) {
  const lines = [
    spec.columns.map((c) => csvCell(c.header)).join(","),
    ...spec.rows.map((row) =>
      spec.columns.map((c) => csvCell(c.value(row))).join(",")
    ),
  ]
  // BOM supaya Excel membaca UTF-8 dengan benar.
  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  })
  download(blob, `${spec.filename}-${stamp()}.csv`)
}

const NUM_FMT: Partial<Record<ExportCellType, string>> = {
  number: "#,##0",
  money: "#,##0.00",
  percent: "0.00##",
  // Tanpa format eksplisit ExcelJS memakai format tanggal bawaan yang ikut locale komputer.
  date: "dd/mm/yyyy",
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Tanggal sebagai tengah malam UTC. ExcelJS menyimpan Date sebagai serial UTC, jadi tengah malam
 * waktu lokal di browser WIB tersimpan sebagai pukul 17.00 hari sebelumnya dan tampil mundur
 * sehari. Nilai berjam (updatedAt ISO) memakai tanggal lokalnya, sama dengan tampilan tabel.
 */
function excelDate(value: string) {
  if (DATE_ONLY.test(value)) return new Date(`${value}T00:00:00.000Z`)
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

/**
 * Tambahkan satu sheet tabel ke workbook ExcelJS: header tebal, baris header dibekukan, dan
 * filter. Dipakai export satu sheet dan report yang filenya berisi beberapa sheet.
 */
export function addExportSheet<T>(workbook: Workbook, spec: Omit<ExportSpec<T>, "filename">) {
  const sheet = workbook.addWorksheet(spec.sheet ?? "Data", {
    views: [{ state: "frozen", ySplit: 1 }],
  })
  sheet.columns = spec.columns.map((c, i) => {
    const numFmt = c.numFmt ?? NUM_FMT[c.type ?? "text"]
    return {
      header: c.header,
      key: `c${i}`,
      width: c.width ?? Math.min(Math.max(c.header.length + 4, 12), 48),
      style: numFmt ? { numFmt } : {},
    }
  })
  for (const row of spec.rows) {
    sheet.addRow(
      Object.fromEntries(
        spec.columns.map((c, i) => {
          const value = c.value(row)
          if (c.type === "date" && typeof value === "string" && value) {
            return [`c${i}`, excelDate(value)]
          }
          return [`c${i}`, value ?? ""]
        })
      )
    )
  }
  sheet.getRow(1).font = { bold: true }
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: spec.columns.length },
  }
  return sheet
}

export async function exportXlsx<T>(spec: ExportSpec<T>) {
  const { default: ExcelJS } = await import("exceljs")
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "PT. LCH Insurance Brokers"
  workbook.created = new Date()
  addExportSheet(workbook, spec)
  await downloadWorkbook(workbook, spec.filename)
}

/** Unduh workbook ExcelJS sebagai .xlsx; nama file diberi tanggal unduh seperti export tabel. */
export async function downloadWorkbook(
  workbook: { xlsx: { writeBuffer(): Promise<ArrayBuffer | Uint8Array> } },
  filename: string
) {
  const buffer = await workbook.xlsx.writeBuffer()
  download(
    new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${filename}-${stamp()}.xlsx`
  )
}
