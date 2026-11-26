import "server-only"

import type { PlacingSlip, RateLine } from "@/lib/data/types"
import {
  locationIssues,
  slipSectionTitles,
  vehicleIssues,
} from "@/components/underwriting/slip-model"
import { openCoverIssues, usesOpenCover } from "@/lib/open-cover"
import { coverNameIssues, missingRateIssue } from "@/lib/slip-items"
import { participantIssues } from "@/lib/slip-participants"
import { motorRateLinesWithBounds } from "@/lib/slip-vehicles"
import { validateClauseUniquenessAcrossSections } from "@/lib/validation"
import {
  brokerageLimitIssue,
  maxBrokeragePct,
  totalSumInsured,
  usesOjkTariff,
  withoutOjkBounds,
} from "@/lib/calc"
import {
  getOccupationBounds,
  getPropertyRateBounds,
  propertyRateLinesWithBounds,
  type RateBounds,
} from "@/lib/property-rate-bounds"
import {
  findMotorTariffBounds,
  findMotorExtensionBounds,
  findMotorPaBounds,
} from "@/lib/data/ojk-motor"
import { hullScheduleIssues, usesHullSchedule } from "@/lib/marine-hull"

// Batas Property dipakai bersama form dan server (lib/property-rate-bounds.ts).
export { getOccupationBounds, getPropertyRateBounds, type RateBounds }

/** Batas casco OJK slip Motor Vehicle tanpa kendaraan, dari total TSI dan domisili. */
export function getMotorRateBounds(slip: PlacingSlip): RateBounds | null {
  if (slip.cob !== "Motor Vehicle") return null
  return findMotorTariffBounds({
    vehicleDesc: "",
    tsi: totalSumInsured(slip),
    locationOrPlate: slip.riskLocation ?? "",
    coverType: slip.typeOfCover || slip.coverage || "Comprehensive",
  })
}

export function getMotorExtensionBounds(
  extensionLabel: string,
  coverType?: string,
  region?: string | null
): RateBounds | null {
  return findMotorExtensionBounds(extensionLabel, coverType, region)
}

export function attachSlipRateBounds(slip: PlacingSlip): RateLine[] {
  // Type of cover tanpa tarif OJK, misalnya Heavy Equipment, tidak punya batas.
  if (!usesOjkTariff(slip)) return withoutOjkBounds(slip.rateLines)
  if (slip.cob === "Property") return propertyRateLinesWithBounds(slip)

  // Motor Vehicle memakai fungsi yang sama dengan form (lib/slip-vehicles.ts).
  if (slip.cob === "Motor Vehicle") return motorRateLinesWithBounds(slip)

  return slip.rateLines
}

export function isOutOfBounds(line: RateLine): boolean {
  const rate = line.rate
  if (rate == null) return false
  if (line.min != null && rate < line.min) return true
  if (line.max != null && rate > line.max) return true
  return false
}

/** Out-of-bounds lines that have no exception note yet. */
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

export interface PreReleaseValidation {
  canRelease: boolean
  releaseIssues: string[]
  missingExceptions: Array<{ line: RateLine; reason: "below" | "above" }>
  brokerageIssue?: { max: number; current: number; message: string }
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
    } else if (slip.expiryDate < slip.inceptionDate) {
      // Tanggal sama boleh: acara satu hari, misalnya turnamen Hole in One.
      releaseIssues.push("Expiry date tidak boleh sebelum inception date.")
    }
  }
  releaseIssues.push(...locationIssues(slip), ...vehicleIssues(slip))
  if (usesHullSchedule(slip)) releaseIssues.push(...hullScheduleIssues(slip.hullSchedule))
  if (slipSectionTitles(slip)) {
    const clauseIssues = validateClauseUniquenessAcrossSections(slip)
    if (clauseIssues.length) releaseIssues.push(...clauseIssues)
  }
  // Open cover tanpa TSI dan premi; cukup rate per kategori.
  if (usesOpenCover(slip)) {
    releaseIssues.push(...openCoverIssues(slip))
  } else {
    if (totalSumInsured(slip) <= 0) {
      releaseIssues.push("Isi sum insured.")
    }
    const rateIssue = missingRateIssue(slip)
    if (rateIssue) releaseIssues.push(rateIssue)
  }
  releaseIssues.push(...coverNameIssues(slip))
  releaseIssues.push(...participantIssues(slip))

  const ojk = usesOjkTariff(slip)
  const boundedRateLines = attachSlipRateBounds(slip)
  const boundedTpl = ojk
    ? (slip.tplLines ?? []).map((l) => {
        if (l.min != null || l.max != null) return l
        const b = findMotorExtensionBounds(l.label)
        return b ? { ...l, min: b.min, max: b.max, boundSource: b.source } : l
      })
    : withoutOjkBounds(slip.tplLines ?? [])
  const boundedPa = ojk
    ? (slip.paLines ?? []).map((l) => {
        if (l.min != null || l.max != null) return l
        const b = findMotorPaBounds(l.label)
        return b ? { ...l, min: b.min, max: b.max, boundSource: b.source } : l
      })
    : withoutOjkBounds(slip.paLines ?? [])

  const allLines = boundedRateLines.concat(boundedTpl).concat(boundedPa)
  const missingExceptions = getMissingExceptions(allLines, slip.rateExceptions)

  let brokerageIssue: PreReleaseValidation["brokerageIssue"]
  const brokerageMessage = brokerageLimitIssue(slip)
  if (brokerageMessage) {
    brokerageIssue = {
      max: maxBrokeragePct(slip)!,
      current: slip.brokeragePct ?? 0,
      message: brokerageMessage,
    }
    releaseIssues.push(brokerageMessage)
  }

  const canRelease =
    releaseIssues.length === 0 &&
    missingExceptions.length === 0 &&
    !brokerageIssue

  return {
    canRelease,
    releaseIssues,
    missingExceptions,
    brokerageIssue,
  }
}
