import {
  brokerageLimitIssue,
  recalcSlip,
  sumItems,
  totalSumInsured,
} from "@/lib/calc"
import { validateClauseUniquenessAcrossSections } from "@/lib/validation"
import {
  correspondenceAddress,
  MOTOR_RATE_LINES,
  PROPERTY_RATE_LINES,
  TYPE_OF_COVER,
  type ClassOfBusiness,
  type Client,
  type LineItem,
  type PlacingSlip,
  type RateLine,
  type SlipLocation,
  type Sppa,
} from "@/lib/data"
import { OCCUPATION_TARIFFS } from "@/lib/data/ojk-tariff"
import type { CoverOption } from "@/lib/form-options"
import {
  findMotorTariffBounds,
  findMotorExtensionBounds,
  findMotorPaBounds,
  matchMotorRegion,
} from "@/lib/data/ojk-motor"
import { todayIso } from "@/lib/date"
import { normalizeCob } from "@/lib/format"
import { withDetailLabels } from "@/lib/slip-details"
import {
  isMultiLocation,
  locationGroups,
  locationOwner,
  slipLocations,
} from "@/lib/slip-locations"
import {
  GENERIC_RATE_LABEL,
  itemGroups,
  itemOwner,
  usesItemRates,
} from "@/lib/slip-items"
import {
  isCascoLine,
  isMultiVehicle,
  vehicleTariff,
} from "@/lib/slip-vehicles"

export { GENERIC_RATE_LABEL }

let seq = 0
export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${seq++}`

export function makeRateLines(cob: ClassOfBusiness): RateLine[] {
  if (cob === "Property") {
    return PROPERTY_RATE_LINES.map((label, i) => ({
      id: `r${i + 1}`,
      label,
      rate: null,
      premium: 0,
    }))
  }
  if (cob === "Motor Vehicle") {
    return MOTOR_RATE_LINES.map((label, i) => ({
      id: `r${i + 1}`,
      label,
      rate: null,
      premium: 0,
    }))
  }
  return [{ id: "r1", label: GENERIC_RATE_LABEL, rate: null, premium: 0 }]
}

/** Okupasi slip dipecah jadi kode OJK dan namanya ("29371 - Private …"). */
export function occupationParts(occupation: string | undefined) {
  const text = occupation ?? ""
  const i = text.indexOf(" - ")
  return i < 0
    ? { code: text.trim(), name: "" }
    : { code: text.slice(0, i).trim(), name: text.slice(i + 3).trim() }
}

/**
 * Okupasi yang tampil di dokumen slip: kode OJK ditambah nama yang diedit khusus
 * slip ini, atau nama OJK bila tidak diedit. Kodenya selalu ikut.
 */
export function slipOccupationText(
  slip: Pick<PlacingSlip, "occupation" | "occupationLabel">
) {
  if (!slip.occupation) return ""
  const label = slip.occupationLabel?.trim()
  return label ? `${occupationParts(slip.occupation).code} - ${label}` : slip.occupation
}

/**
 * Nama cover sebuah baris rate, untuk deductible per cover. Baris tunggal
 * "Rate (%)" bukan nama cover, jadi diganti type of cover slipnya; tanpa itu
 * dokumen mencetak "Rate (%)" di kolom cover.
 */
export function coverLabel(
  slip: Pick<PlacingSlip, "typeOfCover" | "cob">,
  line: Pick<RateLine, "label">
) {
  return line.label === GENERIC_RATE_LABEL
    ? slip.typeOfCover || slip.cob
    : line.label
}

export type DeductibleGroup = "rateLines" | "tplLines" | "paLines"

/** One row of "Deductible per cover", with the line that stores its deductibles. */
export interface DeductibleRow {
  group: DeductibleGroup
  lineId: string
  cover: string
  deductibles: string[]
  /** Motor PA or TPL row added from the "Tambah cover" menu; it can be removed. */
  extra: boolean
}

/**
 * Motor covers outside the rate list that can carry deductibles (permintaan 4
 * November 2026). Their deductibles live on the first line of their table.
 */
const MOTOR_EXTRA_COVERS: {
  group: Exclude<DeductibleGroup, "rateLines">
  cover: string
}[] = [
  { group: "paLines", cover: "Personal Accident" },
  { group: "tplLines", cover: "Third Party Liability" },
]

/** Extra motor rows follow this cover; without it they go last. */
const MOTOR_EXTRA_AFTER = "Terrorism & Sabotage"

/** Motor PA and TPL covers this slip has, i.e. whose table has a line. */
export function extraDeductibleCovers(slip: PlacingSlip) {
  if (slip.cob !== "Motor Vehicle") return []
  const source = deductibleSource(slip)
  return MOTOR_EXTRA_COVERS.filter((c) => source[c.group].length > 0)
}

/**
 * Deductible rows in form and print order: one per rate line, with motor PA
 * and TPL after Terrorism & Sabotage once they hold deductibles or were added
 * from the form (`added`).
 */
export function deductibleRows(
  slip: PlacingSlip,
  added: DeductibleGroup[] = []
): DeductibleRow[] {
  const source = deductibleSource(slip)
  const lines = source.rateLines
  const rows: DeductibleRow[] = lines.map((l) => ({
    group: "rateLines",
    lineId: l.id,
    cover: coverLabel(slip, l),
    deductibles: l.deductibles ?? [],
    extra: false,
  }))
  const extras = extraDeductibleCovers(slip).flatMap((c): DeductibleRow[] => {
    const line = source[c.group][0]
    const deductibles = line.deductibles ?? []
    return deductibles.length || added.includes(c.group)
      ? [
          {
            group: c.group,
            lineId: line.id,
            cover: c.cover,
            deductibles,
            extra: true,
          },
        ]
      : []
  })
  const after = lines.findIndex((l) => l.label === MOTOR_EXTRA_AFTER)
  rows.splice(after < 0 ? rows.length : after + 1, 0, ...extras)
  return rows
}

/**
 * Baris yang menyimpan deductible per cover. Satu daftar deductible per cover
 * berlaku untuk semua lokasi, kendaraan, atau objek (Harry, 5 November 2026),
 * disimpan di baris lokasi atau objek pertama; yang beda per lokasi atau
 * objek ditulis di teksnya.
 */
function deductibleSource(
  slip: PlacingSlip
): Pick<PlacingSlip, "rateLines" | "tplLines" | "paLines"> {
  if (slip.cob === "Property") {
    return { rateLines: locationGroups(slip)[0].rateLines, tplLines: [], paLines: [] }
  }
  if (usesItemRates(slip.cob) && slip.interestItems.length) {
    return itemGroups(slip)[0]
  }
  return slip
}

/**
 * PA and TPL deductibles live on the first line of their table. Removing that
 * line hands them to the line that becomes first, so they are not lost.
 */
export function keepGroupDeductibles(prev: RateLine[], next: RateLine[]) {
  const kept = prev[0]?.deductibles
  if (!kept?.length || !next.length || next[0].id === prev[0].id) return next
  return next.map((l, i) => (i === 0 ? { ...l, deductibles: kept } : l))
}

export function makeMotorSubLines(): {
  tplLines: RateLine[]
  paLines: RateLine[]
} {
  return {
    tplLines: [
      {
        id: "t1",
        label: "Third Party Liability",
        rate: null,
        premium: 0,
        basis: "0",
      },
      {
        id: "t2",
        label: "Third Party Liability",
        rate: null,
        premium: 0,
        basis: "0",
      },
    ],
    paLines: [
      { id: "p1", label: "Driver", rate: null, premium: 0, basis: "0" },
      { id: "p2", label: "Passenger", rate: null, premium: 0, basis: "0" },
    ],
  }
}

/** Keterangan periode di semua CI LCH, isi awal slip baru. */
export const DEFAULT_PERIOD_NOTE =
  "Both days at 12 o'clock noon local time at the location of the insured object."

export function emptySlip(): PlacingSlip {
  return {
    id: "new",
    slipNo: null,
    seq: 0,
    cob: "Property",
    typeOfCover: "",
    coverCode: null,
    clientId: null,
    insuredName: "",
    correspondenceAddress: "",
    currency: "IDR",
    status: "Draft",
    periodTba: false,
    inceptionDate: null,
    expiryDate: null,
    periodNote: DEFAULT_PERIOD_NOTE,
    detailRows: [],
    occupation: "",
    riskLocation: "",
    wordingForms: [""],
    coverage: "",
    constructionClass: "",
    indemnityPeriod: "",
    interestSection1: "",
    interestSection2: "",
    interestItems: [{ id: uid("i"), description: "", amount: 0 }],
    sumInsuredSection1: [{ id: uid("m"), description: "", amount: 0 }],
    sumInsuredSection2: [{ id: uid("b"), description: "", amount: 0 }],
    specialConditions: "",
    clauseIds: [],
    rateLines: makeRateLines("Property"),
    tplLines: [],
    paLines: [],
    discountPct: 0,
    adminCost: 0,
    stampDuty: 0,
    brokeragePct: 0,
    includeVat: false,
    createdAt: todayIso(),
    updatedAt: todayIso(),
  }
}

/** Hitung ulang seluruh premium dari rate + sum insured. */
export const recalc = recalcSlip

/** Ganti COB → reset struktur rate & type of cover. */
export function switchCob(
  slip: PlacingSlip,
  cob: ClassOfBusiness
): PlacingSlip {
  const normCob = normalizeCob(cob)
  const motor = normCob === "Motor Vehicle"
  const sub = motor ? makeMotorSubLines() : { tplLines: [], paLines: [] }
  return recalc({
    ...slip,
    cob: normCob,
    typeOfCover: "",
    typeOfCover2: "",
    typeOfCoverLabel: undefined,
    typeOfCover2Label: undefined,
    // Label bawaan type of cover lama dibuang; baris yang sudah diisi tetap.
    detailRows: withDetailLabels(slip.detailRows, []),
    coverCode: null,
    // Slip Property mulai lagi dengan satu lokasi dari isian slip.
    locations: undefined,
    rateLines: makeRateLines(normCob),
    ...sub,
  })
}

// Lokasi slip Property. Fungsi di bawah mengembalikan patch untuk `set` form.

/**
 * Lokasi baru di akhir daftar: isian kosong, satu baris sum insured per
 * section, dan baris rate dengan cover yang sama seperti lokasi pertama.
 */
export function addLocationPatch(slip: PlacingSlip): Partial<PlacingSlip> {
  const locationId = uid("loc")
  const labels = locationGroups(slip)[0].rateLines.map((l) => l.label)
  return {
    locations: [...slipLocations(slip), { id: locationId, riskLocation: "" }],
    sumInsuredSection1: [
      ...slip.sumInsuredSection1,
      { id: uid("m"), description: "", amount: 0, locationId },
    ],
    sumInsuredSection2: [
      ...slip.sumInsuredSection2,
      { id: uid("b"), description: "", amount: 0, locationId },
    ],
    rateLines: [
      ...slip.rateLines,
      ...(labels.length ? labels : PROPERTY_RATE_LINES).map((label) => ({
        id: uid("r"),
        label,
        rate: null,
        premium: 0,
        locationId,
      })),
    ],
  }
}

/**
 * Hapus lokasi beserta sum insured, baris rate, dan alasan rate-nya. Saat
 * lokasi pertama dihapus, deductible per cover pindah ke lokasi yang menjadi
 * pertama supaya tidak hilang.
 */
export function removeLocationPatch(
  slip: PlacingSlip,
  locationId: string
): Partial<PlacingSlip> {
  const groups = locationGroups(slip)
  const removed = groups.find((g) => g.location.id === locationId)
  if (!removed || groups.length < 2) return {}
  const owner = locationOwner(slip)
  const keep = (row: { locationId?: string | null }) =>
    owner(row.locationId) !== locationId

  let rateLines = slip.rateLines.filter(keep)
  if (removed.no === 1) {
    const next = groups[1].location.id
    const carried = new Map(
      removed.rateLines.map((l) => [l.label, l.deductibles ?? []])
    )
    rateLines = rateLines.map((l) =>
      owner(l.locationId) === next && carried.get(l.label)?.length
        ? { ...l, deductibles: carried.get(l.label) }
        : l
    )
  }
  const removedLines = new Set(removed.rateLines.map((l) => l.id))
  return {
    locations: slipLocations(slip).filter((l) => l.id !== locationId),
    sumInsuredSection1: slip.sumInsuredSection1.filter(keep),
    sumInsuredSection2: slip.sumInsuredSection2.filter(keep),
    rateLines,
    rateExceptions: Object.fromEntries(
      Object.entries(slip.rateExceptions ?? {}).filter(
        ([lineId]) => !removedLines.has(lineId)
      )
    ),
  }
}

export function updateLocationPatch(
  slip: PlacingSlip,
  locationId: string,
  patch: Partial<Omit<SlipLocation, "id">>
): Partial<PlacingSlip> {
  return {
    locations: slipLocations(slip).map((l) =>
      l.id === locationId ? { ...l, ...patch } : l
    ),
  }
}

/** Ganti baris satu lokasi; baris tetap berurutan per lokasi. */
export function locationRowsPatch<
  K extends "sumInsuredSection1" | "sumInsuredSection2" | "rateLines",
>(
  slip: PlacingSlip,
  key: K,
  locationId: string,
  rows: PlacingSlip[K]
): Partial<PlacingSlip> {
  const owner = locationOwner(slip)
  const current = slip[key] as (LineItem | RateLine)[]
  const next = slipLocations(slip).flatMap((location) =>
    location.id === locationId
      ? (rows as (LineItem | RateLine)[]).map((r) => ({ ...r, locationId }))
      : current.filter((r) => owner(r.locationId) === location.id)
  )
  return { [key]: next } as Partial<PlacingSlip>
}

/**
 * Ganti baris rate, TPL, atau PA satu kendaraan atau objek; baris tetap
 * berurutan sesuai Interest Insured.
 */
export function itemRowsPatch(
  slip: PlacingSlip,
  key: "rateLines" | "tplLines" | "paLines",
  itemId: string,
  rows: RateLine[]
): Partial<PlacingSlip> {
  const owner = itemOwner(slip)
  const next = slip.interestItems.flatMap((item) =>
    item.id === itemId
      ? rows.map((r) => ({ ...r, vehicleId: itemId }))
      : slip[key].filter((r) => owner(r.vehicleId) === item.id)
  )
  return { [key]: next }
}

/**
 * Token {COVER} di nomor slip. Singkatan dari master data didahulukan; label
 * lama yang belum ada di master (misalnya "PAR + EQVET") memakai kode bawaan
 * supaya nomor slip lama tetap sama.
 */
export function coverCodeFor(
  cob: ClassOfBusiness,
  typeOfCover: string,
  covers?: Pick<CoverOption, "name" | "abbreviation">[]
) {
  const fromMaster = covers?.find((c) => c.name === typeOfCover)?.abbreviation
  if (fromMaster) return fromMaster
  return TYPE_OF_COVER[cob]?.find((t) => t.label === typeOfCover)?.code ?? null
}

/**
 * Token {COVER} slip dengan dua type of cover: singkatan keduanya digabung
 * sesuai urutan isian, misalnya PAR + EQ menjadi PAREQ seperti CI LCH
 * 011/LCH-PLCMT/CI-PAREQ/VIII/2026.
 */
export function joinCoverCodes(...codes: (string | null | undefined)[]) {
  return codes.filter(Boolean).join("") || null
}

/** Property punya blok Okupasi, Risk Location, Wording Form, dan Detail Coverage. */
export function usesPropertyBlocks(cob: ClassOfBusiness) {
  return cob !== "Motor Vehicle"
}

export function usesSectionSumInsured(cob: ClassOfBusiness) {
  return cob === "Property"
}

/** COB yang punya isian Additional Fee untuk produksi (4 November 2026). */
export function usesAdditionalFee(cob: ClassOfBusiness) {
  return cob === "Property" || cob === "Motor Vehicle"
}

// Batas tarif OJK dan validasi release

/** Batas FLEXAS dari tabel okupasi OJK untuk okupasi dan kelas konstruksi slip. */
export function occupationBounds(
  occupation: string | undefined,
  constructionClass: string | undefined
) {
  const code = (occupation ?? "").trim().split(/[^0-9A-Za-z]/)[0]
  const klas = (constructionClass ?? "").toLowerCase() as "k1" | "k2" | "k3"
  if (!code || !["k1", "k2", "k3"].includes(klas)) return null
  const tariff = OCCUPATION_TARIFFS.find((o) => o.code === code)
  const range = tariff?.[klas]
  if (!range) return null
  return {
    min: range[0],
    max: range[1],
    source: `FLEXAS okupasi ${code} ${klas.toUpperCase()}`,
  }
}

/**
 * Baris rate beserta batas OJK yang berlaku. Batas yang dipilih dari panel
 * referensi dipakai lebih dulu; bila belum ada, FLEXAS memakai batas okupasi
 * dan kelas konstruksi slip, jadi rate yang diketik manual tetap tervalidasi.
 */
export function rateLinesWithBounds(slip: PlacingSlip): RateLine[] {
  if (slip.cob === "Property") {
    // Tiap lokasi punya okupasi dan kelas konstruksi sendiri.
    const owner = locationOwner(slip)
    const auto = new Map(
      slipLocations(slip).map((location) => [
        location.id,
        occupationBounds(location.occupation, location.constructionClass),
      ])
    )
    return slip.rateLines.map((l) => {
      if (l.min != null || l.max != null) return l
      const bounds = auto.get(owner(l.locationId))
      if (bounds && l.label === "FLEXAS") {
        return {
          ...l,
          min: bounds.min,
          max: bounds.max,
          boundSource: bounds.source,
        }
      }
      return l
    })
  }

  if (slip.cob === "Motor Vehicle") {
    // Kategori dan wilayah OJK dihitung per kendaraan.
    const owner = itemOwner(slip)
    const tariffs = new Map(
      slip.interestItems.map((v) => [v.id, vehicleTariff(slip, v)])
    )
    const fallback = {
      coverType: slip.typeOfCover || slip.coverage || "Comprehensive",
      region: matchMotorRegion(slip.riskLocation ?? ""),
      casco: findMotorTariffBounds({
        vehicleDesc: "",
        tsi: totalSumInsured(slip),
        locationOrPlate: slip.riskLocation ?? "",
        coverType: slip.typeOfCover || slip.coverage || "Comprehensive",
      }),
    }

    return slip.rateLines.map((l) => {
      if (l.min != null || l.max != null) return l
      const { coverType, region, casco: motorBounds } =
        tariffs.get(owner(l.vehicleId) ?? "") ?? fallback
      if (isCascoLine(l.label)) {
        if (motorBounds) {
          return {
            ...l,
            min: motorBounds.min,
            max: motorBounds.max,
            boundSource: motorBounds.source,
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

/** Batas OJK untuk baris TPL atau PA; batas yang sudah tersimpan didahulukan. */
function withSectionBounds(
  line: RateLine,
  bounds: { min: number; max: number; source: string } | null
): RateLine {
  if (line.min != null || line.max != null || !bounds) return line
  return {
    ...line,
    min: bounds.min,
    max: bounds.max,
    boundSource: bounds.source,
  }
}

export function isOutOfBounds(line: RateLine) {
  if (line.rate == null) return false
  return (
    (line.min != null && line.rate < line.min) ||
    (line.max != null && line.rate > line.max)
  )
}

/** Hal yang harus dibereskan sebelum slip boleh di-release (PRD A-08 sampai A-12). */
export function releaseIssues(slip: PlacingSlip) {
  const issues: string[] = []
  if (!slip.clientId) issues.push("Pilih nama tertanggung dari data klien.")
  if (!slip.typeOfCover) issues.push("Pilih type of cover.")
  if (!slip.correspondenceAddress.trim())
    issues.push("Isi correspondence address.")
  if (!slip.periodTba) {
    if (!slip.inceptionDate || !slip.expiryDate) {
      issues.push("Isi periode asuransi atau aktifkan Period TBA.")
    } else if (slip.expiryDate <= slip.inceptionDate) {
      issues.push("Expiry date harus setelah inception date.")
    }
  }
  issues.push(...locationIssues(slip), ...vehicleIssues(slip))
  if (usesSectionSumInsured(slip.cob)) {
    const clauseIssues = validateClauseUniquenessAcrossSections(slip)
    if (clauseIssues.length) issues.push(...clauseIssues)
  }
  if (totalSumInsured(slip) <= 0) issues.push("Isi sum insured.")
  if (!slip.rateLines.some((l) => (l.rate ?? 0) > 0)) {
    issues.push("Isi minimal satu rate.")
  }

  // Primary rate lines receive bounds based on COB. TPL and PA apply only to
  // Motor Vehicle, where bounds are resolved per section rather than raw labels alone.
  const allLines = rateLinesWithBounds(slip)
    .concat(
      (slip.tplLines ?? []).map((l) =>
        withSectionBounds(l, findMotorExtensionBounds(l.label))
      )
    )
    .concat(
      (slip.paLines ?? []).map((l) =>
        withSectionBounds(l, findMotorPaBounds(l.label))
      )
    )
  for (const line of allLines) {
    if (isOutOfBounds(line) && !slip.rateExceptions?.[line.id]?.note?.trim()) {
      issues.push(
        `Rate ${rateLineName(slip, line)} di luar batas OJK dan belum ada alasannya.`
      )
    }
  }

  const brokerageIssue = brokerageLimitIssue(slip)
  if (brokerageIssue) issues.push(brokerageIssue)

  return issues
}

/**
 * Isian lokasi slip Property yang wajib sebelum release. Slip satu lokasi
 * memakai pesan yang sama seperti sebelum ada daftar lokasi.
 */
export function locationIssues(slip: PlacingSlip): string[] {
  if (slip.cob !== "Property") return []
  const groups = locationGroups(slip)
  if (groups.length === 1) {
    const { location } = groups[0]
    const issues: string[] = []
    if (!location.occupation) issues.push("Pilih okupasi OJK.")
    if (!location.constructionClass) issues.push("Pilih kelas konstruksi.")
    if (!location.riskLocation.trim()) issues.push("Isi risk location.")
    return issues
  }
  return groups.flatMap(({ location, no, section1, section2 }) => {
    const issues: string[] = []
    if (!location.riskLocation.trim()) issues.push(`Isi alamat lokasi ${no}.`)
    if (!location.occupation)
      issues.push(`Pilih okupasi OJK untuk lokasi ${no}.`)
    if (!location.constructionClass)
      issues.push(`Pilih kelas konstruksi untuk lokasi ${no}.`)
    if (sumItems(section1) + sumItems(section2) <= 0)
      issues.push(`Isi sum insured lokasi ${no}.`)
    return issues
  })
}

/**
 * Isian kendaraan slip Motor Vehicle multi kendaraan yang wajib sebelum
 * release: TSI dan minimal satu rate per kendaraan. Slip satu kendaraan cukup
 * dicek oleh pemeriksaan sum insured dan rate slip.
 */
export function vehicleIssues(slip: PlacingSlip): string[] {
  if (!isMultiVehicle(slip)) return []
  return itemGroups(slip).flatMap(({ item, no, rateLines }) => {
    const issues: string[] = []
    if ((item.amount || 0) <= 0) issues.push(`Isi TSI kendaraan ${no}.`)
    if (!rateLines.some((l) => (l.rate ?? 0) > 0))
      issues.push(`Isi minimal satu rate untuk kendaraan ${no}.`)
    return issues
  })
}

/**
 * Nama baris rate di pesan validasi; slip multi lokasi atau multi kendaraan
 * menyebut lokasi atau kendaraannya.
 */
export function rateLineName(slip: PlacingSlip, line: RateLine) {
  if (isMultiVehicle(slip)) {
    const owner = itemOwner(slip)(line.vehicleId)
    const no = slip.interestItems.findIndex((v) => v.id === owner) + 1
    return no ? `${line.label} kendaraan ${no}` : line.label
  }
  if (!isMultiLocation(slip) || !slip.rateLines.some((l) => l.id === line.id)) {
    return line.label
  }
  const owner = locationOwner(slip)(line.locationId)
  const no = slipLocations(slip).findIndex((l) => l.id === owner) + 1
  return `${line.label} lokasi ${no}`
}

// Penomoran

/**
 * Nomor Quotation Slip, Cover Note, dan Closing Instruction diturunkan dari
 * nomor slip: nomor urut sama, hanya kode dokumennya yang berganti (Harry,
 * 19 Oktober 2026). 002/LCH-PLCMT/PS-MV/XI/2026 menjadi QS-MV, CN-MV, dan
 * CI-MV dengan nomor urut, bulan, dan tahun yang sama.
 */
export function derivedDocNumber(
  slipNo: string | null,
  kind: "QS" | "CN" | "CI"
) {
  if (!slipNo) return null
  const parts = slipNo.split("/")
  if (parts.length < 5) return null
  const code = parts[2].replace(/^PS-?/, "")
  parts[2] = code ? `${kind}-${code}` : kind
  return parts.join("/")
}

// Factory functions for creating new placing slips from client or SPPA.

export function slipForClient(client: Client): PlacingSlip {
  const base = switchCob(emptySlip(), client.cob)
  return {
    ...base,
    clientId: client.id,
    insuredName: client.name,
    correspondenceAddress: correspondenceAddress(client)?.value ?? "",
  }
}

export function slipFromSppa(
  sppa: Sppa,
  client: Client | null,
  covers?: (Pick<CoverOption, "name" | "abbreviation"> &
    Partial<Pick<CoverOption, "detailLabels">>)[]
): PlacingSlip {
  const cob = normalizeCob(sppa.cob)
  const base = switchCob(emptySlip(), cob)
  const property = cob === "Property"
  const motor = cob === "Motor Vehicle"

  const motorDescParts = [
    sppa.answers?.year ? `Tahun ${sppa.answers.year}` : null,
    sppa.answers?.plate ? `No. Pol: ${sppa.answers.plate}` : null,
    sppa.answers?.chassis ? `Rangka/Mesin: ${sppa.answers.chassis}` : null,
    sppa.answers?.usage ? `Penggunaan: ${sppa.answers.usage}` : null,
  ].filter(Boolean)
  const motorDesc =
    motorDescParts.length > 0 ? motorDescParts.join(" · ") : sppa.typeOfCover

  const amount: LineItem = {
    id: uid("m"),
    description: motor ? motorDesc : sppa.typeOfCover,
    amount: sppa.sumInsured,
    ...(motor
      ? {
          vehicleBrandId: sppa.vehicleBrandId ?? null,
          vehicleTypeId: sppa.vehicleTypeId ?? null,
          vehicleBrandName: sppa.vehicleBrandName ?? null,
          vehicleTypeName: sppa.vehicleTypeName ?? null,
          year: sppa.answers?.year ?? null,
          licensePlate: sppa.answers?.plate ?? null,
          chassisNumber: sppa.answers?.chassis ?? null,
          vehicleModel: sppa.answers?.usage ?? null,
        }
      : {}),
  }
  return recalc({
    ...base,
    // Okupasi dan lokasi slip Property tersimpan di lokasi pertama.
    locations: property
      ? [
          {
            ...slipLocations(base)[0],
            occupation: sppa.occupation ?? "",
            riskLocation: sppa.riskLocation,
          },
        ]
      : base.locations,
    sppaId: sppa.id,
    clientId: sppa.clientId,
    insuredName: sppa.insuredName,
    correspondenceAddress: client
      ? (correspondenceAddress(client)?.value ?? "")
      : "",
    typeOfCover: sppa.typeOfCover,
    detailRows: withDetailLabels(
      base.detailRows,
      covers?.find((c) => c.name === sppa.typeOfCover)?.detailLabels ?? []
    ),
    coverCode: coverCodeFor(cob, sppa.typeOfCover, covers),
    currency: sppa.currency,
    inceptionDate: sppa.periodStart,
    expiryDate: sppa.periodEnd,
    occupation: sppa.occupation ?? "",
    riskLocation: sppa.riskLocation,
    sumInsuredSection1: property ? [amount] : base.sumInsuredSection1,
    interestItems: property ? base.interestItems : [amount],
  })
}
