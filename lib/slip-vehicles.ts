import {
  detectVehicleCategory,
  findMotorTariffBounds,
  matchMotorRegion,
  parseVehicleDescription,
} from "./data/ojk-motor"
import { MOTOR_RATE_LINES } from "./data/reference"
import type { LineItem, PlacingSlip, RateLine } from "./data/types"

type LineGroup = "rateLines" | "tplLines" | "paLines"
const LINE_GROUPS: LineGroup[] = ["rateLines", "tplLines", "paLines"]

/**
 * Kendaraan pemilik sebuah baris rate, TPL, atau PA slip Motor Vehicle.
 * Baris tanpa kendaraan (slip lama) ikut kendaraan pertama; baris milik
 * kendaraan yang sudah dihapus tidak punya pemilik (null).
 */
export function vehicleOwner(slip: Pick<PlacingSlip, "interestItems">) {
  const ids = new Set(slip.interestItems.map((v) => v.id))
  const first = slip.interestItems[0]?.id ?? null
  return (vehicleId?: string | null) =>
    !vehicleId ? first : ids.has(vehicleId) ? vehicleId : null
}

export interface VehicleGroup {
  vehicle: LineItem
  /** Nomor kendaraan di form dan dokumen, mulai 1. */
  no: number
  rateLines: RateLine[]
  tplLines: RateLine[]
  paLines: RateLine[]
}

/** Baris rate, TPL, dan PA setiap kendaraan, sesuai urutan kendaraan. */
export function vehicleGroups(
  slip: Pick<PlacingSlip, "interestItems" | LineGroup>
): VehicleGroup[] {
  const owner = vehicleOwner(slip)
  return slip.interestItems.map((vehicle, i) => {
    const mine = (l: RateLine) => owner(l.vehicleId) === vehicle.id
    return {
      vehicle,
      no: i + 1,
      rateLines: slip.rateLines.filter(mine),
      tplLines: slip.tplLines.filter(mine),
      paLines: slip.paLines.filter(mine),
    }
  })
}

/** Slip Motor Vehicle dengan lebih dari satu kendaraan; dokumennya memakai jadwal per kendaraan. */
export function isMultiVehicle(
  slip: Pick<PlacingSlip, "cob" | "interestItems">
) {
  return slip.cob === "Motor Vehicle" && slip.interestItems.length > 1
}

/**
 * Baris standar kendaraan yang belum punya rate, sama seperti slip satu
 * kendaraan: casco dan perluasan, dua limit TPL, serta PA Driver dan
 * Passenger. Id diturunkan dari id kendaraan supaya hitung ulang selalu
 * menghasilkan slip yang sama.
 */
function standardLines(
  vehicleId: string,
  labels: string[]
): Pick<PlacingSlip, LineGroup> {
  return {
    rateLines: labels.map((label, i) => ({
      id: `${vehicleId}-r${i + 1}`,
      label,
      rate: null,
      premium: 0,
      vehicleId,
    })),
    tplLines: [1, 2].map((n) => ({
      id: `${vehicleId}-t${n}`,
      label: "Third Party Liability",
      rate: null,
      premium: 0,
      basis: "0",
      vehicleId,
    })),
    paLines: ["Driver", "Passenger"].map((label, i) => ({
      id: `${vehicleId}-p${i + 1}`,
      label,
      rate: null,
      premium: 0,
      basis: "0",
      vehicleId,
    })),
  }
}

/**
 * Setiap baris rate, TPL, dan PA slip Motor Vehicle menunjuk kendaraannya,
 * dan setiap kendaraan punya baris rate sendiri (Harry, 5 November 2026).
 * Baris kendaraan yang dihapus ikut hilang; deductible-nya pindah ke
 * kendaraan pertama, tempat deductible per cover disimpan.
 */
export function withVehicles(slip: PlacingSlip): PlacingSlip {
  if (slip.cob !== "Motor Vehicle" || !slip.interestItems.length) return slip
  const owner = vehicleOwner(slip)
  const first = slip.interestItems[0].id
  const next = { ...slip }

  for (const key of LINE_GROUPS) {
    const carried = new Map<string, string[]>()
    const kept: RateLine[] = []
    for (const line of slip[key]) {
      const vehicleId = owner(line.vehicleId)
      if (!vehicleId) {
        if (line.deductibles?.length) carried.set(line.label, line.deductibles)
        continue
      }
      kept.push(line.vehicleId === vehicleId ? line : { ...line, vehicleId })
    }
    next[key] = kept.map((line) => {
      const deductibles = carried.get(line.label)
      if (!deductibles || line.vehicleId !== first || line.deductibles?.length) {
        return line
      }
      carried.delete(line.label)
      return { ...line, deductibles }
    })
  }

  const firstLabels = next.rateLines
    .filter((l) => l.vehicleId === first)
    .map((l) => l.label)
  for (const vehicle of slip.interestItems) {
    if (next.rateLines.some((l) => l.vehicleId === vehicle.id)) continue
    const lines = standardLines(
      vehicle.id,
      firstLabels.length ? firstLabels : MOTOR_RATE_LINES
    )
    for (const key of LINE_GROUPS) next[key] = [...next[key], ...lines[key]]
  }
  return next
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
 * Kategori, wilayah, dan batas casco OJK satu kendaraan. Kategori ditebak dari
 * merek, tipe, dan uraian kendaraan beserta TSI-nya; wilayah dari domisili
 * slip, atau nomor polisi kendaraan bila domisili kosong.
 */
export function vehicleTariff(
  slip: Pick<PlacingSlip, "riskLocation" | "typeOfCover" | "coverage">,
  vehicle: LineItem
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
  const coverType = slip.typeOfCover || slip.coverage || "Comprehensive"
  const tsi = vehicle.amount || 0
  return {
    coverType,
    locationOrPlate,
    category: detectVehicleCategory(vehicleDesc, tsi),
    region: matchMotorRegion(locationOrPlate),
    casco: findMotorTariffBounds({ vehicleDesc, tsi, locationOrPlate, coverType }),
  }
}
