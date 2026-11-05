import { MOTOR_RATE_LINES } from "./data/reference"
import type {
  ClassOfBusiness,
  LineItem,
  PlacingSlip,
  RateLine,
} from "./data/types"

type LineGroup = "rateLines" | "tplLines" | "paLines"
const LINE_GROUPS: LineGroup[] = ["rateLines", "tplLines", "paLines"]

/** Label baris rate tunggal di COB selain Property dan Motor Vehicle. */
export const GENERIC_RATE_LABEL = "Rate (%)"

/**
 * COB yang rate-nya per baris Interest Insured: Motor Vehicle per kendaraan
 * (Harry, 5 November 2026) dan COB lain per objek, misalnya peserta PA, unit
 * mesin MB, atau alat CPM (Agus, 5 November 2026). Property memakai lokasi.
 */
export function usesItemRates(cob: ClassOfBusiness) {
  return cob !== "Property"
}

/**
 * Baris Interest pemilik sebuah baris rate, TPL, atau PA. Field-nya bernama
 * `vehicleId` karena mula-mula dipakai untuk kendaraan; di COB lain isinya
 * objek. Baris tanpa pemilik (slip lama) ikut baris Interest pertama; baris
 * milik objek yang sudah dihapus tidak punya pemilik (null).
 */
export function itemOwner(slip: Pick<PlacingSlip, "interestItems">) {
  const ids = new Set(slip.interestItems.map((v) => v.id))
  const first = slip.interestItems[0]?.id ?? null
  return (itemId?: string | null) =>
    !itemId ? first : ids.has(itemId) ? itemId : null
}

export interface ItemGroup {
  item: LineItem
  /** Nomor objek atau kendaraan di form dan dokumen, mulai 1. */
  no: number
  rateLines: RateLine[]
  tplLines: RateLine[]
  paLines: RateLine[]
}

/** Baris rate, TPL, dan PA setiap baris Interest, sesuai urutannya. */
export function itemGroups(
  slip: Pick<PlacingSlip, "interestItems" | LineGroup>
): ItemGroup[] {
  const owner = itemOwner(slip)
  return slip.interestItems.map((item, i) => {
    const mine = (l: RateLine) => owner(l.vehicleId) === item.id
    return {
      item,
      no: i + 1,
      rateLines: slip.rateLines.filter(mine),
      tplLines: slip.tplLines.filter(mine),
      paLines: slip.paLines.filter(mine),
    }
  })
}

/** Slip dengan lebih dari satu objek atau kendaraan; dokumennya memakai jadwal premi per objek. */
export function isMultiItem(slip: Pick<PlacingSlip, "cob" | "interestItems">) {
  return usesItemRates(slip.cob) && slip.interestItems.length > 1
}

/**
 * Baris standar objek yang belum punya rate. Kendaraan mendapat format slip
 * satu kendaraan: casco dan perluasan, dua limit TPL, serta PA Driver dan
 * Passenger. Objek COB lain cukup satu rate. Id diturunkan dari id objek
 * supaya hitung ulang selalu menghasilkan slip yang sama.
 */
function standardLines(
  cob: ClassOfBusiness,
  itemId: string,
  labels: string[]
): Pick<PlacingSlip, LineGroup> {
  const motor = cob === "Motor Vehicle"
  return {
    rateLines: labels.map((label, i) => ({
      id: `${itemId}-r${i + 1}`,
      label,
      rate: null,
      premium: 0,
      vehicleId: itemId,
    })),
    tplLines: motor
      ? [1, 2].map((n) => ({
          id: `${itemId}-t${n}`,
          label: "Third Party Liability",
          rate: null,
          premium: 0,
          basis: "0",
          vehicleId: itemId,
        }))
      : [],
    paLines: motor
      ? ["Driver", "Passenger"].map((label, i) => ({
          id: `${itemId}-p${i + 1}`,
          label,
          rate: null,
          premium: 0,
          basis: "0",
          vehicleId: itemId,
        }))
      : [],
  }
}

/**
 * Setiap baris rate, TPL, dan PA menunjuk baris Interest-nya, dan setiap
 * objek punya baris rate sendiri. Baris objek yang dihapus ikut hilang;
 * deductible-nya pindah ke objek pertama, tempat deductible per cover
 * disimpan. Property tidak memakai ini.
 */
export function withItemRates(slip: PlacingSlip): PlacingSlip {
  if (!usesItemRates(slip.cob) || !slip.interestItems.length) return slip
  const owner = itemOwner(slip)
  const first = slip.interestItems[0].id
  const next = { ...slip }

  for (const key of LINE_GROUPS) {
    const carried = new Map<string, string[]>()
    const kept: RateLine[] = []
    for (const line of slip[key]) {
      const itemId = owner(line.vehicleId)
      if (!itemId) {
        if (line.deductibles?.length) carried.set(line.label, line.deductibles)
        continue
      }
      kept.push(line.vehicleId === itemId ? line : { ...line, vehicleId: itemId })
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
  const defaultLabels =
    slip.cob === "Motor Vehicle" ? MOTOR_RATE_LINES : [GENERIC_RATE_LABEL]
  for (const item of slip.interestItems) {
    if (next.rateLines.some((l) => l.vehicleId === item.id)) continue
    const lines = standardLines(
      slip.cob,
      item.id,
      firstLabels.length ? firstLabels : defaultLabels
    )
    for (const key of LINE_GROUPS) next[key] = [...next[key], ...lines[key]]
  }
  return next
}
