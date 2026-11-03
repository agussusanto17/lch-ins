import "server-only"

import type { PlacingSlip, RateLine } from "@/lib/data/types"
import { totalSumInsured } from "@/lib/calc"
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

export function getPropertyRateBounds(
  slip: PlacingSlip
): Record<string, RateBounds> {
  const bounds: Record<string, RateBounds> = {}
  const occupationCode = (slip.occupation ?? "").trim()
  const constructionClass = slip.constructionClass as "K1" | "K2" | "K3" | undefined
  const riskLocation = slip.riskLocation ?? ""

  const flexasBounds = getOccupationBounds(occupationCode, constructionClass)
  if (flexasBounds) {
    bounds["FLEXAS"] = flexasBounds
  }

  // Lampiran III Tabel III.A: tarif gempa tetap per kategori konstruksi dan
  // zona. Slip belum mencatat kategori konstruksi gempa (jumlah lantai,
  // rangka), jadi batasnya rentang semua kategori di zona itu. Rumah tinggal
  // (okupasi 2976) memakai baris DW, selainnya baris Com.
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

  // Lampiran II Tabel II.A dalam persen, baris rate properti dalam per mil.
  // Zona banjir tidak tercatat di slip dan zona tinggi memakai tarif Zona 1
  // ditambah loading, jadi hanya batas bawah Zona 1 yang dijaga.
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

export function getMotorRateBounds(slip: PlacingSlip): RateBounds | null {
  if (slip.cob !== "Motor Vehicle") return null
  const tsi = totalSumInsured(slip)
  const vehicleDesc = slip.interestItems.map((i) => i.description).join(" ")
  const locationOrPlate = slip.riskLocation || vehicleDesc || ""
  const coverType = slip.typeOfCover || slip.coverage || "Comprehensive"

  return findMotorTariffBounds({
    vehicleDesc,
    tsi,
    locationOrPlate,
    coverType,
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
  if (slip.cob === "Property") {
    const propBounds = getPropertyRateBounds(slip)
    return slip.rateLines.map((l) => {
      if (l.min != null || l.max != null) return l
      const b = propBounds[l.label]
      if (b) {
        return { ...l, min: b.min, max: b.max, boundSource: b.source }
      }
      return l
    })
  }

  if (slip.cob === "Motor Vehicle") {
    const motorCascoBounds = getMotorRateBounds(slip)
    const coverType = slip.typeOfCover || slip.coverage || "Comprehensive"
    const vehicleDesc = slip.interestItems.map((i) => i.description).join(" ")
    const region = matchMotorRegion(slip.riskLocation || vehicleDesc || "")
    return slip.rateLines.map((l) => {
      if (l.min != null || l.max != null) return l
      if (
        l.label === "Comprehensive Casco" ||
        l.label === "Total Loss Only" ||
        l.label.toLowerCase().includes("casco") ||
        l.label.toLowerCase().includes("comprehensive")
      ) {
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

/** Brokerage caps per SE OJK No. 6/SEOJK.05/2017. */
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

export interface PreReleaseValidation {
  canRelease: boolean
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
  if (totalSumInsured(slip) <= 0) {
    releaseIssues.push("Isi sum insured.")
  }
  if (!slip.rateLines.some((l) => (l.rate ?? 0) > 0)) {
    releaseIssues.push("Isi minimal satu rate.")
  }

  const boundedRateLines = attachSlipRateBounds(slip)
  const boundedTpl = (slip.tplLines ?? []).map((l) => {
    if (l.min != null || l.max != null) return l
    const b = findMotorExtensionBounds(l.label)
    return b ? { ...l, min: b.min, max: b.max, boundSource: b.source } : l
  })
  const boundedPa = (slip.paLines ?? []).map((l) => {
    if (l.min != null || l.max != null) return l
    const b = findMotorPaBounds(l.label)
    return b ? { ...l, min: b.min, max: b.max, boundSource: b.source } : l
  })

  const allLines = boundedRateLines.concat(boundedTpl).concat(boundedPa)
  const missingExceptions = getMissingExceptions(allLines, slip.rateExceptions)

  let brokerageIssue: PreReleaseValidation["brokerageIssue"]
  if (brokerageExceedsCap(slip)) {
    const maxCap = getMaxBrokeragePct(slip.cob)!
    const current = slip.brokeragePct ?? 0
    brokerageIssue = { max: maxCap, current }
    releaseIssues.push(
      `Brokerage ${current}% melebihi batas maksimal OJK ${maxCap}% untuk ${slip.cob}.`
    )
  }

  const biIssues = slip.cob === "Property" ? validateBiRateScaling(slip) : []

  for (const issue of biIssues) {
    releaseIssues.push(issue.message)
  }

  const canRelease =
    releaseIssues.length === 0 &&
    missingExceptions.length === 0 &&
    !brokerageIssue &&
    biIssues.length === 0

  return {
    canRelease,
    releaseIssues,
    missingExceptions,
    brokerageIssue,
    biIssues,
  }
}
