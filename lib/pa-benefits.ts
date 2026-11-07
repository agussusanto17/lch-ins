/**
 * Limit manfaat PA untuk peringatan klaim (Harry, 7 November 2026): klaim PA
 * diberi peringatan bila nilainya melebihi UP peserta atau limit manfaat
 * meninggal, cacat, dan biaya medis. Limit ditulis dalam persen UP per kode
 * lookup pa_benefit di Master Data.
 */
import { money, num } from "./format"

/** Persen UP per kode manfaat, misalnya { death: 100, medical: 10 }. */
export type PaBenefitLimits = Record<string, number>

/** Jenis manfaat dari Master Data (lookup pa_benefit). */
export interface PaBenefitOption {
  id: string
  code: string
  name: string
}

/**
 * Bawaan dari contoh slip PA LCH (Salam Pacific grup dan ekspatriat): Death
 * 100%, Permanent Disablement sampai 100%, Medical Expenses 10% dari UP.
 */
export const DEFAULT_PA_BENEFIT_LIMITS: PaBenefitLimits = {
  death: 100,
  disability: 100,
  medical: 10,
}

/** Batas isian persen; manfaat berlipat bisa di atas 100%. */
export const PA_LIMIT_MAX_PCT = 1000

/** Limit yang valid saja: kode berisi dan persen 0 sampai PA_LIMIT_MAX_PCT. */
export function cleanPaBenefitLimits(input: unknown): PaBenefitLimits {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {}
  const limits: PaBenefitLimits = {}
  for (const [rawCode, value] of Object.entries(input as Record<string, unknown>)) {
    const code = rawCode.trim()
    const pct = typeof value === "number" ? value : Number(value)
    if (code && value !== null && value !== "" && Number.isFinite(pct) && pct >= 0 && pct <= PA_LIMIT_MAX_PCT) {
      limits[code] = pct
    }
  }
  return limits
}

/** Limit yang berlaku: isian slip atau polis menimpa bawaan. */
export function effectivePaBenefitLimits(stored: unknown): PaBenefitLimits {
  return { ...DEFAULT_PA_BENEFIT_LIMITS, ...cleanPaBenefitLimits(stored) }
}

/** Nilai limit dalam mata uang polis: UP × persen, dibulatkan ke sen. */
export function paBenefitLimitAmount(sumInsured: number, limitPct: number) {
  return Math.round(sumInsured * limitPct) / 100
}

/** Keterangan limit, misalnya "10% × UP IDR 100.000.000 = IDR 10.000.000". */
export function paBenefitLimitText(sumInsured: number, limitPct: number, currency: string) {
  return `${num(limitPct, 0, 2)}% × UP ${money(sumInsured, currency)} = ${money(
    paBenefitLimitAmount(sumInsured, limitPct),
    currency
  )}`
}

const CLAIM_AMOUNTS = [
  { key: "estimatedLoss", label: "Estimasi kerugian" },
  { key: "claimedAmount", label: "Nilai diajukan" },
  { key: "paidAmount", label: "Nilai disetujui/dibayar" },
] as const

/**
 * Peringatan nilai klaim PA, satu per nilai yang melebihi UP peserta atau
 * limit jenis manfaatnya. Peringatan tidak menahan penyimpanan.
 */
export function paClaimWarnings(
  claim: { estimatedLoss: number; claimedAmount: number; paidAmount: number; currency: string },
  context: { sumInsured: number; limitPct: number | null; benefitName: string | null }
): string[] {
  const { sumInsured, limitPct, benefitName } = context
  if (!(sumInsured > 0)) return []
  const limit = limitPct != null ? paBenefitLimitAmount(sumInsured, limitPct) : null
  const warnings: string[] = []
  for (const { key, label } of CLAIM_AMOUNTS) {
    const amount = claim[key]
    if (!(amount > 0)) continue
    const value = `${label} ${money(amount, claim.currency)}`
    if (amount > sumInsured) {
      warnings.push(`${value} melebihi UP peserta ${money(sumInsured, claim.currency)}.`)
    } else if (limit != null && amount > limit) {
      warnings.push(
        `${value} melebihi limit ${benefitName ?? "manfaat"} (${paBenefitLimitText(sumInsured, limitPct!, claim.currency)}).`
      )
    }
  }
  return warnings
}
