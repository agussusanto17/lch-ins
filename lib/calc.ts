import {
  PAR_EQVET_FORMULA_NAMES,
  PAR_EQVET_FULL_NAMES,
} from "./data/reference"
import { BI_SCALE_OJK } from "./data/ojk-tariff"
import type { PlacingSlip, RateLine, SlipPart } from "./data/types"
import { num } from "./format"
import { locationGroups, locationOwner, withLocations } from "./slip-locations"
import { itemOwner, withItemRates } from "./slip-items"

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

export function totalPayable(slip: PlacingSlip) {
  if (isParEqvetSlip(slip)) {
    return calculateParEqvet(slip).grandTotal
  }
  return roundCents(
    totalPremium(slip) -
      discountAmount(slip) +
      (slip.adminCost || 0) +
      (slip.stampDuty || 0)
  )
}

/**
 * Detects whether a slip uses PAR + EQVET rate calculation structure (Image 4 & 5).
 * Property slips with FLEXAS or EQVET rate lines follow this grouped presentation.
 */
/**
 * Bagian slip yang terbit sebagai polis terpisah. Slip PAR + EQVET dengan premi
 * di kedua kelompok menjadi dua polis (Harry, 3 November 2026); slip lain satu
 * polis, ditandai daftar kosong.
 */
export function slipPolicyParts(slip: PlacingSlip): SlipPart[] {
  if (!isParEqvetSlip(slip)) return []
  const { par, eqvet } = calculateParEqvet(slip)
  return par.subtotal > 0 && eqvet.subtotal > 0 ? ["PAR", "EQVET"] : []
}

/** Premi polis dari slip: per bagian untuk slip PAR + EQVET, selain itu total. */
export function slipPolicyPremium(slip: PlacingSlip, part: SlipPart | null) {
  if (!part) return totalPremium(slip)
  const { par, eqvet } = calculateParEqvet(slip)
  return part === "PAR" ? par.subtotal : eqvet.subtotal
}

export function isParEqvetSlip(slip: PlacingSlip): boolean {
  if (slip.cob !== "Property") return false
  return (
    slip.rateLines?.some((l) =>
      /flexas|eqvet|fwtwd|rsmdcc/i.test(l.label)
    ) ?? false
  )
}

export interface ParEqvetLine {
  id: string
  /** Nomor lokasi slip, mulai 1. Slip satu lokasi selalu 1. */
  locationNo: number
  label: string
  formulaLabel: string
  fullName: string
  basis: number
  ratePercent: number | null
  /** Rate as entered on the slip, per mil (‰). */
  ratePermil: number | null
  rateText: string
  /** Persen premi loss limit OJK, kosong untuk full value dan baris BI. */
  lossLimitPct: number | null
  premium: number
}

export interface ParEqvetGroup {
  name: "PAR" | "EQVET"
  lines: ParEqvetLine[]
  subtotal: number
  discountPct: number
  discountAmount: number
  afterDiscount: number
  policyCost: number
  total: number
}

export interface ParEqvetCalculation {
  currency: string
  par: ParEqvetGroup
  eqvet: ParEqvetGroup
  grandTotal: number
}

/**
 * Property rates print per mil like the slip input, six decimals so the
 * smallest entered rate (0,000009‰) still shows.
 */
export function ratePermilText(ratePermil: number) {
  return `${num(ratePermil, 6)}‰`
}

/**
 * Policy cost plus stamp duty for one PAR or EQVET policy, taken from the
 * slip's Admin Cost and Stamp Duty fields. An empty field counts as zero.
 */
export function parEqvetPolicyCharge(slip: PlacingSlip) {
  return roundCents((slip.adminCost || 0) + (slip.stampDuty || 0))
}

/**
 * Sum insured Section 1 dan 2 tiap lokasi slip Property, beserta nomor
 * lokasinya. Slip tanpa daftar lokasi menjadi satu lokasi.
 */
function locationBases(slip: PlacingSlip) {
  return new Map(
    locationGroups(slip).map((g) => [
      g.location.id,
      { no: g.no, md: sumItems(g.section1), bi: sumItems(g.section2) },
    ])
  )
}

export function calculateParEqvet(slip: PlacingSlip): ParEqvetCalculation {
  // Tiap baris memakai sum insured lokasinya, dan tiap section hanya memakai
  // sum insured-nya sendiri, sama seperti recalcSlip. Dulu section kosong
  // memakai nilai section lain, sehingga rate BI otomatis mendapat premi dari
  // Section 1 walaupun Section 2 kosong.
  const bases = locationBases(slip)
  const owner = locationOwner(slip)

  // Property rates in rateLines are per mil (‰); divided by 10 to represent percent (%).
  function mapLine(l: RateLine): ParEqvetLine {
    const isBi = BI_RATE_LABELS.includes(l.label)
    const location = bases.get(owner(l.locationId))!
    const basis = isBi ? location.bi : location.md
    // Slip yang tersimpan sebelum perbaikan ini masih membawa rate BI otomatis
    // walaupun Section 2 kosong; rate itu tidak dicetak.
    const rate = isBi && location.bi <= 0 ? null : l.rate
    const ratePercent = rate != null ? rate / 10 : null
    const lossLimitPct = isBi ? null : (l.lossLimitPct ?? null)
    const premium =
      l.premium ||
      (ratePercent != null
        ? roundCents((basis * ratePercent * (lossLimitPct ?? 100)) / 10_000)
        : 0)

    return {
      id: l.id,
      locationNo: location.no,
      label: l.label,
      formulaLabel: PAR_EQVET_FORMULA_NAMES[l.label] ?? l.label,
      fullName: PAR_EQVET_FULL_NAMES[l.label] ?? l.label,
      basis,
      ratePercent,
      ratePermil: rate,
      rateText: rate != null ? ratePermilText(rate) : "—",
      lossLimitPct,
      premium,
    }
  }

  const allLines = slip.rateLines.map(mapLine)
  const parLines = allLines.filter((l) => !/eqvet/i.test(l.label))
  const eqvetLines = allLines.filter((l) => /eqvet/i.test(l.label))

  const discountPct = slip.discountPct || 0
  const policyCharge = parEqvetPolicyCharge(slip)

  function buildGroup(name: "PAR" | "EQVET", lines: ParEqvetLine[]): ParEqvetGroup {
    const subtotal = sumPremium(lines)
    const discountAmount = roundCents((subtotal * discountPct) / 100)
    const afterDiscount = roundCents(subtotal - discountAmount)
    // A group without premium is not issued as a policy, so it carries no charge.
    const policyCost = subtotal > 0 ? policyCharge : 0
    const total = roundCents(afterDiscount + policyCost)

    return {
      name,
      lines,
      subtotal,
      discountPct,
      discountAmount,
      afterDiscount,
      policyCost,
      total,
    }
  }

  const par = buildGroup("PAR", parLines)
  const eqvet = buildGroup("EQVET", eqvetLines)
  const grandTotal = roundCents(par.total + eqvet.total)

  return {
    currency: slip.currency || "IDR",
    par,
    eqvet,
    grandTotal,
  }
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

/** VAT inside the brokerage amount; the entered rate already includes it, as in effectiveBrokeragePct. */
export function brokerageVatAmount(slip: PlacingSlip) {
  if (!slip.includeVat) return 0
  const b = brokerageAmount(slip)
  return roundCents(b - b / (1 + BROKERAGE_VAT_RATE))
}

export function slipRateBasis(slip: PlacingSlip) {
  return totalSumInsured(slip)
}

/** Rate calculation basis: Property uses per mil (‰); every other COB uses percent (%). */
export type RateMode = "permil" | "percent"

export function rateModeFor(cob: string): RateMode {
  return cob === "Property" ? "permil" : "percent"
}

/** Unit symbol printed beside a slip rate, matching rateModeFor. */
export function rateUnitFor(cob: string) {
  return rateModeFor(cob) === "permil" ? "‰" : "%"
}

export function premiumFromRate(
  basis: number,
  rate: number | null,
  mode: RateMode,
  /** Persentase loss limit baris rate; 100 berarti full value. */
  lossLimitPct = 100
) {
  if (!rate) return 0
  const full = mode === "percent" ? (basis * rate) / 100 : (basis * rate) / 1000
  return roundCents((full * lossLimitPct) / 100)
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
 * Highest brokerage allowed on a slip. The OJK limit covers brokerage plus
 * discount (Harry, 3 November 2026), so a discount lowers the broker's share:
 * Motor Vehicle 25% with a 15% discount leaves at most 10%.
 */
export function maxBrokeragePct(slip: PlacingSlip) {
  const cap = brokerageCapFor(slip.cob)
  if (cap == null) return null
  // Rounded so 25 - 12.3 compares equal to an entered 12.7.
  return Math.max(0, Math.round((cap - (slip.discountPct || 0)) * 1e6) / 1e6)
}

/** "maksimal 10% (25% dikurangi diskon 15%)", or null where OJK sets no limit. */
export function brokerageLimitText(slip: PlacingSlip) {
  const cap = brokerageCapFor(slip.cob)
  const max = maxBrokeragePct(slip)
  if (cap == null || max == null) return null
  const discount = slip.discountPct || 0
  return discount > 0
    ? `maksimal ${num(max, 0, 2)}% (${cap}% dikurangi diskon ${num(discount, 0, 2)}%)`
    : `maksimal ${cap}%`
}

/** Release issue when the entered brokerage is above the OJK limit, else null. */
export function brokerageLimitIssue(slip: PlacingSlip) {
  const max = maxBrokeragePct(slip)
  const current = slip.brokeragePct || 0
  if (max == null || current <= max) return null
  return `Brokerage ${num(current, 0, 2)}% melebihi batas OJK untuk ${slip.cob}: ${brokerageLimitText(slip)}.`
}

/**
 * Recalculate all premiums from rate and sum insured. Property lines use the
 * Section 1 sum insured of their location × rate × loss limit percentage, BI
 * lines the location's Section 2. Other COBs use the value of their interest
 * item (vehicle or object) × rate; TPL and PA lines use their liability limits.
 */
export function recalcSlip(input: PlacingSlip): PlacingSlip {
  const slip = withItemRates(withLocations(input))
  const mode = rateModeFor(slip.cob)
  const property = slip.cob === "Property"
  const bases = locationBases(slip)
  const owner = locationOwner(slip)
  const itemOf = itemOwner(slip)
  const itemValue = new Map(slip.interestItems.map((v) => [v.id, v.amount || 0]))

  const rateLines = (property ? withBiRates(slip) : slip.rateLines).map((l) => {
    if (!property) {
      const value = itemValue.get(itemOf(l.vehicleId) ?? "") ?? 0
      return { ...l, premium: premiumFromRate(value, l.rate, mode) }
    }
    const location = bases.get(owner(l.locationId))!
    return {
      ...l,
      premium: BI_RATE_LABELS.includes(l.label)
        ? premiumFromRate(location.bi, l.rate, mode)
        : premiumFromRate(location.md, l.rate, mode, l.lossLimitPct ?? 100),
    }
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

/**
 * Rate dibulatkan ke enam desimal seperti kolom numeric(12,6), setengah ke
 * atas. toPrecision membuang galat floating point dulu: 1,0963305 tersimpan
 * sebagai 1,09633049…, yang tanpa itu dibulatkan ke bawah.
 */
function roundRate(value: number) {
  return Math.round(Number((value * 1e6).toPrecision(12))) / 1e6
}

/** Rate setelah persentase loss limit; kosong berarti full value. */
export function effectiveRate(line: Pick<RateLine, "rate" | "lossLimitPct">) {
  return ((line.rate ?? 0) * (line.lossLimitPct ?? 100)) / 100
}

/**
 * Skala BI OJK untuk indemnity period slip. Periode di antara dua baris skala
 * memakai baris berikutnya; periode kosong dihitung 100% seperti 12 bulan.
 */
export function biScalePct(indemnityPeriod?: string) {
  const months = Number(indemnityPeriod?.match(/\d+/)?.[0])
  if (!months) return 100
  const row =
    BI_SCALE_OJK.find((s) => s.months >= months) ??
    BI_SCALE_OJK[BI_SCALE_OJK.length - 1]
  return row.pct
}

/**
 * Dasar rate BI slip Property sebelum dikali skala indemnity period: jumlah
 * rate FLEXAS, FWTWD, RSMDCC, dan Other Losses untuk BI PAR, dan rate EQVET
 * untuk BI EQVET, masing-masing setelah persentase loss limit.
 */
export function biRateBasis(
  slip: Pick<PlacingSlip, "rateLines" | "indemnityPeriod">
) {
  const sum = (labels: string[]) =>
    slip.rateLines
      .filter((l) => labels.includes(l.label))
      .reduce((a, l) => a + effectiveRate(l), 0)
  return {
    par: sum(BI_BASE_LABELS),
    eqvet: sum(["EQVET"]),
    scalePct: biScalePct(slip.indemnityPeriod),
  }
}

/**
 * Rate BI slip Property selalu dihitung dari baris lain di lokasi yang sama
 * (Harry, 5 November 2026), jadi tidak bisa basi saat rate FLEXAS dan
 * kawan-kawan diubah. Contoh LCH: (0,048300% + 0,045000% × 85% + 0,000001% +
 * 0,000001%) × 90% untuk indemnity period 24 bulan.
 */
function withBiRates(slip: PlacingSlip): RateLine[] {
  const owner = locationOwner(slip)
  const bases = new Map(
    locationGroups(slip).map((g) => {
      const basis = biRateBasis({
        rateLines: g.rateLines,
        indemnityPeriod: slip.indemnityPeriod,
      })
      // Tanpa sum insured Section 2 tidak ada jaminan BI, jadi rate BI lokasi
      // itu kosong dan tidak tercetak di dokumen.
      const covered = sumItems(g.section2) > 0
      return [
        g.location.id,
        {
          scalePct: basis.scalePct,
          rates: new Map([
            [BI_RATE_LABELS[0], covered ? basis.par : 0],
            [BI_RATE_LABELS[1], covered ? basis.eqvet : 0],
          ]),
        },
      ]
    })
  )
  return slip.rateLines.map((l) => {
    const basis = bases.get(owner(l.locationId))!
    const base = basis.rates.get(l.label)
    if (base === undefined) return l
    return {
      ...l,
      rate: base > 0 ? roundRate((base * basis.scalePct) / 100) : null,
      lossLimitPct: null,
      min: null,
      max: null,
      boundSource: undefined,
    }
  })
}
