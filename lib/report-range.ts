/**
 * Rentang tanggal bebas untuk Report Operational (Agus, 13 November 2026),
 * di samping periode bulanan, kuartalan, dan tahunan: misalnya satu tahun
 * penuh, tiga bulan, atau beberapa bulan sekaligus.
 */

import { dateShort } from "@/lib/format"

export interface ReportRange {
  /** Tanggal awal dan akhir, format YYYY-MM-DD, keduanya ikut dihitung. */
  start: string
  end: string
  label: string
}

/**
 * Rentang dari isian Dari dan Sampai. Isian kosong memakai tanggal yang lain
 * (atau `fallback` bila keduanya kosong), dan tanggal yang tertukar dibalik,
 * supaya report tetap terisi selama user mengetik.
 */
export function customRange(from: string, to: string, fallback: string): ReportRange {
  const a = from || to || fallback
  const b = to || from || fallback
  const [start, end] = a <= b ? [a, b] : [b, a]
  return { start, end, label: `${dateShort(start)} s/d ${dateShort(end)}` }
}

/** Jumlah hari dalam rentang, tanggal awal dan akhir ikut dihitung. */
export function rangeDays(range: Pick<ReportRange, "start" | "end">) {
  const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
  return Math.round((day(range.end) - day(range.start)) / 86_400_000) + 1
}
