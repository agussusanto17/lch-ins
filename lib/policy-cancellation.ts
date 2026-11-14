/**
 * Usulan pengembalian premi pembatalan secara prorata harian: premi × sisa hari ÷ hari periode
 * (Harry, 10 November 2026). Biaya pembatalan dari asuransi tidak termasuk.
 */

import { daysBetween } from "@/lib/date"

export interface CancellationBase {
  inceptionDate: string
  expiryDate: string
  sumInsured: number
  premium: number
}

export interface CancellationSuggestion {
  /** Premi yang dibatalkan: premi polis ditambah endorsement-nya. */
  basePremium: number
  baseSumInsured: number
  remainingDays: number
  periodDays: number
  /** Pengembalian premi, negatif. */
  premium: number
  /** Pengurangan sum insured, negatif. */
  sumInsured: number
}

const cents = (n: number) => Math.round(n * 100) / 100

/** Endorsement polis ikut dihitung, karena pembatalan berlaku atas pertanggungan yang berjalan. */
export function cancellationSuggestion({
  policy,
  endorsements = [],
  effectiveDate,
}: {
  policy: CancellationBase
  endorsements?: { premium: number; sumInsured: number }[]
  effectiveDate: string
}): CancellationSuggestion {
  const basePremium = cents(
    policy.premium + endorsements.reduce((a, e) => a + e.premium, 0)
  )
  const baseSumInsured = cents(
    policy.sumInsured + endorsements.reduce((a, e) => a + e.sumInsured, 0)
  )
  const periodDays = Math.max(0, daysBetween(policy.inceptionDate, policy.expiryDate))
  const remainingDays = Math.min(
    periodDays,
    Math.max(0, daysBetween(effectiveDate, policy.expiryDate))
  )
  const factor = periodDays > 0 ? remainingDays / periodDays : 0
  return {
    basePremium,
    baseSumInsured,
    remainingDays,
    periodDays,
    premium: -cents(basePremium * factor),
    sumInsured: -baseSumInsured,
  }
}
