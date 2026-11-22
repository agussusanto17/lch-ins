/**
 * Polis multi tahun Motor Vehicle (Agus, 20 November 2026). Contohnya polis Asuransi MAG PT KB
 * Finansia Multi Finance QQ PT Diraja Traillindo, 5 dump truck, 10 Juni 2024 s/d 10 Juni 2028:
 * - premi dihitung per tahun polis lalu dijumlah;
 * - nilai casco tiap tahun turun sebesar persen penyusutan dari nilai tahun sebelumnya
 *   (10%: 1.555.000.000, 1.399.500.000, 1.259.550.000, 1.133.595.000);
 * - rate sama setiap tahun;
 * - TPL dan PA dihitung lagi setiap tahun dengan limit yang sama.
 * Total Sum Insured di dokumen tetap nilai tahun pertama.
 */
import { addMonths, daysBetween } from "./date"

export interface PolicyYear {
  /** Tahun polis ke-, mulai 1. */
  no: number
  start: string
  end: string
  /** 1 untuk tahun penuh; tahun terakhir yang tidak penuh memakai jumlah harinya / 365. */
  factor: number
}

/** Batas jumlah tahun polis yang dihitung, supaya tanggal yang salah ketik tidak membebani form. */
export const MAX_POLICY_YEARS = 10

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

type PeriodFields = {
  inceptionDate?: string | null
  expiryDate?: string | null
  periodTba?: boolean
}

/**
 * Tahun polis dari periode slip. Periode satu tahun atau kurang, periode TBA, dan tanggal yang
 * belum lengkap tidak dibagi (hasilnya kosong). Tahun dihitung dari tanggal ulang inception.
 */
export function policyYears(period: PeriodFields): PolicyYear[] {
  const start = period.inceptionDate
  const end = period.expiryDate
  if (period.periodTba || !start || !end || !ISO_DATE.test(start) || !ISO_DATE.test(end)) {
    return []
  }
  if (end <= addMonths(start, 12)) return []
  const years: PolicyYear[] = []
  for (let no = 1; no <= MAX_POLICY_YEARS; no++) {
    const from = addMonths(start, 12 * (no - 1))
    if (from >= end) break
    const anniversary = addMonths(start, 12 * no)
    const to = anniversary <= end ? anniversary : end
    years.push({
      no,
      start: from,
      end: to,
      factor: to === anniversary ? 1 : daysBetween(from, to) / 365,
    })
  }
  return years
}

/** Slip Motor Vehicle dengan periode lebih dari satu tahun: premi dihitung per tahun polis. */
export function isMultiYearMotor(slip: PeriodFields & { cob: string }) {
  return slip.cob === "Motor Vehicle" && policyYears(slip).length > 1
}

/** Persen penyusutan yang berlaku, 0 sampai 100. */
export function depreciationPct(value: number | null | undefined) {
  return Math.min(Math.max(Number(value) || 0, 0), 100)
}

/**
 * Nilai kendaraan tiap tahun polis: tahun berikutnya turun `pct` persen dari nilai tahun
 * sebelumnya, dibulatkan ke sen. Nilai tahun kedua dan seterusnya bisa diisi manual (`manual`,
 * Harry, 22 November 2026) karena harga kendaraan tidak selalu turun dengan persen yang sama;
 * tahun sesudahnya kembali turun `pct` persen dari nilai manual itu. Tahun pertama selalu nilai
 * kendaraan.
 */
export function yearlySumInsured(
  sumInsured: number,
  pct: number | null | undefined,
  years: number,
  manual?: readonly (number | null | undefined)[]
) {
  const keep = 1 - depreciationPct(pct) / 100
  const values: number[] = []
  let value = sumInsured
  for (let i = 0; i < years; i++) {
    const entered = i > 0 ? manual?.[i] : null
    if (entered != null && Number.isFinite(entered) && entered >= 0) value = cents(entered)
    values.push(value)
    value = cents(value * keep)
  }
  return values
}

/**
 * Nilai manual dengan nilai tahun `index` (mulai 0) diganti; null mengembalikan tahun itu ke
 * penyusutan. Hasil kosong (undefined) berarti semua tahun mengikuti penyusutan.
 */
export function withYearValue(
  values: readonly (number | null)[] | undefined,
  index: number,
  value: number | null
) {
  const next = [...(values ?? [])]
  while (next.length <= index) next.push(null)
  next[index] = value
  const cleaned = cleanYearValues(next)
  return cleaned.length ? cleaned : undefined
}

/** Nilai manual per tahun yang valid; daftar kosong bila tidak ada yang diisi. */
export function cleanYearValues(raw: unknown): (number | null)[] {
  if (!Array.isArray(raw)) return []
  const values = raw.slice(0, 30).map((v, i) =>
    i > 0 && typeof v === "number" && Number.isFinite(v) && v >= 0 ? cents(v) : null
  )
  return values.some((v) => v != null) ? values : []
}

/**
 * Premi satu baris untuk semua tahun polis: premi setahun tiap tahun (dari nilai tahun itu),
 * dikali porsi tahunnya, dibulatkan ke sen per tahun lalu dijumlah.
 */
export function multiYearPremium(
  years: readonly PolicyYear[],
  yearlyPremium: (index: number) => number
) {
  return cents(years.reduce((sum, year, i) => sum + cents(yearlyPremium(i) * year.factor), 0))
}
