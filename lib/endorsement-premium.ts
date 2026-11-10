/**
 * Premi endorsement prorata hari (Harry, 11 November 2026; rumus di
 * `documents/Rumus Prorate Hari.xlsx`):
 *
 *   hari prorata = tanggal efektif s/d tanggal berakhir (DATEDIF "D")
 *   premi        = sum insured × rate (%) × hari prorata / 365
 *   total premi  = premi + admin cost + stamp duty
 *
 * Contoh Harry: 525.000.000 × rate × 14/365.
 */

import type { PolicyType } from "@/lib/data/types"
import { daysBetween } from "@/lib/date"

export const DAYS_PER_YEAR = 365

const cents = (n: number) => Math.round(n * 100) / 100

/** Hari prorata dari tanggal efektif sampai tanggal berakhir; 0 kalau tanggal belum lengkap. */
export function prorataDays(effectiveDate: string, expiryDate: string) {
  if (!effectiveDate || !expiryDate) return 0
  const days = daysBetween(effectiveDate, expiryDate)
  return Number.isFinite(days) ? Math.max(0, days) : 0
}

/** Premi prorata; sum insured negatif (pengurangan UP) menghasilkan pengembalian premi. */
export function prorataPremium(sumInsured: number, ratePct: number, days: number) {
  return cents((sumInsured * ratePct * days) / 100 / DAYS_PER_YEAR)
}

/**
 * Premi endorsement yang dihitung dari rate. Null kalau bukan endorsement atau
 * rate kosong, sehingga premi tetap diisi manual seperti sebelumnya.
 */
export function endorsementPremium(p: {
  type: PolicyType
  sumInsured: number
  premiumBasis?: number | null
  rate?: number | null
  inceptionDate: string
  expiryDate: string
}): number | null {
  if (p.type !== "Endorsement" || !p.rate) return null
  return prorataPremium(premiumBasis(p), p.rate, prorataDays(p.inceptionDate, p.expiryDate))
}

/**
 * Sum insured yang dikalikan rate: TSI dasar premi kalau diisi (rate atau
 * jaminan berubah tanpa mengubah UP), selain itu tambahan/pengurangan UP.
 */
export function premiumBasis(p: { sumInsured: number; premiumBasis?: number | null }) {
  return p.premiumBasis ?? p.sumInsured
}

/** Total premi: premi ditambah admin cost dan stamp duty. */
export function totalPremium(p: { premium: number; adminCost?: number; stampDuty?: number }) {
  return cents(p.premium + (p.adminCost ?? 0) + (p.stampDuty ?? 0))
}
