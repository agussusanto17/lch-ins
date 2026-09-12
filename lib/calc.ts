import type { PlacingSlip, RateLine } from "./data/types"

/** Kurs demo untuk agregasi laporan. */
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
 * Bulatkan ke sen (2 desimal). Dipakai di setiap hasil hitung uang supaya
 * sisa floating point JavaScript tidak ikut terbawa ke total dan dokumen.
 * Di backend, nilai uang disimpan sebagai numeric(18,2).
 */
export function roundCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Bagi nominal ke beberapa porsi persen. Setiap porsi dibulatkan ke sen dan
 * selisih pembulatan masuk ke porsi terakhir (PRD bagian 6).
 */
export function splitByShares(total: number, shares: number[]) {
  const parts = shares.map((s) => roundCents((total * s) / 100))
  if (parts.length) {
    const diff = roundCents(total - parts.reduce((a, b) => a + b, 0))
    parts[parts.length - 1] = roundCents(parts[parts.length - 1] + diff)
  }
  return parts
}

/** Total persen dihitung dalam basis poin supaya 33,33 + 33,33 + 33,34 tepat 100. */
export function sumPercent(values: number[]) {
  return values.reduce((a, v) => a + Math.round((v || 0) * 10_000), 0) / 10_000
}

export function sumItems(items: { amount: number }[]) {
  return roundCents(items.reduce((acc, i) => acc + (i.amount || 0), 0))
}

export function sumPremium(lines: { premium: number }[]) {
  return roundCents(lines.reduce((acc, l) => acc + (l.premium || 0), 0))
}

/** Total sum insured — Property pakai section 1+2, COB lain pakai interest items. */
export function totalSumInsured(slip: PlacingSlip) {
  if (slip.sumInsuredSection1.length || slip.sumInsuredSection2.length) {
    return sumItems(slip.sumInsuredSection1) + sumItems(slip.sumInsuredSection2)
  }
  return sumItems(slip.interestItems)
}

/** Total premium sebelum diskon dan biaya. */
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

/** Total payable = premium − diskon + admin + materai. */
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

/** Net premium untuk insurer — hanya muncul di Closing Instruction. */
export function netPremium(slip: PlacingSlip) {
  return roundCents(totalPremium(slip) - brokerageAmount(slip))
}

/** Brokerage efektif setelah PPN 11% bila include VAT. */
export function effectiveBrokeragePct(slip: PlacingSlip) {
  const b = slip.brokeragePct || 0
  return slip.includeVat ? b / 1.11 : b
}

export function slipRateBasis(slip: PlacingSlip) {
  return totalSumInsured(slip)
}

/** Basis rate: Property per mil (‰), Motor Vehicle persen (%). */
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

/** Baris rate Property yang dihitung dari sum insured Business Interruption. */
export const BI_RATE_LABELS = [
  "BI PAR (FLEXAS + FWTWD + RSMDCC + Others)",
  "BI EQVET",
]

/** Baris rate yang menjadi tarif dasar perhitungan BI PAR menurut skala BI OJK. */
export const BI_BASE_LABELS = ["FLEXAS", "FWTWD", "RSMDCC", "Other Losses"]

/**
 * Batas biaya akuisisi SE OJK No. 6/SEOJK.05/2017: harta benda dan jaminan
 * tambahannya maksimal 15%, kendaraan bermotor maksimal 25%.
 */
export function brokerageCapFor(cob: string) {
  if (cob === "Property") return 15
  if (cob === "Motor Vehicle") return 25
  return null
}

/**
 * Hitung ulang seluruh premium dari rate + sum insured. Baris BI Property
 * memakai sum insured Section 2, TPL dan PA memakai limit masing-masing.
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
