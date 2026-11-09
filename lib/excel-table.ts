/**
 * Isi workbook Excel lampiran slip sebagai tabel cetak, misalnya vessel
 * schedule atau daftar unit. Hanya dipakai di server karena exceljs besar.
 */
import ExcelJS from "exceljs"

import {
  PRINT_TABLE_LIMITS,
  type AttachmentCell,
  type AttachmentSheet,
} from "./attachment-print"

type Value = ExcelJS.CellValue

const pad = (n: number) => String(n).padStart(2, "0")

/** Tanggal Excel tersimpan sebagai UTC; dicetak dd/mm/yyyy seperti Excel Indonesia. */
function formatDate(date: Date, numFmt?: string) {
  const day = `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`
  return /h/i.test(numFmt ?? "")
    ? `${day} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
    : day
}

/** Teks literal format angka, misalnya "USD " dari `"USD "#,##0.00`. */
function literal(part: string) {
  return part.replace(/"([^"]*)"/g, "$1").replace(/[()]/g, "")
}

/**
 * Angka diformat mengikuti format sel: jumlah desimal, pemisah ribuan, persen,
 * dan teks di depan atau belakang angka. Format General dicetak apa adanya,
 * jadi tahun pembuatan tetap 2010, bukan 2.010.
 */
export function formatNumber(value: number, numFmt?: string) {
  const section = (numFmt ?? "").split(";")[0]
  if (!section || /^general$/i.test(section.trim())) {
    return String(Number(value.toPrecision(15)))
  }
  const cleaned = section
    .replace(/\[\$([^\]-]*)(?:-[^\]]*)?\]/g, (_, symbol: string) => (symbol ? `"${symbol}"` : ""))
    .replace(/\[[^\]]*\]/g, "")
    .replace(/_.|\*./g, "")
    .replace(/\\(.)/g, '"$1"')
  const first = cleaned.search(/[0#?]/)
  if (first < 0) return String(Number(value.toPrecision(15)))
  let last = first
  for (let i = first; i < cleaned.length; i++) if (/[0#?.,%]/.test(cleaned[i])) last = i
  const body = cleaned.slice(first, last + 1)
  const percent = body.includes("%")
  const decimals = body.match(/\.([0#?]+)/)?.[1] ?? ""
  const text = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals.replace(/[#?]/g, "").length,
    maximumFractionDigits: decimals.length,
    useGrouping: /[0#?],[0#?]/.test(body),
  }).format(percent ? value * 100 : value)
  return `${literal(cleaned.slice(0, first))}${text}${percent ? "%" : ""}${literal(cleaned.slice(last + 1))}`
}

function plainValue(value: Value): Exclude<Value, object> | Date {
  if (value == null) return null
  if (value instanceof Date) return value
  if (typeof value !== "object") return value
  if ("richText" in value) return value.richText.map((r) => r.text).join("")
  if ("error" in value) return value.error
  if ("hyperlink" in value) {
    const text = value.text as unknown
    if (text && typeof text === "object" && "richText" in text) {
      return (text as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("")
    }
    return typeof text === "string" ? text : value.hyperlink
  }
  if ("result" in value) return plainValue(value.result as Value)
  return null
}

function textOf(value: ReturnType<typeof plainValue>, numFmt?: string) {
  if (value == null) return ""
  if (value instanceof Date) return formatDate(value, numFmt)
  if (typeof value === "number") return formatNumber(value, numFmt)
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE"
  return String(value).trim()
}

/** Hanya atribut yang berisi yang dikirim, supaya data cetak tetap kecil. */
function cellOf(cell: ExcelJS.Cell): AttachmentCell {
  const value = plainValue(cell.value)
  const out: AttachmentCell = { text: textOf(value, cell.numFmt) }
  if (!out.text) return out
  if (typeof value === "number") out.numeric = true
  if (cell.font?.bold === true) out.bold = true
  return out
}

const COLUMN = (letters: string) =>
  [...letters.toUpperCase()].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0)

/** "B2:D3" menjadi batas baris dan kolom. */
function parseRange(range: string) {
  const match = range.match(/^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/i)
  if (!match) return null
  return {
    top: Number(match[2]),
    left: COLUMN(match[1]),
    bottom: Number(match[4]),
    right: COLUMN(match[3]),
  }
}

function sheetTable(ws: ExcelJS.Worksheet): AttachmentSheet | null {
  const cells = new Map<string, AttachmentCell>()
  let top = Infinity
  let left = Infinity
  let bottom = 0
  let right = 0
  ws.eachRow({ includeEmpty: false }, (row, r) => {
    row.eachCell({ includeEmpty: false }, (cell, c) => {
      const value = cellOf(cell)
      if (!value.text) return
      cells.set(`${r}:${c}`, value)
      top = Math.min(top, r)
      left = Math.min(left, c)
      bottom = Math.max(bottom, r)
      right = Math.max(right, c)
    })
  })
  if (!cells.size) return null

  const lastRow = Math.min(bottom, top + PRINT_TABLE_LIMITS.rows - 1)
  const lastCol = Math.min(right, left + PRINT_TABLE_LIMITS.columns - 1)

  // Sel gabungan: sel kiri atas mendapat colSpan/rowSpan, sel lain dilewati.
  const spans = new Map<string, { colSpan: number; rowSpan: number }>()
  const covered = new Set<string>()
  for (const range of ws.model.merges ?? []) {
    const m = parseRange(range)
    if (!m || m.top < top || m.left < left || m.top > lastRow || m.left > lastCol) continue
    const b = Math.min(m.bottom, lastRow)
    const rt = Math.min(m.right, lastCol)
    spans.set(`${m.top}:${m.left}`, { colSpan: rt - m.left + 1, rowSpan: b - m.top + 1 })
    for (let r = m.top; r <= b; r++) {
      for (let c = m.left; c <= rt; c++) {
        if (r !== m.top || c !== m.left) covered.add(`${r}:${c}`)
      }
    }
  }

  const rows: AttachmentCell[][] = []
  for (let r = top; r <= lastRow; r++) {
    const row: AttachmentCell[] = []
    for (let c = left; c <= lastCol; c++) {
      const key = `${r}:${c}`
      if (covered.has(key)) continue
      const cell = { ...(cells.get(key) ?? { text: "" }) }
      const span = spans.get(key)
      if (span?.colSpan && span.colSpan > 1) cell.colSpan = span.colSpan
      if (span?.rowSpan && span.rowSpan > 1) cell.rowSpan = span.rowSpan
      row.push(cell)
    }
    rows.push(row)
  }
  return { name: ws.name, rows, truncated: lastRow < bottom || lastCol < right }
}

/** Sheet yang terlihat dan berisi, sebagai tabel. Sheet tersembunyi dilewati. */
export async function workbookTables(data: ArrayBuffer | Uint8Array): Promise<AttachmentSheet[]> {
  const wb = new ExcelJS.Workbook()
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  await wb.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
  return wb.worksheets
    .filter((ws) => ws.state !== "hidden" && ws.state !== "veryHidden")
    .map(sheetTable)
    .filter((t): t is AttachmentSheet => t !== null)
}
