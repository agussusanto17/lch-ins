import type {
  LineItem,
  PlacingSlip,
  RateLine,
  SlipLocation,
} from "./data/types"

/**
 * Lokasi slip Property tanpa daftar lokasi (data contoh, slip lama). Id tetap supaya hitung ulang
 * dua kali menghasilkan slip yang sama dan form tidak dianggap berubah.
 */
const FIRST_LOCATION_ID = "loc-1"

type LocationSource = Pick<
  PlacingSlip,
  | "locations"
  | "riskLocation"
  | "occupation"
  | "occupationLabel"
  | "constructionClass"
  | "floatingSumInsured"
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

/**
 * Floating sum insured (MoM review Phase 1, poin 5): sum insured, rate, dan deductible diisi
 * sekali untuk semua lokasi, seperti slip 015/LCH-PLCMT/PS-PAR/X/2026. Tiap lokasi cukup
 * alamat, okupasi, dan kelas konstruksi.
 */
export function isFloatingSumInsured(
  slip: Pick<PlacingSlip, "cob" | "floatingSumInsured">
) {
  return slip.cob === "Property" && slip.floatingSumInsured === true
}

/**
 * Id lokasi pemilik sebuah baris; baris tanpa lokasi yang dikenal ikut lokasi pertama.
 * Slip floating menaruh semua baris di lokasi pertama, jadi premi dihitung dari total sum insured.
 */
export function locationOwner(slip: LocationSource) {
  const locations = slipLocations(slip)
  if (slip.floatingSumInsured) return () => locations[0].id
  const known = new Set(locations.map((l) => l.id))
  return (locationId?: string | null) =>
    locationId && known.has(locationId) ? locationId : locations[0].id
}

/** Rate Property yang batas tarif OJK-nya bergantung kelas konstruksi. */
const CLASS_RATED_LABELS = ["FLEXAS", "EQVET"]

/**
 * Kelas konstruksi wajib bila lokasi punya rate FLEXAS atau EQVET; slip tanpa rate itu, misalnya
 * Terrorism & Sabotage di Other Losses, boleh tanpa kelas (Harry, 6 November 2026).
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
 * Semua lokasi memakai rate dan loss limit yang sama per cover (misalnya CI SISKA RAHARJA), jadi
 * dokumen mencetak bagian RATE sekali sebelum jadwal premi per lokasi.
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

/**
 * Slip Property dengan lebih dari satu lokasi; dokumennya memakai jadwal per lokasi.
 * Slip floating dicetak seperti satu lokasi dengan daftar alamat bernomor.
 */
export function isMultiLocation(
  slip: Pick<PlacingSlip, "cob" | "locations" | "floatingSumInsured">
) {
  return (
    slip.cob === "Property" &&
    (slip.locations?.length ?? 0) > 1 &&
    !slip.floatingSumInsured
  )
}

/**
 * Batas OJK satu rate yang berlaku untuk semua lokasi slip floating: batas lokasi dengan batas
 * bawah tertinggi, yaitu risiko terberat. Lokasinya disebut di sumber batas bila lebih dari satu.
 */
export function strictestBounds<T extends { min: number | null; source: string }>(
  perLocation: (T | null | undefined)[]
): T | null {
  let best: T | null = null
  let no = 0
  for (const [i, bounds] of perLocation.entries()) {
    if (bounds && (best === null || (bounds.min ?? -Infinity) > (best.min ?? -Infinity))) {
      best = bounds
      no = i + 1
    }
  }
  if (!best || perLocation.length < 2) return best
  return { ...best, source: `${best.source}, lokasi ${no}` }
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
 * Nama tertanggung lokasi yang dicetak: diisi dan berbeda dari tertanggung slip (MoM review
 * Phase 1, poin 6). Kosong berarti lokasi itu atas nama tertanggung slip.
 */
export function locationInsuredName(
  location: Pick<SlipLocation, "insuredName">,
  slipInsuredName: string
) {
  const name = location.insuredName?.trim() ?? ""
  return name && name.toLowerCase() !== slipInsuredName.trim().toLowerCase() ? name : ""
}

/**
 * Daftar lokasi bernomor untuk Risk Location di dokumen: nama tertanggung lokasi (bila berbeda)
 * lalu alamatnya di baris berikutnya, seperti "1. PT A QQ B / Jl. ..., Surabaya".
 */
export function riskLocationItemsText(
  locations: Pick<SlipLocation, "riskLocation" | "insuredName">[],
  slipInsuredName: string
) {
  return locations
    .map((l, i) => {
      const insured = locationInsuredName(l, slipInsuredName)
      return `${i + 1}. ${insured ? `${insured}\n` : ""}${oneLineAddress(l.riskLocation)}`
    })
    .join("\n")
}

/**
 * Kunci lokasi untuk upload Excel: alamat satu baris dan nama tertanggung, huruf kecil. Baris file
 * dengan kunci yang sudah ada di slip dilewati supaya file yang sama bisa diupload ulang.
 */
export function locationKey(location: Pick<SlipLocation, "riskLocation" | "insuredName">) {
  const clean = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim()
  return `${clean(oneLineAddress(location.riskLocation))}|${clean(location.insuredName ?? "")}`
}

/**
 * Risk location sebagai satu nilai untuk polis, daftar slip, dan pencarian: alamat lokasi
 * pertama, atau semua alamat bernomor bila lokasinya lebih dari satu.
 */
export function slipRiskLocationText(locations: Pick<SlipLocation, "riskLocation">[]) {
  if (locations.length <= 1) return locations[0]?.riskLocation ?? ""
  return locations
    .map((l, i) => `${i + 1}. ${oneLineAddress(l.riskLocation)}`)
    .join("\n")
}

/**
 * Slip Property selalu punya daftar lokasi, dan tiap baris sum insured dan rate menunjuk lokasi.
 * Okupasi, risk location, dan kelas slip diisi dari lokasi; COB lain tidak memakai lokasi.
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
