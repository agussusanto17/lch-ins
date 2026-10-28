import type { PlacingSlip, RateLine } from "./data/types"

/** Demo exchange rates for report aggregation. */
export const FX: Record<string, number> = {
  IDR: 1,
  USD: 16_200,
  SGD: 12_050,
  EUR: 17_600,
}

export function toIdr(amount: number, currency: string) {
  return amount * (FX[currency] ?? 1)
}

/**
 * Round to cents (2 decimal places). Used on all financial calculations to prevent
 * JavaScript floating-point errors from compounding into totals and documents.
 * Stored as numeric(18,2) in the backend.
 */
export function roundCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Divide an amount across multiple percentage shares. Each share is rounded to cents,
 * with any rounding difference allocated to the final share (PRD section 6).
 */
export function splitByShares(total: number, shares: number[]) {
  const parts = shares.map((s) => roundCents((total * s) / 100))
  if (parts.length) {
    const diff = roundCents(total - parts.reduce((a, b) => a + b, 0))
    parts[parts.length - 1] = roundCents(parts[parts.length - 1] + diff)
  }
  return parts
}

/** Total percentage computed in basis points so 33.33 + 33.33 + 33.34 equals exactly 100. */
export function sumPercent(values: number[]) {
  return values.reduce((a, v) => a + Math.round((v || 0) * 10_000), 0) / 10_000
}

export function sumItems(items: { amount: number }[]) {
  return roundCents(items.reduce((acc, i) => acc + (i.amount || 0), 0))
}

export function sumPremium(lines: { premium: number }[]) {
  return roundCents(lines.reduce((acc, l) => acc + (l.premium || 0), 0))
}

/** Total sum insured — Property uses Sections 1 & 2; other COBs use interest items. */
export function totalSumInsured(slip: PlacingSlip) {
  if (slip.cob === "Property") {
    return sumItems(slip.sumInsuredSection1) + sumItems(slip.sumInsuredSection2)
  }
  return sumItems(slip.interestItems)
}

/** Total gross premium before discounts and statutory charges. */
export function totalPremium(slip: PlacingSlip) {
  return (
    sumPremium(slip.rateLines) +
    sumPremium(slip.tplLines) +
    sumPremium(slip.paLines)
  )
}

export function discountAmount(slip: PlacingSlip) {
  return roundCents((totalPremium(slip) * (slip.discountPct || 0)) / 100)
}

/** Total payable = gross premium - discount + admin fee + stamp duty. */
export function totalPayable(slip: PlacingSlip) {
  return roundCents(
    totalPremium(slip) -
      discountAmount(slip) +
      (slip.adminCost || 0) +
      (slip.stampDuty || 0)
  )
}

export function brokerageAmount(slip: PlacingSlip) {
  return roundCents((totalPremium(slip) * (slip.brokeragePct || 0)) / 100)
}

/** Net premium payable to insurer — displayed on the Closing Instruction. */
export function netPremium(slip: PlacingSlip) {
  return roundCents(totalPremium(slip) - brokerageAmount(slip))
}

/**
 * VAT on insurance brokerage services applies a deemed tax base (DPP nilai lain)
 * of 20% on commission (PMK 67/PMK.03/2022), resulting in an effective rate of
 * 11% x 20% = 2.2% of brokerage, rather than the full 11%.
 */
export const BROKERAGE_VAT_RATE = 0.022

/** Effective brokerage percentage after VAT when the input rate is VAT-inclusive. */
export function effectiveBrokeragePct(slip: PlacingSlip) {
  const b = slip.brokeragePct || 0
  return slip.includeVat ? b / (1 + BROKERAGE_VAT_RATE) : b
}

export function slipRateBasis(slip: PlacingSlip) {
  return totalSumInsured(slip)
}

/** Rate calculation basis: Property uses per mil (‰); Motor Vehicle uses percent (%). */
export type RateMode = "permil" | "percent"

export function rateModeFor(cob: string): RateMode {
  return cob === "Motor Vehicle" ? "percent" : "permil"
}

export function premiumFromRate(
  basis: number,
  rate: number | null,
  mode: RateMode
) {
  if (!rate) return 0
  return roundCents(
    mode === "percent" ? (basis * rate) / 100 : (basis * rate) / 1000
  )
}

/** Property rate line items calculated against Business Interruption sum insured. */
export const BI_RATE_LABELS = [
  "BI PAR (FLEXAS + FWTWD + RSMDCC + Others)",
  "BI EQVET",
]

/** Base rate line items used for BI PAR tariff scaling per OJK guidelines. */
export const BI_BASE_LABELS = ["FLEXAS", "FWTWD", "RSMDCC", "Other Losses"]

/**
 * Acquisition cost limits per Circular Letter SE OJK No. 6/SEOJK.05/2017:
 * Property and ancillary perils max 15%; Motor Vehicle max 25%.
 */
export function brokerageCapFor(cob: string) {
  if (cob === "Property") return 15
  if (cob === "Motor Vehicle") return 25
  return null
}

/**
 * Recalculate all premiums from rate and sum insured. Property BI lines use
 * Section 2 sum insured; TPL and PA lines use their respective liability limits.
 */
export function recalcSlip(slip: PlacingSlip): PlacingSlip {
  const mode = rateModeFor(slip.cob)
  const mdBasis =
    slip.cob === "Property"
      ? sumItems(slip.sumInsuredSection1)
      : sumItems(slip.interestItems)
  const biBasis = sumItems(slip.sumInsuredSection2)

  const rateLines = slip.rateLines.map((l) => {
    const basis =
      slip.cob === "Property" && BI_RATE_LABELS.includes(l.label)
        ? biBasis
        : mdBasis
    return { ...l, premium: premiumFromRate(basis, l.rate, mode) }
  })

  const withBasis = (lines: RateLine[]) =>
    lines.map((l) => ({
      ...l,
      premium: premiumFromRate(Number(l.basis ?? 0), l.rate, "percent"),
    }))

  return {
    ...slip,
    rateLines,
    tplLines: withBasis(slip.tplLines),
    paLines: withBasis(slip.paLines),
  }
}
