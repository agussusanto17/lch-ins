import { totalSumInsured, withoutOjkBounds } from "./calc"
import {
  detectVehicleCategory,
  findMotorExtensionBounds,
  findMotorTariffBounds,
  matchMotorRegion,
  parseVehicleDescription,
} from "./data/ojk-motor"
import type { LineItem, PlacingSlip, RateLine } from "./data/types"
import { itemOwner } from "./slip-items"

/**
 * Cover casco kendaraan Total Loss Only, pilihan selain Comprehensive Casco di form dan upload
 * kendaraan (Harry, 19 November 2026). Kendaraan TLO mengisi rate baris ini dan mengosongkan
 * Comprehensive Casco.
 */
export const TOTAL_LOSS_LINE = "Total Loss Only"

/** Baris cover Total Loss Only, termasuk tulisan "TLO". */
export function isTotalLossLine(label: string) {
  return /total loss|\btlo\b/i.test(label)
}

/**
 * Baris rate yang memakai batas casco OJK: Comprehensive Casco atau Total Loss Only. Loading Rate
 * Comprehensive bukan rate casco (OJK mengaturnya sebagai tambahan rate dasar), jadi tidak
 * dibandingkan dengan batas casco.
 */
export function isCascoLine(label: string) {
  const name = label.toLowerCase()
  if (name.startsWith("loading")) return false
  return isTotalLossLine(label) || name.includes("casco") || name.includes("comprehensive")
}

const hasRate = (l: RateLine) => (l.rate ?? 0) > 0

/** Kendaraan berisi rate Comprehensive Casco dan Total Loss Only sekaligus; premi casco-nya dobel. */
export function hasMixedCasco(lines: readonly RateLine[]) {
  const casco = lines.filter((l) => isCascoLine(l.label) && hasRate(l))
  return casco.some((l) => isTotalLossLine(l.label)) && casco.some((l) => !isTotalLossLine(l.label))
}

/**
 * Jenis cover kendaraan untuk batas perluasan OJK: Total Loss Only bila rate casco yang terisi
 * hanya di baris Total Loss Only, selain itu type of cover slip.
 */
export function vehicleCoverType(
  slip: Pick<PlacingSlip, "typeOfCover" | "coverage">,
  lines: readonly RateLine[]
) {
  const casco = lines.filter((l) => isCascoLine(l.label) && hasRate(l))
  if (casco.length && casco.every((l) => isTotalLossLine(l.label))) return TOTAL_LOSS_LINE
  return slip.typeOfCover || slip.coverage || "Comprehensive"
}

/**
 * Patch rate slip Motor Vehicle, ditambah batas OJK tersimpan perluasan yang dikosongkan untuk
 * kendaraan yang pindah antara Comprehensive dan TLO. Batas tersimpan didahulukan saat dihitung,
 * padahal tarif perluasan TLO berbeda; tanpa ini perluasan kendaraan itu tetap dicek dengan batas
 * cover lamanya. Batas baris casco tidak bergantung pada rate, jadi dibiarkan.
 */
export function cascoSwitchPatch(
  slip: PlacingSlip,
  patch: Partial<PlacingSlip>
): Partial<PlacingSlip> {
  const next = { ...slip, ...patch }
  if (next.cob !== "Motor Vehicle" || !patch.rateLines) return patch
  const coverOf = (s: PlacingSlip) => {
    const owner = itemOwner(s)
    const lines = new Map<string, RateLine[]>()
    for (const l of s.rateLines) {
      const key = owner(l.vehicleId) ?? ""
      lines.set(key, [...(lines.get(key) ?? []), l])
    }
    return new Map([...lines].map(([key, list]) => [key, vehicleCoverType(s, list)]))
  }
  const before = coverOf(slip)
  const after = coverOf(next)
  const switched = new Set([...after].filter(([key, cover]) => before.get(key) !== cover).map(([key]) => key))
  if (!switched.size) return patch
  const owner = itemOwner(next)
  return {
    ...patch,
    rateLines: next.rateLines.map((l) =>
      switched.has(owner(l.vehicleId) ?? "") && !isCascoLine(l.label)
        ? withoutOjkBounds([l])[0]
        : l
    ),
  }
}

/** Label cover kendaraan ditambah Total Loss Only tepat setelah Comprehensive Casco bila belum ada. */
export function withTotalLossLabel(labels: readonly string[]): string[] {
  const casco = labels.findIndex(isCascoLine)
  if (casco < 0 || labels.some(isTotalLossLine)) return [...labels]
  return [...labels.slice(0, casco + 1), TOTAL_LOSS_LINE, ...labels.slice(casco + 1)]
}

/**
 * Kendaraan slip Motor Vehicle yang belum punya baris Total Loss Only (slip sebelum 19 November
 * 2026) mendapat baris kosong tepat setelah Comprehensive Casco-nya. Id barisnya tetap, jadi
 * hasilnya sama setiap kali dipanggil.
 */
export function withTotalLossLines(slip: PlacingSlip): PlacingSlip {
  if (slip.cob !== "Motor Vehicle") return slip
  const owner = itemOwner(slip)
  const done = new Set(
    slip.rateLines.filter((l) => isTotalLossLine(l.label)).map((l) => owner(l.vehicleId) ?? "")
  )
  const rateLines: RateLine[] = []
  for (const line of slip.rateLines) {
    rateLines.push(line)
    const key = owner(line.vehicleId) ?? ""
    if (!isCascoLine(line.label) || done.has(key)) continue
    done.add(key)
    rateLines.push({
      id: `${line.id}-tlo`,
      label: TOTAL_LOSS_LINE,
      rate: null,
      premium: 0,
      ...(line.vehicleId ? { vehicleId: line.vehicleId } : {}),
    })
  }
  return rateLines.length === slip.rateLines.length ? slip : { ...slip, rateLines }
}

/** Slip Motor Vehicle dengan lebih dari satu kendaraan; dokumennya memakai jadwal per kendaraan. */
export function isMultiVehicle(
  slip: Pick<PlacingSlip, "cob" | "interestItems">
) {
  return slip.cob === "Motor Vehicle" && slip.interestItems.length > 1
}

/** Nama kendaraan untuk form dan dokumen: merek, tipe, model, tahun, dan nomor polisi. */
export function vehicleTitle(vehicle: LineItem) {
  const parsed =
    !vehicle.licensePlate && !vehicle.chassisNumber && vehicle.description
      ? parseVehicleDescription(vehicle.description)
      : {}
  const model = vehicle.vehicleModel ?? parsed.vehicleModel
  const year = vehicle.year ?? parsed.year
  const plate = vehicle.licensePlate ?? parsed.licensePlate
  const name =
    [vehicle.vehicleBrandName, vehicle.vehicleTypeName, model]
      .filter(Boolean)
      .join(" ") ||
    vehicle.description ||
    "Kendaraan"
  return [year ? `${name} (${year})` : name, plate].filter(Boolean).join(" · ")
}

/**
 * Kategori, wilayah, dan batas casco OJK satu kendaraan. Kategori ditebak dari merek, tipe,
 * uraian, dan TSI; wilayah dari domisili slip, atau nomor polisi bila domisili kosong.
 */
export function vehicleTariff(
  slip: Pick<PlacingSlip, "riskLocation" | "typeOfCover" | "coverage">,
  vehicle: LineItem,
  /** Jenis cover pengganti type of cover slip, misalnya untuk baris Total Loss Only. */
  cover?: string
) {
  const vehicleDesc = [
    vehicle.vehicleBrandName,
    vehicle.vehicleTypeName,
    vehicle.description,
  ]
    .filter(Boolean)
    .join(" ")
  const locationOrPlate =
    slip.riskLocation || vehicle.licensePlate || vehicle.description || ""
  const coverType = cover || slip.typeOfCover || slip.coverage || "Comprehensive"
  const tsi = vehicle.amount || 0
  return {
    coverType,
    locationOrPlate,
    category: detectVehicleCategory(vehicleDesc, tsi),
    region: matchMotorRegion(locationOrPlate),
    casco: findMotorTariffBounds({ vehicleDesc, tsi, locationOrPlate, coverType }),
  }
}

/**
 * Batas OJK baris rate slip Motor Vehicle, dipakai form dan pengecekan release supaya hasilnya
 * sama. Kategori dan wilayah dihitung per kendaraan. Baris Total Loss Only memakai tarif casco
 * TLO, baris casco lain mengikuti type of cover slip. Perluasan memakai tarif kendaraan itu
 * (`vehicleCoverType`). Batas tersimpan dari panel Referensi Tarif OJK tetap didahulukan.
 */
export function motorRateLinesWithBounds(slip: PlacingSlip): RateLine[] {
  const owner = itemOwner(slip)
  const slipCover = slip.typeOfCover || slip.coverage || "Comprehensive"
  const vehicles = new Map(slip.interestItems.map((v) => [v.id, v]))
  const linesOf = new Map<string, RateLine[]>()
  for (const l of slip.rateLines) {
    const key = owner(l.vehicleId) ?? ""
    linesOf.set(key, [...(linesOf.get(key) ?? []), l])
  }
  // Tarif dihitung sekali per kendaraan dan jenis cover; slip bisa berisi ratusan kendaraan.
  const tariffs = new Map<string, ReturnType<typeof vehicleTariff>>()
  const tariff = (vehicle: LineItem, cover: string) => {
    const k = `${vehicle.id}|${cover}`
    if (!tariffs.has(k)) tariffs.set(k, vehicleTariff(slip, vehicle, cover))
    return tariffs.get(k)!
  }
  const covers = new Map(
    [...linesOf].map(([key, lines]) => [key, vehicleCoverType(slip, lines)])
  )
  const fallback = (cover: string) => ({
    region: matchMotorRegion(slip.riskLocation ?? ""),
    casco: findMotorTariffBounds({
      vehicleDesc: "",
      tsi: totalSumInsured(slip),
      locationOrPlate: slip.riskLocation ?? "",
      coverType: cover,
    }),
  })

  return slip.rateLines.map((l) => {
    if (l.min != null || l.max != null) return l
    const key = owner(l.vehicleId) ?? ""
    const vehicle = vehicles.get(key)
    const of = (cover: string) => (vehicle ? tariff(vehicle, cover) : fallback(cover))
    if (isCascoLine(l.label)) {
      const { casco } = of(isTotalLossLine(l.label) ? TOTAL_LOSS_LINE : slipCover)
      if (casco) return { ...l, min: casco.min, max: casco.max, boundSource: casco.source }
    }
    const cover = covers.get(key) ?? slipCover
    const ext = findMotorExtensionBounds(l.label, cover, of(slipCover).region)
    return ext ? { ...l, min: ext.min, max: ext.max, boundSource: ext.source } : l
  })
}
