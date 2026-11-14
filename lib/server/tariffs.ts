import "server-only"

import type { PlacingSlip, RateLine, SlipLocation } from "@/lib/data/types"
import {
  locationIssues,
  slipSectionTitles,
  vehicleIssues,
} from "@/components/underwriting/slip-model"
import { locationOwner, slipLocations } from "@/lib/slip-locations"
import { openCoverIssues, usesOpenCover } from "@/lib/open-cover"
import { coverNameIssues, itemOwner, missingRateIssue } from "@/lib/slip-items"
import { participantIssues } from "@/lib/slip-participants"
import { isCascoLine, vehicleTariff } from "@/lib/slip-vehicles"
import { validateClauseUniquenessAcrossSections } from "@/lib/validation"
import {
  brokerageLimitIssue,
  maxBrokeragePct,
  totalSumInsured,
  usesOjkTariff,
  withoutOjkBounds,
} from "@/lib/calc"
import {
  EQ_PROPERTY_TARIFFS,
  FLOOD_TARIFFS,
  OCCUPATION_TARIFFS,
  type OccupationTariff,
} from "@/lib/data/ojk-tariff"
import { matchEqZone, matchFloodRegion } from "@/lib/data/ojk-zones"
import {
  findMotorTariffBounds,
  findMotorExtensionBounds,
  findMotorPaBounds,
  matchMotorRegion,
} from "@/lib/data/ojk-motor"

export interface RateBounds {
  min: number
  /** null bila tidak ada batas atas, misalnya banjir zona tinggi yang memakai loading. */
  max: number | null
  source: string
}

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
 * Batas OJK satu lokasi slip Property: FLEXAS dari okupasi dan kelas
 * konstruksi, gempa dan banjir dari wilayah alamatnya.
 */
export function getPropertyRateBounds(
  location: Pick<SlipLocation, "occupation" | "constructionClass" | "riskLocation">
): Record<string, RateBounds> {
  const bounds: Record<string, RateBounds> = {}
  const occupationCode = (location.occupation ?? "").trim()
  const constructionClass = location.constructionClass as
    | "K1"
    | "K2"
    | "K3"
    | undefined
  const riskLocation = location.riskLocation ?? ""

  const flexasBounds = getOccupationBounds(occupationCode, constructionClass)
  if (flexasBounds) {
    bounds["FLEXAS"] = flexasBounds
  }

  // Lampiran III Tabel III.A: slip belum mencatat kategori konstruksi gempa, jadi batasnya rentang
  // semua kategori di zona itu. Rumah tinggal (okupasi 2976) memakai baris DW, selainnya Com.
  const eqZone = matchEqZone(riskLocation)
  if (eqZone && eqZone.zone >= 1 && eqZone.zone <= 5) {
    const dwelling = occupationCode.split(/[^0-9A-Za-z]/)[0].startsWith("2976")
    const rates = EQ_PROPERTY_TARIFFS.filter((t) =>
      t.construction.startsWith(dwelling ? "DW:" : "Com:")
    ).map((t) => t.z[eqZone.zone - 1])
    bounds["EQVET"] = {
      min: Math.min(...rates),
      max: Math.max(...rates),
      source: `Gempa ${dwelling ? "Dwelling" : "Commercial"} Zona ${eqZone.zone}, ${eqZone.regency}`,
    }
  }

  // Lampiran II Tabel II.A dalam persen, rate properti dalam per mil. Zona banjir tidak tercatat
  // di slip dan zona tinggi memakai Zona 1 plus loading, jadi hanya batas bawah Zona 1 dijaga.
  const floodRegion = matchFloodRegion(riskLocation)
  const floodZone1 = FLOOD_TARIFFS.find(
    (t) =>
      t.line === "Harta Benda" && t.region === floodRegion && t.zone === "Zona 1"
  )
  if (floodRegion && floodZone1?.min != null) {
    bounds["FWTWD"] = {
      min: Number((floodZone1.min * 10).toFixed(6)),
      max: null,
      source: `Banjir ${floodRegion}, batas bawah Zona 1`,
    }
  }

  return bounds
}

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
  if (slip.cob === "Property") {
    const owner = locationOwner(slip)
    const byLocation = new Map(
      slipLocations(slip).map((location) => [
        location.id,
        getPropertyRateBounds(location),
      ])
    )
    return slip.rateLines.map((l) => {
      if (l.min != null || l.max != null) return l
      const b = byLocation.get(owner(l.locationId))?.[l.label]
      if (b) {
        return { ...l, min: b.min, max: b.max, boundSource: b.source }
      }
      return l
    })
  }

  if (slip.cob === "Motor Vehicle") {
    // Kategori dan wilayah OJK dihitung per kendaraan.
    const owner = itemOwner(slip)
    const tariffs = new Map(
      slip.interestItems.map((v) => [v.id, vehicleTariff(slip, v)])
    )
    const fallback = {
      coverType: slip.typeOfCover || slip.coverage || "Comprehensive",
      region: matchMotorRegion(slip.riskLocation ?? ""),
      casco: getMotorRateBounds(slip),
    }
    return slip.rateLines.map((l) => {
      if (l.min != null || l.max != null) return l
      const {
        coverType,
        region,
        casco: motorCascoBounds,
      } = tariffs.get(owner(l.vehicleId) ?? "") ?? fallback
      if (isCascoLine(l.label)) {
        if (motorCascoBounds) {
          return {
            ...l,
            min: motorCascoBounds.min,
            max: motorCascoBounds.max,
            boundSource: motorCascoBounds.source,
          }
        }
      }
      const extBounds = findMotorExtensionBounds(l.label, coverType, region)
      if (extBounds) {
        return {
          ...l,
          min: extBounds.min,
          max: extBounds.max,
          boundSource: extBounds.source,
        }
      }
      return l
    })
  }

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
