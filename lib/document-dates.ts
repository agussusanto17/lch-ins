/**
 * Placing Slip bertanggal release, Quotation Slip quoted, CI dan Draft Cover Note closing.
 * Tanggal bisa diubah manual untuk dokumen lama (Harry, 10 November 2026).
 */

import { todayIso } from "@/lib/date"
import type { SlipStatus } from "@/lib/data/types"

export type SlipDocumentKind = "placing" | "quotation" | "coverNote" | "closing"

export type LetterheadVariant = "lch" | "lestari"

/** Tanggal dokumen yang tersimpan di slip, format "YYYY-MM-DD". */
export interface SlipDocumentDates {
  releaseDate?: string | null
  quotedDate?: string | null
  closingDate?: string | null
}

/**
 * Hari pertama kop PT. LCH Insurance Brokers (KEP-474/PD.02/2025).
 * Dokumen sebelumnya memakai kop Lestari Cipta Hokindo.
 */
export const LCH_LETTERHEAD_FROM = "2025-09-01"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Nama perusahaan di blok tanda tangan, mengikuti kop dokumennya. */
export const LETTERHEAD_COMPANY: Record<LetterheadVariant, string> = {
  lch: "PT. LCH Insurance Brokers",
  lestari: "PT. Lestari Cipta Hokindo",
}

/** Kop yang dipakai dokumen bertanggal `date` ("YYYY-MM-DD"). */
export function letterheadFor(date: string): LetterheadVariant {
  return date < LCH_LETTERHEAD_FROM ? "lestari" : "lch"
}

/**
 * Tanggal cetak dokumen ("YYYY-MM-DD", WIB). Slip yang belum sampai tahap dokumennya, misalnya
 * draft yang dibuka sebagai Placing Slip, memakai tanggal terakhir disimpan.
 */
export function slipDocumentDate(
  slip: SlipDocumentDates & { updatedAt: string },
  kind: SlipDocumentKind
): string {
  const own =
    kind === "placing"
      ? slip.releaseDate
      : kind === "quotation"
        ? slip.quotedDate
        : slip.closingDate
  if (own && ISO_DATE.test(own)) return own
  const saved = new Date(slip.updatedAt)
  return Number.isNaN(saved.getTime()) ? todayIso() : todayIso(saved)
}

const REACHED: Record<SlipStatus, (keyof SlipDocumentDates)[]> = {
  Draft: [],
  Released: ["releaseDate"],
  Quoted: ["quotedDate"],
  // Slip yang langsung di-closing tanpa quotation tetap dapat tanggal quoted,
  // supaya Quotation Slip dan Draft Cover Note-nya tidak ikut berubah tanggal.
  Closed: ["quotedDate", "closingDate"],
  Cancelled: [],
}

/**
 * Tanggal yang terisi otomatis saat status berpindah, hanya kolom yang masih kosong, jadi
 * tanggal yang diketik manual tetap dipakai.
 */
export function documentDatesForStatus(
  dates: SlipDocumentDates,
  from: SlipStatus,
  to: SlipStatus,
  today: string
): SlipDocumentDates {
  if (from === to) return {}
  const patch: SlipDocumentDates = {}
  for (const key of REACHED[to]) {
    if (!dates[key]) patch[key] = today
  }
  return patch
}
