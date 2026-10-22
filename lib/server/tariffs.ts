/**
 * OJK Rate Engine & Validation
 *
 * Validates rate lines against OJK regulations (SE OJK No. 6/SEOJK.05/2017)
 * and enforces rate exception requirements for out-of-bounds rates.
 */

import "server-only"

import { Prisma } from "@/lib/generated/prisma/client"
import type { PlacingSlip, RateLine } from "@/lib/data/types"
import { OCCUPATION_TARIFFS, type OccupationTariff } from "@/lib/data/ojk-tariff"
import { matchEqZone, matchFloodRegion } from "@/lib/data/ojk-zones"

// ---------------------------------------------------------------------------
// Rate Boundary Resolution
// ---------------------------------------------------------------------------

/** Rate bounds (min/max) for a rate line. */
export interface RateBounds {
  min: number
  max: number
  source: string
}

/**
 * Get FLEXAS rate bounds from occupation tariff.
 * Returns null if occupation or construction class is invalid.
 */
export function getOccupationBounds(
  occupationCode: string,
  constructionClass: "K1" | "K2" | "K3" | string | undefined
): RateBounds | null {
  const code = occupationCode.trim().split(/[^0-9A-Za-z]/)[0]
  const cls = (constructionClass ?? "").toUpperCase().replace(/^K/, "K") as
    | "K1"
    | "K2"
    | "K3"

  if (!code || !["K1", "K2", "K3"].includes(cls)) return null

  const tariff = OCCUPATION_TARIFFS.find((t: OccupationTariff) => t.code === code)
  const range = tariff?.[cls.toLowerCase() as "k1" | "k2" | "k3"]

  if (!range) return null

  return {
    min: range[0],
    max: range[1],
    source: `FLEXAS okupasi ${code} Kelas ${cls}`,
  }
}

/**
 * Get rate bounds for Property COB from OJK tables.
 * Priority:
 * 1. FLEXAS from occupation & construction class
 * 2. Earthquake zone bounds
 * 3. Flood region bounds
 */
export function getPropertyRateBounds(
  slip: PlacingSlip
): Record<string, RateBounds> {
  const bounds: Record<string, RateBounds> = {}
  const occupationCode = (slip.occupation ?? "").trim()
  const constructionClass = slip.constructionClass as "K1" | "K2" | "K3" | undefined
  const riskLocation = slip.riskLocation ?? ""

  // FLEXAS bounds from occupation tariff
  const flexasBounds = getOccupationBounds(occupationCode, constructionClass)
  if (flexasBounds) {
    bounds["FLEXAS"] = flexasBounds
  }

  // Earthquake bounds from zone
  const eqZone = matchEqZone(riskLocation)
  if (eqZone && eqZone.zone <= 5) {
    // EQ_PROPERTY_TARIFFS not exported, derive bounds from zone
    const baseRate = eqZone.zone
    bounds["EQVET"] = {
      min: 0.75 * baseRate * 0.1,
      max: 1.9 * baseRate * 0.1,
      source: `Zona Gempa ${eqZone.regency} (${eqZone.zone})`,
    }
  }

  // Flood bounds from region
  const floodRegion = matchFloodRegion(riskLocation)
  if (floodRegion) {
    bounds["FWTWD"] = {
      min: 0.045,
      max: 0.055,
      source: `Zona Banjir ${floodRegion}`,
    }
  }

  return bounds
}

/**
 * Get rate bounds for Motor Vehicle COB from OJK tables.
 */
export function getMotorRateBounds(_slip: PlacingSlip): RateBounds | null {
  // TODO: Implement with MOTOR_TARIFFS from ojk-motor.ts
  return null
}

// ---------------------------------------------------------------------------
// Out of Bounds Detection
// ---------------------------------------------------------------------------

/** Check if a rate is out of bounds. */
export function isOutOfBounds(line: RateLine): boolean {
  const rate = line.rate
  if (rate == null) return false
  if (line.min != null && rate < line.min) return true
  if (line.max != null && rate > line.max) return true
  return false
}

/**
 * Get all out-of-bounds lines that lack rate exceptions.
 */
export function getMissingExceptions(
  lines: RateLine[],
  exceptions?: Record<string, { note?: string }>
): Array<{ line: RateLine; reason: "below" | "above" }> {
  return lines
    .filter((l) => {
      const rate = l.rate
      if (rate == null) return false
      const hasException = exceptions?.[l.id]?.note?.trim()
      const below = l.min != null && rate < l.min
      const above = l.max != null && rate > l.max
      return (below || above) && !hasException
    })
    .map((l) => ({
      line: l,
      reason: l.min != null && l.rate != null && l.rate < l.min ? "below" : "above",
    }))
}

// ---------------------------------------------------------------------------
// Brokerage Validation (SE OJK No. 6/SEOJK.05/2017)
// ---------------------------------------------------------------------------

export function getMaxBrokeragePct(cob: string): number | null {
  if (cob === "Property") return 15
  if (cob === "Motor Vehicle") return 25
  return null
}

export function brokerageExceedsCap(slip: PlacingSlip): boolean {
  const cap = getMaxBrokeragePct(slip.cob)
  if (!cap) return false
  return (slip.brokeragePct ?? 0) > cap
}

// ---------------------------------------------------------------------------
// BI Rate Scaling Validation
// ---------------------------------------------------------------------------

export function validateBiRateScaling(
  slip: PlacingSlip
): Array<{ line: RateLine; message: string }> {
  const issues: Array<{ line: RateLine; message: string }> = []
  const flexasLine = slip.rateLines.find((l) => l.label === "FLEXAS")
  const flexasRate = flexasLine?.rate

  const BI_RATE_LABELS = ["BI PAR (FLEXAS + FWTWD + RSMDCC + Others)", "BI EQVET"]

  for (const label of BI_RATE_LABELS) {
    const biLine = slip.rateLines.find((l) => l.label === label)
    if (biLine && biLine.rate != null && flexasRate != null) {
      if (biLine.rate < flexasRate) {
        issues.push({
          line: biLine,
          message: `Rate ${label} (${biLine.rate}) di bawah FLEXAS (${flexasRate})`,
        })
      }
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// Slip Validation before Release
// ---------------------------------------------------------------------------

export interface PreReleaseValidation {
  releaseIssues: string[]
  missingExceptions: Array<{ line: RateLine; reason: "below" | "above" }>
  brokerageIssue?: { max: number; current: number }
  biIssues: Array<{ line: RateLine; message: string }>
}

export async function validatePlacingSlipForRelease(
  slip: PlacingSlip
): Promise<PreReleaseValidation> {
  const releaseIssues: string[] = []
  if (!slip.clientId) releaseIssues.push("Pilih nama tertanggung dari data klien.")
  if (!slip.typeOfCover) releaseIssues.push("Pilih type of cover.")
  if (!slip.correspondenceAddress.trim())
    releaseIssues.push("Isi correspondence address.")
  if (!slip.periodTba) {
    if (!slip.inceptionDate || !slip.expiryDate) {
      releaseIssues.push("Isi periode asuransi atau aktifkan Period TBA.")
    } else if (slip.expiryDate <= slip.inceptionDate) {
      releaseIssues.push("Expiry date harus setelah inception date.")
    }
  }
  if (slip.cob === "Property") {
    if (!slip.occupation) releaseIssues.push("Pilih okupasi OJK.")
    if (!slip.constructionClass) releaseIssues.push("Pilih kelas konstruksi.")
    if (!slip.riskLocation?.trim()) releaseIssues.push("Isi risk location.")
  }
  if (slip.sumInsuredSection1.length + slip.sumInsuredSection2.length === 0) {
    releaseIssues.push("Isi sum insured.")
  }
  if (!slip.rateLines.some((l) => (l.rate ?? 0) > 0)) {
    releaseIssues.push("Isi minimal satu rate.")
  }

  const allLines = slip.rateLines
    .concat(slip.tplLines ?? [])
    .concat(slip.paLines ?? [])
  const missingExceptions = getMissingExceptions(allLines, slip.rateExceptions)

  if (brokerageExceedsCap(slip)) {
    const maxCap = getMaxBrokeragePct(slip.cob)!
    const current = slip.brokeragePct ?? 0
    releaseIssues.push(
      `Brokerage ${current}% melebihi batas maksimal OJK ${maxCap}% untuk ${slip.cob}.`
    )
  }

  const biIssues = slip.cob === "Property" ? validateBiRateScaling(slip) : []

  for (const issue of biIssues) {
    releaseIssues.push(issue.message)
  }

  return {
    releaseIssues,
    missingExceptions,
    brokerageIssue: undefined,
    biIssues,
  }
}

// ---------------------------------------------------------------------------
// Database-backed Rate Exception Saving
// ---------------------------------------------------------------------------

export async function saveRateExceptions(
  tx: any,
  slipId: string,
  exceptions: Record<string, { reason: string; note: string }> | undefined
) {
  if (!exceptions) return

  await tx.rateException.deleteMany({
    where: { slipId },
  })

  for (const [rateLineId, ex] of Object.entries(exceptions)) {
    await tx.rateException.create({
      data: {
        slipId,
        rateLineId,
        reason: ex.reason,
        note: ex.note,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }
}
