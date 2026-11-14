/**
 * Endorsement slip: perhitungan sebelum dikembalikan, sesudah ditagih, keduanya prorata hari ÷ 365
 * sampai polis berakhir; per awal polis premi penuh (Harry, 11 November 2026).
 */

import { rateLineName } from "@/components/underwriting/slip-model"
import {
  rateLineBasis,
  rateUnitFor,
  recalcSlip,
  totalPremium,
  totalSumInsured,
} from "@/lib/calc"
import type { EndorsementCalc, EndorsementCalcLine, PlacingSlip } from "@/lib/data/types"
import { daysBetween } from "@/lib/date"
import { money } from "@/lib/format"
import { isFlatLine } from "@/lib/slip-items"

export const ENDORSEMENT_DAYS_PER_YEAR = 365

const cents = (n: number) => Math.round(n * 100) / 100

export type { EndorsementCalc, EndorsementCalcLine }

/** Baris premi slip, sama dengan baris RATE & PREMIUM di dokumen slip. */
export function slipCalc(input: PlacingSlip): EndorsementCalc {
  const slip = recalcSlip(input)
  const bases = rateLineBasis(input)
  const unit = rateUnitFor(slip.cob)
  const lines: EndorsementCalcLine[] = slip.rateLines
    .filter((l) => l.rate !== null || l.premium > 0)
    .map((l) => {
      const flat = isFlatLine(slip.cob, l) || l.rate === null
      return {
        label: rateLineName(slip, l),
        basis: flat ? null : (bases.get(l.id) ?? null),
        rate: flat ? null : l.rate,
        unit,
        premium: l.premium,
      }
    })
  const used = (l: { rate: number | null; premium: number }) => l.rate !== null || l.premium > 0
  for (const l of slip.tplLines.filter(used)) {
    lines.push({
      label: `Third Party Liability (Limit ${money(Number(l.basis ?? 0), slip.currency)})`,
      basis: Number(l.basis ?? 0),
      rate: l.rate,
      unit: "%",
      premium: l.premium,
    })
  }
  for (const l of slip.paLines.filter(used)) {
    lines.push({
      label: `Personal Accident — ${l.label}`,
      basis: Number(l.basis ?? 0),
      rate: l.rate,
      unit: "%",
      premium: l.premium,
    })
  }
  return { lines, sumInsured: totalSumInsured(slip), premium: totalPremium(slip) }
}

/**
 * Hari dan faktor prorata. Tanggal efektif sama dengan atau sebelum tanggal
 * mulai polis berarti per awal polis: premi penuh.
 */
export function endorsementProrata(p: {
  effectiveDate?: string | null
  inceptionDate?: string | null
  expiryDate?: string | null
}) {
  if (!p.effectiveDate || !p.expiryDate) return { days: 0, factor: 0, fromStart: false }
  if (p.inceptionDate && p.effectiveDate <= p.inceptionDate) {
    return { days: Math.max(0, daysBetween(p.inceptionDate, p.expiryDate)), factor: 1, fromStart: true }
  }
  const days = Math.max(0, daysBetween(p.effectiveDate, p.expiryDate))
  return { days, factor: days / ENDORSEMENT_DAYS_PER_YEAR, fromStart: false }
}

export interface ProratedLine extends EndorsementCalcLine {
  /** Premi setelah prorata; negatif untuk baris yang dikembalikan. */
  prorated: number
}

export interface EndorsementAdjustment {
  days: number
  factor: number
  fromStart: boolean
  before: ProratedLine[]
  after: ProratedLine[]
  /** Jumlah perhitungan sebelum (negatif). */
  beforeTotal: number
  afterTotal: number
  /** Selisih premi: positif premi tambahan, negatif refund premi. */
  premium: number
  discountPct: number
  /** Diskon atas selisih premi, berlawanan tanda dengan selisih. */
  discount: number
  adminCost: number
  stampDuty: number
  /** Selisih premi − diskon + admin cost + stamp duty. */
  total: number
  sumInsuredBefore: number
  sumInsuredAfter: number
  sumInsuredChange: number
}

/**
 * Selisih premi endorsement atau cancellation. `after` kosong untuk
 * cancellation: semua perhitungan sebelum dikembalikan.
 */
export function endorsementAdjustment(p: {
  before: EndorsementCalc
  after: EndorsementCalc | null
  effectiveDate?: string | null
  inceptionDate?: string | null
  expiryDate?: string | null
  discountPct?: number
  adminCost?: number
  stampDuty?: number
}): EndorsementAdjustment {
  const { days, factor, fromStart } = endorsementProrata(p)
  const before = p.before.lines.map((l) => ({ ...l, prorated: -cents(l.premium * factor) }))
  const after = (p.after?.lines ?? []).map((l) => ({ ...l, prorated: cents(l.premium * factor) }))
  const beforeTotal = cents(before.reduce((a, l) => a + l.prorated, 0))
  const afterTotal = cents(after.reduce((a, l) => a + l.prorated, 0))
  const premium = cents(afterTotal + beforeTotal)
  const discountPct = p.discountPct ?? 0
  const discount = -cents((premium * discountPct) / 100)
  const adminCost = p.adminCost ?? 0
  const stampDuty = p.stampDuty ?? 0
  const sumInsuredBefore = p.before.sumInsured
  const sumInsuredAfter = p.after?.sumInsured ?? 0
  return {
    days,
    factor,
    fromStart,
    before,
    after,
    beforeTotal,
    afterTotal,
    premium,
    discountPct,
    discount,
    adminCost,
    stampDuty,
    total: cents(premium + discount + adminCost + stampDuty),
    sumInsuredBefore,
    sumInsuredAfter,
    sumInsuredChange: cents(sumInsuredAfter - sumInsuredBefore),
  }
}

/** Selisih premi slip endorsement atau cancellation dengan kondisi sebelumnya. */
export function slipEndorsementAdjustment(slip: PlacingSlip): EndorsementAdjustment | null {
  if (!slip.kind || slip.kind === "Placing" || !slip.beforeCalc) return null
  return endorsementAdjustment({
    before: slip.beforeCalc,
    after: slip.kind === "Cancellation" ? null : slipCalc(slip),
    effectiveDate: slip.effectiveDate,
    inceptionDate: slip.inceptionDate,
    expiryDate: slip.expiryDate,
    discountPct: slip.discountPct,
    adminCost: slip.adminCost,
    stampDuty: slip.stampDuty,
  })
}
