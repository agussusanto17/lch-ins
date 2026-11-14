import {
  detectVehicleCategory,
  findMotorTariffBounds,
  matchMotorRegion,
  parseVehicleDescription,
} from "./data/ojk-motor"
import type { LineItem, PlacingSlip } from "./data/types"

/**
 * Baris rate yang memakai batas casco OJK. Loading Rate Comprehensive bukan rate casco
 * (OJK mengaturnya sebagai tambahan rate dasar), jadi tidak dibandingkan dengan batas casco.
 */
export function isCascoLine(label: string) {
  const name = label.toLowerCase()
  if (name.startsWith("loading")) return false
  return (
    label === "Total Loss Only" ||
    name.includes("casco") ||
    name.includes("comprehensive")
  )
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
