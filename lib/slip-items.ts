import { MOTOR_RATE_LINES } from "./data/reference"
import {
  MAX_DEDUCTIBLES,
  type ClassOfBusiness,
  type LineItem,
  type PlacingSlip,
  type RateLine,
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
 * COB yang objeknya boleh memakai premi flat (premi diisi langsung, tanpa
 * rate), seperti Liability dan Machinery Breakdown di contoh slip LCH. Motor
 * Vehicle tetap per rate karena dicek terhadap tarif OJK.
 */
export function allowsFlatPremium(cob: ClassOfBusiness) {
  return usesItemRates(cob) && cob !== "Motor Vehicle"
}

/** Section objek di slip ber-section: 2 untuk Third Party Liability, selain itu 1. */
export function itemSection(item: Pick<LineItem, "section">): 1 | 2 {
  return item.section === 2 ? 2 : 1
}

/**
 * Objek yang nilainya hanya batas (limit): tidak ikut total sum insured dan
 * premi, misalnya limit any one carrying CIT di samping estimasi carrying
 * tahunan. COB-nya sama dengan premi flat.
 */
export function isLimitOnlyItem(
  cob: ClassOfBusiness,
  item: Pick<LineItem, "limitOnly">
) {
  return item.limitOnly === true && allowsFlatPremium(cob)
}

/** Baris rate yang dihitung sebagai premi flat. */
export function isFlatLine(cob: ClassOfBusiness, line: Pick<RateLine, "flatPremium">) {
  return line.flatPremium === true && allowsFlatPremium(cob)
}

/**
 * Pesan release bila slip belum punya rate atau premi flat sama sekali; null
 * bila sudah ada. Dipakai form dan pengecekan ulang di server.
 */
export function missingRateIssue(slip: Pick<PlacingSlip, "cob" | "rateLines">) {
  const priced = slip.rateLines.some(
    (l) => (l.rate ?? 0) > 0 || (isFlatLine(slip.cob, l) && l.premium > 0)
  )
  if (priced) return null
  return allowsFlatPremium(slip.cob)
    ? "Isi minimal satu rate atau premi flat."
    : "Isi minimal satu rate."
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

/**
 * Tambah satu cover (baris rate) ke sebuah objek, misalnya War di samping
 * ICC "A" pada CI single shipment LCH (contoh 02). Nama cover diisi setelah
 * baris ditambahkan. Baris baru menyusul baris objek itu, jadi urutannya per
 * objek tetap.
 */
export function addItemCover(
  slip: Pick<PlacingSlip, "interestItems" | "rateLines">,
  itemId: string
): RateLine[] {
  const owner = itemOwner(slip)
  const ids = new Set(slip.rateLines.map((l) => l.id))
  let n = slip.rateLines.filter((l) => owner(l.vehicleId) === itemId).length + 1
  while (ids.has(`${itemId}-r${n}`)) n++
  return [
    ...slip.rateLines,
    { id: `${itemId}-r${n}`, label: "", rate: null, premium: 0, vehicleId: itemId },
  ]
}

/**
 * Hapus satu cover objek. Objek tetap punya minimal satu cover. Deductible
 * cover yang dihapus pindah ke cover pertama yang tersisa di objek itu,
 * karena deductible per cover dan per section disimpan di baris objek
 * pertama.
 */
export function removeItemCover(
  slip: Pick<PlacingSlip, "interestItems" | "rateLines">,
  lineId: string
): RateLine[] {
  const owner = itemOwner(slip)
  const line = slip.rateLines.find((l) => l.id === lineId)
  if (!line) return slip.rateLines
  const itemId = owner(line.vehicleId)
  const rest = slip.rateLines.filter((l) => l.id !== lineId)
  const heir = rest.find((l) => owner(l.vehicleId) === itemId)
  if (!heir) return slip.rateLines
  if (!line.deductibles?.length) return rest
  const deductibles = [
    ...new Set([...(heir.deductibles ?? []), ...line.deductibles]),
  ].slice(0, MAX_DEDUCTIBLES)
  return rest.map((l) => (l.id === heir.id ? { ...l, deductibles } : l))
}

/**
 * Objek yang punya lebih dari satu cover wajib memberi nama setiap cover
 * tambahannya sebelum release, karena nama itu yang tercetak di dokumen.
 * Cover pertama boleh tanpa nama; dokumen mencetak type of cover slip.
 */
export function coverNameIssues(
  slip: Pick<PlacingSlip, "cob" | "interestItems" | "rateLines" | "tplLines" | "paLines">
): string[] {
  if (!allowsFlatPremium(slip.cob)) return []
  return itemGroups(slip).flatMap(({ item, no, rateLines }) =>
    rateLines.length > 1 &&
    !isLimitOnlyItem(slip.cob, item) &&
    rateLines.some((l) => !l.label.trim())
      ? [`Isi nama cover tambahan objek ${no}.`]
      : []
  )
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
    // Objek baru memakai cover objek pertama, kecuali objek limit saja
    // (misalnya limit TPL Section 2) yang tidak berpremi: cukup satu baris.
    const lines = standardLines(
      slip.cob,
      item.id,
      isLimitOnlyItem(slip.cob, item)
        ? [GENERIC_RATE_LABEL]
        : firstLabels.length
          ? firstLabels
          : defaultLabels
    )
    for (const key of LINE_GROUPS) next[key] = [...next[key], ...lines[key]]
  }
  return next
}
