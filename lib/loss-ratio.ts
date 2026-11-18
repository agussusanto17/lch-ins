/**
 * Loss ratio polis klaim (MoM review Phase 1, poin 13 dan 19), mengikuti sheet "Perhitungan
 * LOSS RATIO" dari Team LCH: dihitung per tahun polis, lalu total semua tahun.
 * - Satu tahun polis = polis Baru atau Renewal beserta endorsement, pembatalan, dan deklarasinya.
 *   Tahun-tahunnya diambil dari rantai renewal polis klaim, sebelum dan sesudahnya.
 * - Nilai klaim memakai jumlah dibayar untuk klaim Settled dan Closed, dan estimasi kerugian
 *   untuk klaim yang masih berjalan (Outstanding dan Partial Settle).
 * - Klaim Rejected tidak dihitung.
 *
 * Gross Loss Ratio = (Klaim + Adjuster/Surveyor Fee − Salvage) / Gross Premium
 * Nett Loss Ratio  = (Klaim + Adjuster/Surveyor Fee − Salvage) / Nett Premium
 * Gross Premium = Premi − Diskon; Nett Premium = Gross Premium − Brokerage − Additional Fee.
 */
import { grossPremium, policyBrokerage, roundCents, toIdr } from "./calc"
import type { ClaimStatus } from "./data/types"

export interface LossRatioPolicy {
  premium: number
  discountAmount: number
  brokeragePct: number
  additionalFee: number
  currency: string
}

export interface LossRatioClaim {
  id: string
  status: ClaimStatus
  estimatedLoss: number
  paidAmount: number
  adjusterFeeAmount: number
  salvageAmount: number
  currency: string
}

/** Satu tahun polis: polis Baru/Renewal dan perubahannya, beserta klaimnya. */
export interface LossRatioYear {
  /** Polis Baru atau Renewal yang membuka tahun polis itu. */
  policyId: string
  policyNo: string
  inceptionDate: string
  expiryDate: string
  policies: LossRatioPolicy[]
  claims: LossRatioClaim[]
}

/** Data loss ratio polis klaim, dikirim server bersama info polis klaim. */
export interface LossRatioData {
  /** Tahun polis tempat klaim ini dicatat. */
  currentPolicyId: string
  /** Urut dari tahun polis paling awal. */
  years: LossRatioYear[]
}

export interface LossRatioResult {
  /** Mata uang polis; IDR bila polis dan klaim memakai mata uang berbeda. */
  currency: string
  /** Ada nilai yang dikonversi ke IDR (kurs tetap report). */
  converted: boolean
  premium: number
  discount: number
  grossPremium: number
  brokerage: number
  additionalFee: number
  nettPremium: number
  /** Nilai klaim sesuai status, tanpa adjuster fee dan salvage. */
  claimValue: number
  adjusterFee: number
  salvage: number
  /** Klaim + adjuster fee − salvage. */
  incurred: number
  /** Klaim yang dihitung (selain Rejected). */
  claimCount: number
  /** Persen; kosong bila premi pembaginya 0 atau kurang. */
  grossRatio: number | null
  nettRatio: number | null
}

export interface LossRatioYearResult extends LossRatioResult {
  policyId: string
  policyNo: string
  inceptionDate: string
  expiryDate: string
  /** Tahun polis klaim yang sedang dibuka. */
  current: boolean
}

export interface LossRatioTable {
  years: LossRatioYearResult[]
  total: LossRatioResult
}

/** Nilai klaim untuk loss ratio: dibayar bila Settled/Closed, estimasi bila masih berjalan. */
export function lossRatioClaimValue(c: Pick<LossRatioClaim, "status" | "estimatedLoss" | "paidAmount">) {
  if (c.status === "Rejected") return 0
  if (c.status === "Settled" || c.status === "Closed") return c.paidAmount || 0
  return c.estimatedLoss || 0
}

/** `inIdr` memaksa semua nilai ke IDR, supaya baris per tahun sejalan dengan totalnya. */
export function lossRatio(
  policies: readonly LossRatioPolicy[],
  claims: readonly LossRatioClaim[],
  inIdr = false
): LossRatioResult {
  const currencies = new Set([
    ...policies.map((p) => p.currency),
    ...claims.map((c) => c.currency),
  ])
  const currency =
    !inIdr && currencies.size <= 1 ? ([...currencies][0] ?? "IDR") : "IDR"
  const conv = (amount: number, from: string) =>
    from === currency ? amount : toIdr(amount, from)
  const sum = <T>(rows: readonly T[], value: (row: T) => number) =>
    roundCents(rows.reduce((total, row) => total + value(row), 0))

  const premium = sum(policies, (p) => conv(p.premium, p.currency))
  const discount = sum(policies, (p) => conv(p.discountAmount, p.currency))
  const gross = sum(policies, (p) => conv(grossPremium(p), p.currency))
  const brokerage = sum(policies, (p) => conv(policyBrokerage(p), p.currency))
  const additionalFee = sum(policies, (p) => conv(p.additionalFee, p.currency))
  const nett = roundCents(gross - brokerage - additionalFee)

  const counted = claims.filter((c) => c.status !== "Rejected")
  const claimValue = sum(counted, (c) => conv(lossRatioClaimValue(c), c.currency))
  const adjusterFee = sum(counted, (c) => conv(c.adjusterFeeAmount || 0, c.currency))
  const salvage = sum(counted, (c) => conv(c.salvageAmount || 0, c.currency))
  const incurred = roundCents(claimValue + adjusterFee - salvage)
  const ratio = (base: number) => (base > 0 ? (incurred / base) * 100 : null)

  return {
    currency,
    converted: [...currencies].some((c) => c !== currency),
    premium,
    discount,
    grossPremium: gross,
    brokerage,
    additionalFee,
    nettPremium: nett,
    claimValue,
    adjusterFee,
    salvage,
    incurred,
    claimCount: counted.length,
    grossRatio: ratio(gross),
    nettRatio: ratio(nett),
  }
}

/** Klaim dari form atau detail klaim, dalam bentuk yang dihitung loss ratio. */
export function claimForLossRatio(
  id: string,
  c: {
    status: ClaimStatus
    estimatedLoss: number
    paidAmount: number
    adjusterFeeAmount?: number
    salvageAmount?: number
    currency: string
  }
): LossRatioClaim {
  return {
    id,
    status: c.status,
    estimatedLoss: c.estimatedLoss || 0,
    paidAmount: c.paidAmount || 0,
    adjusterFeeAmount: c.adjusterFeeAmount || 0,
    salvageAmount: c.salvageAmount || 0,
    currency: c.currency || "IDR",
  }
}

/**
 * Loss ratio per tahun polis dan totalnya. Isian klaim yang sedang dibuka (`draft`) menggantikan
 * versi tersimpannya dan masuk ke tahun polis klaim itu, supaya angka di form ikut berubah
 * sebelum disimpan.
 */
export function lossRatioTable(data: LossRatioData, draft: LossRatioClaim | null): LossRatioTable {
  const rows = data.years.map((year) => {
    const saved = draft ? year.claims.filter((c) => c.id !== draft.id) : year.claims
    const current = year.policyId === data.currentPolicyId
    return { year, current, claims: draft && current ? [...saved, draft] : saved }
  })
  const total = lossRatio(
    rows.flatMap((r) => r.year.policies),
    rows.flatMap((r) => r.claims)
  )
  return {
    total,
    years: rows.map(({ year, current, claims }) => ({
      ...lossRatio(year.policies, claims, total.converted),
      policyId: year.policyId,
      policyNo: year.policyNo,
      inceptionDate: year.inceptionDate,
      expiryDate: year.expiryDate,
      current,
    })),
  }
}
