import type {
  LineItem,
  PlacingSlip,
  RateLine,
  SlipLocation,
} from "./data/types"

/**
 * Lokasi slip Property tanpa daftar lokasi: data contoh, dan slip yang dibuka
 * sebelum lokasi disimpan per baris. Id tetap supaya hitung ulang dua kali
 * menghasilkan slip yang sama dan form tidak dianggap berubah.
 */
const FIRST_LOCATION_ID = "loc-1"

type LocationSource = Pick<
  PlacingSlip,
  | "locations"
  | "riskLocation"
  | "occupation"
  | "occupationLabel"
  | "constructionClass"
>

/** Lokasi slip Property; tanpa daftar lokasi berarti satu lokasi dari isian slip. */
export function slipLocations(slip: LocationSource): SlipLocation[] {
  if (slip.locations?.length) return slip.locations
  return [
    {
      id: FIRST_LOCATION_ID,
      riskLocation: slip.riskLocation ?? "",
      occupation: slip.occupation,
      occupationLabel: slip.occupationLabel,
      constructionClass: slip.constructionClass,
    },
  ]
}

/** Id lokasi pemilik sebuah baris; baris tanpa lokasi yang dikenal ikut lokasi pertama. */
export function locationOwner(slip: LocationSource) {
  const locations = slipLocations(slip)
  const known = new Set(locations.map((l) => l.id))
  return (locationId?: string | null) =>
    locationId && known.has(locationId) ? locationId : locations[0].id
}

/** Rate Property yang batas tarif OJK-nya bergantung kelas konstruksi. */
const CLASS_RATED_LABELS = ["FLEXAS", "EQVET"]

/**
 * Kelas konstruksi wajib bila lokasi punya rate FLEXAS atau EQVET, karena
 * batas tarif OJK keduanya bergantung kelas konstruksi. Slip tanpa rate itu,
 * misalnya Terrorism & Sabotage yang rate-nya di Other Losses, boleh tanpa
 * kelas (jawaban Harry, 6 November 2026).
 */
export function needsConstructionClass(
  lines: Pick<RateLine, "label" | "rate">[]
) {
  return lines.some(
    (l) => CLASS_RATED_LABELS.includes(l.label) && (l.rate ?? 0) > 0
  )
}

export interface LocationGroup {
  location: SlipLocation
  /** Nomor lokasi di form dan dokumen, mulai 1. */
  no: number
  section1: LineItem[]
  section2: LineItem[]
  rateLines: RateLine[]
}

/** Sum insured dan baris rate setiap lokasi, sesuai urutan lokasi. */
export function locationGroups(
  slip: LocationSource &
    Pick<PlacingSlip, "sumInsuredSection1" | "sumInsuredSection2" | "rateLines">
): LocationGroup[] {
  const owner = locationOwner(slip)
  return slipLocations(slip).map((location, i) => ({
    location,
    no: i + 1,
    section1: slip.sumInsuredSection1.filter(
      (it) => owner(it.locationId) === location.id
    ),
    section2: slip.sumInsuredSection2.filter(
      (it) => owner(it.locationId) === location.id
    ),
    rateLines: slip.rateLines.filter((l) => owner(l.locationId) === location.id),
  }))
}

/**
 * Semua lokasi memakai rate dan loss limit yang sama untuk setiap cover,
 * misalnya lima unit apartemen di CI SISKA RAHARJA. Dokumennya tetap mencetak
 * bagian RATE sekali, sebelum jadwal premi per lokasi.
 */
export function locationsShareRates(
  slip: Parameters<typeof locationGroups>[0]
) {
  const groups = locationGroups(slip)
  const key = (g: LocationGroup) =>
    JSON.stringify(
      g.rateLines.map((l) => [l.label, l.rate ?? null, l.lossLimitPct ?? null])
    )
  return groups.every((g) => key(g) === key(groups[0]))
}

/** Slip Property dengan lebih dari satu lokasi; dokumennya memakai jadwal per lokasi. */
export function isMultiLocation(slip: Pick<PlacingSlip, "cob" | "locations">) {
  return slip.cob === "Property" && (slip.locations?.length ?? 0) > 1
}

/** Alamat dalam satu baris, untuk daftar bernomor: "Jl. A,\nMakassar" menjadi "Jl. A, Makassar". */
export function oneLineAddress(text: string) {
  return text
    .split("\n")
    .map((part) => part.trim().replace(/,$/, ""))
    .filter(Boolean)
    .join(", ")
}

/** Alamat untuk dokumen: baris isian user dipertahankan, spasi tepi dan baris kosong dibuang. */
export function addressLines(text: string) {
  return text
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n")
}

/**
 * Risk location slip: alamat lokasi pertama, atau semua alamat bernomor satu
 * per baris bila lokasinya lebih dari satu. Dipakai polis, daftar slip, dan
 * pencarian, yang membaca satu nilai.
 */
export function slipRiskLocationText(locations: Pick<SlipLocation, "riskLocation">[]) {
  if (locations.length <= 1) return locations[0]?.riskLocation ?? ""
  return locations
    .map((l, i) => `${i + 1}. ${oneLineAddress(l.riskLocation)}`)
    .join("\n")
}

/**
 * Slip Property selalu punya daftar lokasi dan setiap baris sum insured dan
 * rate menunjuk lokasinya. Okupasi, risk location, dan kelas slip diisi dari
 * lokasi. COB lain tidak memakai lokasi.
 */
export function withLocations(slip: PlacingSlip): PlacingSlip {
  if (slip.cob !== "Property") return slip
  const locations = slipLocations(slip)
  const owner = locationOwner(slip)
  const assign = <T extends { locationId?: string | null }>(rows: T[]) =>
    rows.map((r) => {
      const locationId = owner(r.locationId)
      return r.locationId === locationId ? r : { ...r, locationId }
    })
  const first = locations[0]
  return {
    ...slip,
    locations,
    sumInsuredSection1: assign(slip.sumInsuredSection1),
    sumInsuredSection2: assign(slip.sumInsuredSection2),
    rateLines: assign(slip.rateLines),
    occupation: first.occupation,
    occupationLabel: first.occupationLabel,
    constructionClass: first.constructionClass,
    riskLocation: slipRiskLocationText(locations),
  }
}
