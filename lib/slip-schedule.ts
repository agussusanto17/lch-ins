import { parseVehicleDescription } from "./data/ojk-motor"
import type { LineItem, PlacingSlip, RateLine } from "./data/types"
import { itemGroups } from "./slip-items"
import { isMultiLocation } from "./slip-locations"
import { isCascoLine, isMultiVehicle } from "./slip-vehicles"

/** Isi badan dokumen untuk rincian yang dicetak di tabel lampiran. */
export const AS_ATTACHED = "As Attached"

/**
 * Slip berisi banyak lokasi atau kendaraan: badan dokumen cukup menulis "As
 * Attached", rinciannya dicetak di tabel lampiran setelah tanda tangan,
 * seperti CI LCH Truckindo dan SBI Fleet (Agus, 9 November 2026). PA grup
 * sudah memakai lampiran DAFTAR PESERTA. COB lain dengan beberapa objek tetap
 * dicetak di badan dokumen, karena isinya biasanya daftar limit.
 */
export function printsUnitsAsAttached(
  slip: Pick<PlacingSlip, "cob" | "locations" | "interestItems">
) {
  return isMultiLocation(slip) || isMultiVehicle(slip)
}

/**
 * Nilai yang sama untuk semua unit dicetak sekali; nilai yang berbeda menjadi
 * "As Attached". Kosong semua berarti barisnya tidak dicetak.
 */
export function sameOrAttached(values: (string | null | undefined)[]) {
  const unique = new Set(values.map((v) => (v ?? "").trim()))
  return unique.size === 1 ? [...unique][0] : AS_ATTACHED
}

export interface VehicleDetail {
  /** Merek, tipe, dan model, misalnya "Isuzu Giga GVR 34 H". */
  name: string
  year: string
  plate: string
  chassis: string
  engine: string
  color: string
}

/** Rincian kendaraan dari isian terstruktur, atau dari uraian kendaraan lama. */
export function vehicleDetail(item: LineItem): VehicleDetail {
  const parsed =
    !item.licensePlate && !item.chassisNumber && item.description
      ? parseVehicleDescription(item.description)
      : {}
  const model = item.vehicleModel ?? parsed.vehicleModel ?? ""
  const name =
    [item.vehicleBrandName, item.vehicleTypeName, model].filter(Boolean).join(" ") ||
    item.description?.split("\n")[0]?.trim() ||
    "Kendaraan"
  const text = (v: unknown) => (v == null ? "" : String(v).trim())
  return {
    name,
    year: text(item.year ?? parsed.year),
    plate: text(item.licensePlate ?? parsed.licensePlate).toUpperCase(),
    chassis: text(item.chassisNumber ?? parsed.chassisNumber),
    engine: text(item.engineNumber ?? parsed.engineNumber),
    color: text(item.color ?? parsed.color),
  }
}

/** Singkatan perluasan jaminan di tabel DAFTAR UNIT KENDARAAN, seperti CI Truckindo. */
const EXTENSION_SHORT: Record<string, string> = {
  "Flood, Windstorm, Tempest & Water Damage": "FWTWD",
  "Earthquake, Volcanic Eruption & Tsunami": "EQVET",
  "Strike, Riot, Civil Commotion": "SRCC",
  "Terrorism & Sabotage": "TS",
  "Loading Rate Comprehensive": "Loading",
  "Authorized Workshop": "Bengkel Resmi",
}

export function extensionShort(label: string) {
  return EXTENSION_SHORT[label] ?? label
}

export interface RateCell {
  rate: number | null
  premium: number
}

export interface VehicleScheduleRow {
  no: number
  vehicle: VehicleDetail
  sumInsured: number
  /** Cover utama: Comprehensive Casco atau Total Loss Only. */
  coverage: (RateCell & { label: string }) | null
  /** Perluasan per label, mengikuti `extensionLabels`. */
  extensions: Record<string, RateCell>
  tplLimit: number
  tplPremium: number
  paDriverLimit: number
  paDriverPremium: number
  paPassengerLimit: number
  paPassengerPremium: number
  total: number
}

const shown = (l: RateLine) => l.rate !== null || l.premium > 0
const sumPremium = (lines: RateLine[]) => lines.reduce((a, l) => a + l.premium, 0)
const sumLimit = (lines: RateLine[]) =>
  lines.reduce((a, l) => a + (Number(l.basis ?? 0) || 0), 0)
const isPassenger = (l: RateLine) => /passenger|penumpang/i.test(l.label)

/**
 * Tabel DAFTAR UNIT KENDARAAN: satu baris per kendaraan dengan cover utama,
 * perluasan, TPL, PA, dan total premi kendaraan itu. Kolom perluasan hanya
 * yang dipakai salah satu kendaraan, sesuai urutan pertama kali muncul.
 */
export function vehicleSchedule(
  slip: Pick<PlacingSlip, "interestItems" | "rateLines" | "tplLines" | "paLines">
) {
  const extensionLabels: string[] = []
  const rows: VehicleScheduleRow[] = itemGroups(slip).map((g) => {
    const lines = g.rateLines.filter(shown)
    const main = lines.find((l) => isCascoLine(l.label)) ?? null
    const extensions: Record<string, RateCell> = {}
    for (const l of lines) {
      if (l === main) continue
      if (!extensionLabels.includes(l.label)) extensionLabels.push(l.label)
      extensions[l.label] = { rate: l.rate, premium: l.premium }
    }
    const tpl = g.tplLines.filter(shown)
    const pa = g.paLines.filter(shown)
    const driver = pa.filter((l) => !isPassenger(l))
    const passenger = pa.filter(isPassenger)
    return {
      no: g.no,
      vehicle: vehicleDetail(g.item),
      sumInsured: g.item.amount || 0,
      coverage: main ? { label: main.label, rate: main.rate, premium: main.premium } : null,
      extensions,
      tplLimit: sumLimit(tpl),
      tplPremium: sumPremium(tpl),
      paDriverLimit: sumLimit(driver),
      paDriverPremium: sumPremium(driver),
      paPassengerLimit: sumLimit(passenger),
      paPassengerPremium: sumPremium(passenger),
      total: sumPremium(g.rateLines) + sumPremium(g.tplLines) + sumPremium(g.paLines),
    }
  })
  return { extensionLabels, rows }
}
