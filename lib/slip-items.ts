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
 * Rate per baris Interest Insured: Motor Vehicle per kendaraan (Harry, 5 November 2026),
 * COB lain per objek (Agus, 5 November 2026). Property memakai lokasi.
 */
export function usesItemRates(cob: ClassOfBusiness) {
  return cob !== "Property"
}

/**
 * COB yang objeknya boleh memakai premi flat tanpa rate, seperti Liability dan MB di contoh
 * slip LCH. Motor Vehicle tetap per rate karena dicek terhadap tarif OJK.
 */
export function allowsFlatPremium(cob: ClassOfBusiness) {
  return usesItemRates(cob) && cob !== "Motor Vehicle"
}

/** Section objek di slip ber-section: 2 untuk Third Party Liability, selain itu 1. */
export function itemSection(item: Pick<LineItem, "section">): 1 | 2 {
  return item.section === 2 ? 2 : 1
}

/**
 * Objek yang nilainya hanya limit, tidak ikut TSI dan premi, misalnya limit any one carrying
 * CIT di samping estimasi carrying tahunan. COB-nya sama dengan premi flat.
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
 * Baris Interest pemilik baris rate, TPL, atau PA (`vehicleId` berisi objek di COB lain).
 * Baris tanpa pemilik ikut objek pertama; baris milik objek yang sudah dihapus mendapat null.
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
 * Tambah satu cover (baris rate) ke objek, misalnya War di samping ICC "A" (CI LCH contoh 02).
 * Baris baru menyusul baris objek itu, jadi urutan per objek tetap.
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
 * Objek tetap punya minimal satu cover. Deductible cover yang dihapus pindah ke cover pertama
 * yang tersisa, karena deductible per cover dan per section disimpan di baris objek pertama.
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
 * Cover tambahan sebuah objek wajib diberi nama sebelum release karena nama itu tercetak.
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
 * Baris standar objek tanpa rate: kendaraan dapat casco, perluasan, dua TPL, PA Driver dan
 * Passenger; COB lain satu rate. Id diturunkan dari id objek supaya hitung ulang stabil.
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
 * Deductible objek baru disalin dari objek berpremi pertama (bisa diubah per objek). Baris rate
 * dicocokkan per label dan urutan; TPL dan PA menyimpan deductible di baris pertama tabelnya.
 */
function copyDeductibles(
  source: Pick<PlacingSlip, LineGroup>,
  lines: Pick<PlacingSlip, LineGroup>
): Pick<PlacingSlip, LineGroup> {
  const withList = (line: RateLine, deductibles?: string[]) =>
    deductibles?.length ? { ...line, deductibles: [...deductibles] } : line
  const seen = new Map<string, number>()
  const nth = (list: RateLine[], label: string, n: number) =>
    list.filter((l) => l.label === label)[n]
  return {
    rateLines: lines.rateLines.map((line) => {
      const n = seen.get(line.label) ?? 0
      seen.set(line.label, n + 1)
      return withList(line, nth(source.rateLines, line.label, n)?.deductibles)
    }),
    tplLines: lines.tplLines.map((line, i) =>
      i === 0 ? withList(line, source.tplLines[0]?.deductibles) : line
    ),
    paLines: lines.paLines.map((line, i) =>
      i === 0 ? withList(line, source.paLines[0]?.deductibles) : line
    ),
  }
}

/**
 * Tiap objek punya baris rate, TPL, dan PA sendiri; baris objek yang dihapus ikut hilang,
 * termasuk deductible-nya (per objek sejak 13 November 2026). Property tidak memakai ini.
 */
export function withItemRates(slip: PlacingSlip): PlacingSlip {
  if (!usesItemRates(slip.cob) || !slip.interestItems.length) return slip
  const owner = itemOwner(slip)
  const first = slip.interestItems[0].id
  const next = { ...slip }

  for (const key of LINE_GROUPS) {
    next[key] = slip[key].flatMap((line) => {
      const itemId = owner(line.vehicleId)
      if (!itemId) return []
      return line.vehicleId === itemId ? [line] : [{ ...line, vehicleId: itemId }]
    })
  }

  const firstLabels = next.rateLines
    .filter((l) => l.vehicleId === first)
    .map((l) => l.label)
  const defaultLabels =
    slip.cob === "Motor Vehicle" ? MOTOR_RATE_LINES : [GENERIC_RATE_LABEL]
  // Sumber deductible objek baru: objek berpremi pertama yang sudah punya baris.
  const sourceItem = slip.interestItems.find(
    (item) =>
      !isLimitOnlyItem(slip.cob, item) &&
      next.rateLines.some((l) => l.vehicleId === item.id)
  )
  const mine = (itemId: string | undefined) => (l: RateLine) =>
    l.vehicleId === itemId
  const source: Pick<PlacingSlip, LineGroup> = {
    rateLines: next.rateLines.filter(mine(sourceItem?.id)),
    tplLines: next.tplLines.filter(mine(sourceItem?.id)),
    paLines: next.paLines.filter(mine(sourceItem?.id)),
  }
  for (const item of slip.interestItems) {
    if (next.rateLines.some((l) => l.vehicleId === item.id)) continue
    // Objek baru memakai cover objek pertama, kecuali objek limit saja
    // (misalnya limit TPL Section 2) yang tidak berpremi: cukup satu baris.
    const limitOnly = isLimitOnlyItem(slip.cob, item)
    const standard = standardLines(
      slip.cob,
      item.id,
      limitOnly
        ? [GENERIC_RATE_LABEL]
        : firstLabels.length
          ? firstLabels
          : defaultLabels
    )
    // Slip ber-section (CAR, EAR) menyimpan deductible per section di objek
    // pertama section itu, jadi objek baru tidak menyalin apa pun.
    const sectioned = slip.usesSections && allowsFlatPremium(slip.cob)
    const lines =
      limitOnly || sectioned ? standard : copyDeductibles(source, standard)
    for (const key of LINE_GROUPS) next[key] = [...next[key], ...lines[key]]
  }
  return next
}
