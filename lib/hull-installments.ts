/**
 * Rincian premi installment slip Marine Hull per section (Harry, 26 November 2026: "buat ada
 * rincian installment aja bro untuk premi"). Jadwal slip tetap disimpan sebagai persen dari premi
 * setelah diskon, supaya polis dan report memakai cara yang sama dengan slip lain. Dengan pola CI
 * Patria "H&M payable quarterly in advance, IV & War in advance", persen di editor berlaku untuk
 * H&M, sedangkan IV dan War masuk cicilan pertama.
 */
import { recalcSlip, roundCents, totalPremium } from "./calc"
import type { PlacingSlip, PremiumInstallment } from "./data/types"
import {
  hullSectionTotals,
  usesHullSchedule,
  type HullSchedule,
  type HullSection,
} from "./marine-hull"
import { installmentAmounts, slipInstallmentBase, slipInstallmentCharges } from "./premium-installments"

export interface HullInstallmentParts {
  /** Premi setelah diskon per section; diskon slip dibagi sesuai porsi premi. */
  net: Record<HullSection, number>
  /** Premi setelah diskon semua section, dasar persen yang disimpan. */
  total: number
  /** Admin cost dan stamp duty, masuk cicilan pertama. */
  charges: number
}

export function hullInstallmentParts(slip: PlacingSlip): HullInstallmentParts | null {
  if (!usesHullSchedule(slip)) return null
  const gross = totalPremium(slip)
  const total = slipInstallmentBase(slip)
  const ratio = gross ? total / gross : 0
  const { premium } = hullSectionTotals(slip.hullSchedule.vessels)
  const hm = roundCents(premium.hm * ratio)
  const iv = roundCents(premium.iv * ratio)
  // War menampung selisih pembulatan supaya jumlah ketiganya sama dengan premi setelah diskon.
  const war = roundCents(total - hm - iv)
  return { net: { hm, iv, war }, total, charges: slipInstallmentCharges(slip) }
}

/** Pola IV & War di cicilan 1 berlaku bila dinyalakan dan premi H&M ada. */
export function usesIvWarInAdvance(slip: PlacingSlip, parts = hullInstallmentParts(slip)) {
  return Boolean(parts && slip.hullSchedule?.ivWarInAdvance && parts.net.hm > 0)
}

const inAdvance = (parts: HullInstallmentParts) => roundCents(parts.net.iv + parts.net.war)

/** Persen tersimpan (dari premi total) menjadi persen dari H&M untuk editor cicilan. */
export function toHmInstallments(
  rows: readonly PremiumInstallment[] | undefined,
  parts: HullInstallmentParts
): PremiumInstallment[] {
  const advance = inAdvance(parts)
  return (rows ?? []).map((r, i) => ({
    ...r,
    pct: (((parts.total * r.pct) / 100 - (i === 0 ? advance : 0)) / parts.net.hm) * 100,
  }))
}

/** Persen dari H&M di editor menjadi persen dari premi total yang disimpan. */
export function fromHmInstallments(
  rows: readonly PremiumInstallment[],
  parts: HullInstallmentParts
): PremiumInstallment[] {
  const advance = inAdvance(parts)
  if (!parts.total) return rows.map((r) => ({ ...r }))
  return rows.map((r, i) => ({
    ...r,
    pct: (((parts.net.hm * r.pct) / 100 + (i === 0 ? advance : 0)) / parts.total) * 100,
  }))
}

export interface HullInstallmentRow {
  no: number
  dueDate: string | null
  hm: number
  iv: number
  war: number
  charges: number
  total: number
}

/**
 * Rincian tiap cicilan per section. Pola IV & War di muka: H&M dibagi persen H&M, IV dan War di
 * cicilan 1. Tanpa pola itu, tiap section dibagi dengan persen yang sama.
 */
export function hullInstallmentBreakdown(slip: PlacingSlip): HullInstallmentRow[] {
  const parts = hullInstallmentParts(slip)
  const rows = slip.premiumInstallments ?? []
  if (!parts || !rows.length) return []
  const advance = usesIvWarInAdvance(slip, parts)
  const split = (section: HullSection) =>
    advance && section !== "hm"
      ? rows.map((_, i) => (i === 0 ? parts.net[section] : 0))
      : installmentAmounts(advance ? toHmInstallments(rows, parts) : rows, parts.net[section])
  const hm = split("hm")
  const iv = split("iv")
  const war = split("war")
  return rows.map((r, i) => {
    const charges = i === 0 ? parts.charges : 0
    return {
      no: r.no,
      dueDate: r.dueDate,
      hm: hm[i],
      iv: iv[i],
      war: war[i],
      charges,
      total: roundCents(hm[i] + iv[i] + war[i] + charges),
    }
  })
}

/**
 * Patch form saat jadwal kapal berubah. Dengan pola IV & War di cicilan 1, persen H&M tiap cicilan
 * dipertahankan dan persen tersimpan dihitung ulang dari premi baru, supaya H&M tetap terbagi sama
 * (misalnya 25% per kuartal) walau nilai kapal diubah setelah cicilan diisi.
 */
export function hullSchedulePatch(slip: PlacingSlip, schedule: HullSchedule): Partial<PlacingSlip> {
  const rows = slip.premiumInstallments ?? []
  const before = hullInstallmentParts(slip)
  if (!rows.length || !before || !usesIvWarInAdvance(slip, before)) return { hullSchedule: schedule }
  const next = recalcSlip({ ...slip, hullSchedule: schedule })
  const after = hullInstallmentParts(next)
  if (!after || !usesIvWarInAdvance(next, after)) return { hullSchedule: schedule }
  return {
    hullSchedule: schedule,
    premiumInstallments: fromHmInstallments(toHmInstallments(rows, before), after),
  }
}
