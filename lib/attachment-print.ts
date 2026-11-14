/**
 * Lampiran slip ikut tercetak: gambar dan PDF per halaman, Excel sebagai tabel (Harry, 9 November
 * 2026). Hanya tipe dan helper, jadi aman dipakai di client maupun server.
 */
import { INLINE_TYPES, PDF_TYPE, XLSX_TYPE } from "./file-types"

export type AttachmentPrintKind = "image" | "pdf" | "excel"

export interface AttachmentCell {
  text: string
  colSpan?: number
  rowSpan?: number
  bold?: boolean
  /** Angka, dicetak rata kanan. */
  numeric?: boolean
}

export interface AttachmentSheet {
  name: string
  rows: AttachmentCell[][]
  /** Baris atau kolom dipotong karena melebihi batas cetak. */
  truncated: boolean
}

export interface AttachmentPrint {
  kind: AttachmentPrintKind
  /** Isi Excel per sheet, hanya untuk jenis excel. */
  sheets?: AttachmentSheet[]
  /** Pesan bila isinya tidak bisa dibaca. */
  error?: string
}

/** Isi lampiran yang dicetak, per id lampiran slip. */
export type AttachmentPrints = Record<string, AttachmentPrint>

/** Batas tabel Excel yang dicetak, supaya dokumen tidak ratusan halaman. */
export const PRINT_TABLE_LIMITS = { rows: 500, columns: 30 }

/** Jenis cetakan dari jenis berkas yang dibaca server saat unggah. */
export function printKindFor(contentType: string): AttachmentPrintKind | null {
  if (contentType === PDF_TYPE) return "pdf"
  if (contentType === XLSX_TYPE) return "excel"
  if (INLINE_TYPES.includes(contentType)) return "image"
  return null
}
