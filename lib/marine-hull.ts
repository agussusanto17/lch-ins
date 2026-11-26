/**
 * Jadwal kapal Marine Hull (Harry lewat Agus, 26 November 2026). Satu polis untuk 1 sampai N kapal.
 * Nilai dan rate diisi per kapal per section (H&M, IV, War); premi dihitung nilai × rate. Ada dua
 * format, sesuai dua jenis slip dari LCH Singapore:
 * - Patria (ringkas): kapal, tipe, tahun, GRT, class, flag, lalu nilai/rate/premi H&M, IV, dan War.
 * - MHL (lengkap): ditambah IMO, NRT, DWT, BHP, dimensi, cover, deductible Clause 12, AMD, General
 *   Average, nilai AOI, owner/managers/mortgagees, dan nilai tahun lalu untuk perbandingan renewal.
 */
import type { LineItem, PlacingSlip, RateLine } from "./data/types"

/** Sama dengan roundCents di calc.ts; calc.ts mengimpor modul ini, jadi tidak diimpor balik. */
function roundCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export type HullScheduleFormat = "patria" | "mhl"

export const HULL_FORMAT_LABELS: Record<HullScheduleFormat, string> = {
  patria: "Patria (ringkas)",
  mhl: "MHL (lengkap)",
}

/** Nilai satu section untuk satu tahun polis. IV/AOI: rate dan premi atas IV + AOI. */
export interface HullYearValues {
  hmValue: number | null
  hmRate: number | null
  ivValue: number | null
  /** Anticipated Owner's Interest, hanya format MHL. */
  aoiValue: number | null
  ivRate: number | null
  warValue: number | null
  warRate: number | null
  /** Additional Machinery Deductible (MHL). */
  amd: number | null
}

export interface Vessel extends HullYearValues {
  id: string
  name: string
  type: string
  imo: string
  built: string
  grt: string
  nrt: string
  dwt: string
  bhp: string
  classSociety: string
  flag: string
  dimensions: string
  /** Kondisi utama, misalnya ITC. */
  cover: string
  /** Deductible Clause 12 per kejadian. */
  deductible: number | null
  /** Batas General Average tanpa kontribusi kargo (MHL). */
  generalAverage: number | null
  owner: string
  managers: string
  mortgagees: string
  /** Nilai tahun polis sebelumnya untuk perbandingan renewal (MHL); kosong bila tidak diisi. */
  previous: HullYearValues | null
}

export interface HullSchedule {
  format: HullScheduleFormat
  vessels: Vessel[]
  /**
   * Pola CI Patria "H&M payable quarterly, IV & War in advance": premi IV dan War dibayar penuh di
   * cicilan pertama, persen cicilan berlaku untuk H&M (Harry, 26 November 2026).
   */
  ivWarInAdvance?: boolean
}

export const EMPTY_YEAR_VALUES: HullYearValues = {
  hmValue: null,
  hmRate: null,
  ivValue: null,
  aoiValue: null,
  ivRate: null,
  warValue: null,
  warRate: null,
  amd: null,
}

export function emptyVessel(id: string): Vessel {
  return {
    id,
    name: "",
    type: "",
    imo: "",
    built: "",
    grt: "",
    nrt: "",
    dwt: "",
    bhp: "",
    classSociety: "",
    flag: "",
    dimensions: "",
    cover: "",
    deductible: null,
    generalAverage: null,
    owner: "",
    managers: "",
    mortgagees: "",
    previous: null,
    ...EMPTY_YEAR_VALUES,
  }
}

export type HullSection = "hm" | "iv" | "war"
export const HULL_SECTIONS: readonly HullSection[] = ["hm", "iv", "war"]

export const HULL_SECTION_LABELS: Record<HullSection, string> = {
  hm: "H&M",
  iv: "IV",
  war: "War",
}

/** Nilai dasar premi satu section: H&M, IV + AOI, atau War. */
export function hullSectionValue(v: HullYearValues, section: HullSection) {
  if (section === "hm") return v.hmValue || 0
  if (section === "iv") return (v.ivValue || 0) + (v.aoiValue || 0)
  return v.warValue || 0
}

export function hullSectionRate(v: HullYearValues, section: HullSection) {
  if (section === "hm") return v.hmRate || 0
  if (section === "iv") return v.ivRate || 0
  return v.warRate || 0
}

/** Premi satu section satu kapal: nilai × rate (%), dibulatkan ke sen. */
export function hullSectionPremium(v: HullYearValues, section: HullSection) {
  return roundCents((hullSectionValue(v, section) * hullSectionRate(v, section)) / 100)
}

/** Premi satu kapal: H&M + IV/AOI + War. */
export function vesselPremium(v: HullYearValues) {
  return roundCents(HULL_SECTIONS.reduce((s, section) => s + hullSectionPremium(v, section), 0))
}

export interface HullTotals {
  hmValue: number
  hmPremium: number
  ivValue: number
  aoiValue: number
  ivPremium: number
  warValue: number
  warPremium: number
  premium: number
}

/** Total nilai dan premi per section; `previous` memakai nilai tahun lalu (kapal tanpa data dilewati). */
export function hullTotals(vessels: readonly Vessel[], previous = false): HullTotals {
  const rows = previous
    ? vessels.map((v) => v.previous).filter((p): p is HullYearValues => p != null)
    : vessels
  const sum = (pick: (v: HullYearValues) => number) =>
    roundCents(rows.reduce((s, v) => s + pick(v), 0))
  const hmPremium = sum((v) => hullSectionPremium(v, "hm"))
  const ivPremium = sum((v) => hullSectionPremium(v, "iv"))
  const warPremium = sum((v) => hullSectionPremium(v, "war"))
  return {
    hmValue: sum((v) => v.hmValue || 0),
    hmPremium,
    ivValue: sum((v) => v.ivValue || 0),
    aoiValue: sum((v) => v.aoiValue || 0),
    ivPremium,
    warValue: sum((v) => v.warValue || 0),
    warPremium,
    premium: roundCents(hmPremium + ivPremium + warPremium),
  }
}

/** Persen perubahan premi terhadap tahun lalu; null bila premi tahun lalu 0. */
export function premiumChangePct(current: number, previous: number) {
  return previous ? (current - previous) / previous : null
}

const quoted = (name: string) => `“${name.trim().toUpperCase()}”`

/** Nama satu kapal seperti di slip: tipe lalu nama bertanda kutip, misalnya BULK CARRIER “PATRIA NAWASENA 1”. */
export function vesselLabel(v: Pick<Vessel, "type" | "name">) {
  return [v.type.trim().toUpperCase(), v.name.trim() ? quoted(v.name) : ""].filter(Boolean).join(" ")
}

/**
 * Teks VESSEL di badan slip. Satu kapal ditulis langsung; lebih dari satu mengikuti contoh format:
 * - Patria: BULK CARRIER “PATRIA NAWASENA 1” & 3 OTHERS (AS PER SCHEDULE ATTACHED)
 * - MHL: CONTAINER VESSEL “PRATIWI SATU” AND 106 OTHERS, DETAILS AS PER SCHEDULE ATTACHED.
 */
export function vesselSummaryText(vessels: readonly Vessel[], format: HullScheduleFormat = "patria") {
  const named = vessels.filter((v) => v.name.trim())
  if (!named.length) return ""
  const lead = vesselLabel(named[0])
  if (named.length === 1) return lead
  const others = named.length - 1
  const word = others === 1 ? "OTHER" : "OTHERS"
  return format === "mhl"
    ? `${lead} AND ${others} ${word}, DETAILS AS PER SCHEDULE ATTACHED.`
    : `${lead} & ${others} ${word} (AS PER SCHEDULE ATTACHED)`
}

export type HullColumnKey =
  | "no"
  | "name"
  | "type"
  | "imo"
  | "built"
  | "grt"
  | "nrt"
  | "dwt"
  | "bhp"
  | "classSociety"
  | "flag"
  | "dimensions"
  | "cover"
  | "hmValue"
  | "hmRate"
  | "hmPremium"
  | "deductible"
  | "amd"
  | "generalAverage"
  | "ivValue"
  | "aoiValue"
  | "ivRate"
  | "ivPremium"
  | "warValue"
  | "warRate"
  | "warPremium"
  | "owner"
  | "managers"
  | "mortgagees"

export interface HullColumn {
  key: HullColumnKey
  /** Judul kolom seperti jadwal LCH Singapore; kolom bertahun diberi tahun polis di belakangnya. */
  title: string
  kind: "no" | "text" | "money" | "rate" | "premium"
  /** Kolom tahun polis sebelumnya (perbandingan renewal, format MHL). */
  previous?: boolean
  /** Kolom yang judulnya diberi tahun polis (format MHL). */
  yearly?: boolean
}

const col = (
  key: HullColumnKey,
  title: string,
  kind: HullColumn["kind"],
  extra: Partial<HullColumn> = {}
): HullColumn => ({ key, title, kind, ...extra })

/** Kolom jadwal per format, urutannya persis lampiran contoh supaya baris bisa disalin langsung. */
export const HULL_COLUMNS: Record<HullScheduleFormat, readonly HullColumn[]> = {
  patria: [
    col("no", "NO", "no"),
    col("name", "VESSEL", "text"),
    col("type", "TYPE", "text"),
    col("built", "BUILT", "text"),
    col("grt", "GRT", "text"),
    col("classSociety", "CLASS", "text"),
    col("flag", "FLAG", "text"),
    col("hmValue", "H&M INSURED VALUE", "money"),
    col("hmRate", "H&M RATE", "rate"),
    col("hmPremium", "H&M PREMIUM", "premium"),
    col("ivValue", "IV INSURED VALUE", "money"),
    col("ivRate", "IV RATE", "rate"),
    col("ivPremium", "IV PREMIUM", "premium"),
    col("warValue", "WAR INSURED VALUE", "money"),
    col("warRate", "WAR RATE", "rate"),
    col("warPremium", "WAR PREMIUM", "premium"),
  ],
  mhl: [
    col("no", "NO", "no"),
    col("name", "VESSEL", "text"),
    col("type", "TYPE", "text"),
    col("imo", "IMO NUMBER", "text"),
    col("built", "BUILT", "text"),
    col("grt", "GRT", "text"),
    col("nrt", "NRT", "text"),
    col("dwt", "DWT", "text"),
    col("bhp", "BHP", "text"),
    col("classSociety", "CLASS", "text"),
    col("flag", "FLAG", "text"),
    col("dimensions", "DIMENSIONS", "text"),
    col("cover", "COVER", "text"),
    col("hmValue", "H&M INSURED VALUE", "money", { previous: true, yearly: true }),
    col("hmRate", "H&M RATE", "rate", { previous: true, yearly: true }),
    col("hmPremium", "H&M PREMIUM", "premium", { previous: true, yearly: true }),
    col("hmValue", "H&M INSURED VALUE", "money", { yearly: true }),
    col("hmRate", "H&M RATE", "rate", { yearly: true }),
    col("hmPremium", "H&M PREMIUM", "premium", { yearly: true }),
    col("deductible", "DEDUCTIBLE CLAUSE 12", "money"),
    col("amd", "AMD", "money", { previous: true, yearly: true }),
    col("amd", "AMD", "money", { yearly: true }),
    col("generalAverage", "GENERAL AVERAGE", "money"),
    col("ivValue", "IV INSURED VALUE", "money", { previous: true, yearly: true }),
    col("aoiValue", "AOI INSURED VALUE", "money", { previous: true, yearly: true }),
    col("ivRate", "IV/AOI RATE", "rate", { previous: true, yearly: true }),
    col("ivPremium", "IV/AOI PREMIUM", "premium", { previous: true, yearly: true }),
    col("ivValue", "IV INSURED VALUE", "money", { yearly: true }),
    col("aoiValue", "AOI INSURED VALUE", "money", { yearly: true }),
    col("ivRate", "IV/AOI RATE", "rate", { yearly: true }),
    col("ivPremium", "IV/AOI PREMIUM", "premium", { yearly: true }),
    col("warValue", "WR INSURED VALUE", "money", { previous: true, yearly: true }),
    col("warRate", "WR RATE", "rate", { previous: true, yearly: true }),
    col("warPremium", "WR PREMIUM", "premium", { previous: true, yearly: true }),
    col("warValue", "WR INSURED VALUE", "money", { yearly: true }),
    col("warRate", "WR RATE", "rate", { yearly: true }),
    col("warPremium", "WR PREMIUM", "premium", { yearly: true }),
    col("owner", "OWNER", "text"),
    col("managers", "MANAGERS", "text"),
    col("mortgagees", "MORTGAGEES", "text"),
  ],
}

/** Judul kolom dengan tahun polis untuk kolom bertahun (MHL: "H&M INSURED VALUE 2022"). */
export function hullColumnTitle(column: HullColumn, policyYear: number) {
  if (!column.yearly) return column.title
  return `${column.title} ${column.previous ? policyYear - 1 : policyYear}`
}

/** Nilai satu kolom untuk satu kapal: teks, angka, premi terhitung, atau nomor urut. */
export function hullCellValue(vessel: Vessel, column: HullColumn, index: number): string | number | null {
  if (column.kind === "no") return index + 1
  const values: HullYearValues | null = column.previous ? vessel.previous : vessel
  if (column.kind === "premium") {
    if (!values) return null
    const section: HullSection =
      column.key === "hmPremium" ? "hm" : column.key === "ivPremium" ? "iv" : "war"
    return hullSectionPremium(values, section)
  }
  if (column.kind === "money" || column.kind === "rate") {
    const key = column.key as keyof HullYearValues | "deductible" | "generalAverage"
    if (key === "deductible" || key === "generalAverage") return vessel[key]
    return values ? values[key] : null
  }
  return vessel[column.key as keyof Vessel] as string
}

/** COB yang memakai jadwal kapal. */
export const HULL_COB = "Marine Hull"

/** Slip Marine Hull dengan jadwal kapal: interest dan rate per section diturunkan dari jadwal. */
export function usesHullSchedule(
  slip: Pick<PlacingSlip, "cob" | "hullSchedule">
): slip is Pick<PlacingSlip, "cob"> & { hullSchedule: HullSchedule } {
  return slip.cob === HULL_COB && slip.hullSchedule != null
}

/** Tahun polis untuk judul kolom bertahun (MHL): tahun inception slip, atau tahun ini. */
export function hullPolicyYear(inceptionDate: string | null | undefined) {
  const year = Number(inceptionDate?.slice(0, 4))
  return Number.isInteger(year) && year > 1900 ? year : new Date().getFullYear()
}

export function newHullSchedule(vesselId: string): HullSchedule {
  return { format: "patria", vessels: [emptyVessel(vesselId)], ivWarInAdvance: true }
}

export interface HullSlipSection {
  key: HullSection
  /** Penanda section di slip: (A)/(B)/(C) Patria, 1/2/3 MHL. */
  code: string
  title: string
  /** Kata-kata INTEREST di slip cetak, persis contoh format. */
  wording: string
}

/** Urutan section per format: Patria (A) H&M, (B) IV, (C) War; MHL 1 H&M, 2 War, 3 IV/AOI. */
export const HULL_SLIP_SECTIONS: Record<HullScheduleFormat, readonly HullSlipSection[]> = {
  patria: [
    {
      key: "hm",
      code: "(A)",
      title: "Hull, Materials & Machinery",
      wording: "HULL, MATERIALS & MACHINERY OUTFITS ETC AND EVERYTHING CONNECTED HEREWITH.",
    },
    {
      key: "iv",
      code: "(B)",
      title: "Increased Value and/or Disbursements",
      wording: "INCREASED VALUE AND/OR DISBURSEMENTS INCLUDING EXCESS LIABILITIES",
    },
    { key: "war", code: "(C)", title: "War Risks", wording: "WAR RISKS INSURANCE" },
  ],
  mhl: [
    {
      key: "hm",
      code: "1",
      title: "Hull, Materials & Machinery",
      wording: "HULL, MATERIALS & MACHINERY OUTFITS ETC AND EVERYTHING CONNECTED THEREWITH.",
    },
    { key: "war", code: "2", title: "War Risks", wording: "WAR RISKS INSURANCE." },
    {
      key: "iv",
      code: "3",
      title: "Increased Value / Anticipated Owner's Interest",
      wording:
        "1) INCREASED VALUE AND/OR DISBURSEMENT INCLUDING EXCESS LIABILITIES. (WHERE APPLICABLE)\n2) ANTICIPATED OWNER’S INTEREST. (WHERE APPLICABLE)",
    },
  ],
}

/** Label dan kalimat badan slip cetak per format, persis contoh CI Patria dan signed slip MHL. */
export const HULL_PRINT_TEXT: Record<
  HullScheduleFormat,
  { interest: string; vessel: string; insuredValue: string; rate: string }
> = {
  patria: {
    interest: "Interest",
    vessel: "Vessel",
    insuredValue: "AS PER SCHEDULE ATTACHED",
    rate: "AS PER SCHEDULE ATTACHED",
  },
  mhl: {
    interest: "Interests",
    vessel: "Vessels",
    insuredValue: "100% AS PER SCHEDULE ATTACHED FOR ALL SECTIONS.",
    rate: "100% AS PER SCHEDULE ATTACHED FOR ALL SECTIONS.\nPER ANNUM PRO RATA. (NOT INCLUSIVE OF ADMINISTRATIVE COSTS AND TAXES IF APPLICABLE).",
  },
}

/** Baris Detail Tambahan "Vessel(s)": dicetak di bawah teks VESSEL slip jadwal kapal. */
export function isVesselDetailLabel(label: string) {
  return /^vessels?$/i.test(label.trim())
}

/**
 * Section yang dipakai jadwal: punya nilai atau rate di salah satu kapal, urut sesuai format.
 * Jadwal yang belum berisi angka memakai ketiganya.
 */
export function activeHullSections(schedule: HullSchedule): readonly HullSlipSection[] {
  const all = HULL_SLIP_SECTIONS[schedule.format]
  const used = all.filter((s) =>
    schedule.vessels.some((v) => hullSectionValue(v, s.key) > 0 || hullSectionRate(v, s.key) > 0)
  )
  return used.length ? used : all
}

/** Nama cover baris rate per section. Sama di kedua format supaya baris lama tetap dikenali. */
export const HULL_LINE_LABELS: Record<HullSection, string> = {
  hm: "Hull & Machinery",
  iv: "Increased Value",
  war: "War Risks",
}

/** Nilai per section untuk interest slip: IV termasuk AOI. */
export function hullSectionTotals(vessels: readonly Vessel[]) {
  const t = hullTotals(vessels)
  return {
    value: { hm: t.hmValue, iv: roundCents(t.ivValue + t.aoiValue), war: t.warValue },
    premium: { hm: t.hmPremium, iv: t.ivPremium, war: t.warPremium },
  } satisfies Record<string, Record<HullSection, number>>
}

/**
 * TSI jadwal kapal: jumlah nilai semua section, H&M + IV (+AOI) + War, karena tiap section punya rate
 * dan premi sendiri (Agus, 26 November 2026).
 */
export function hullSumInsured(vessels: readonly Vessel[]) {
  const { value } = hullSectionTotals(vessels)
  return roundCents(value.hm + value.iv + value.war)
}

/** Teks interest slip bila jadwal belum punya kapal bernama. */
export const HULL_INTEREST_FALLBACK = "VESSELS AS PER SCHEDULE ATTACHED"

/**
 * Interest dan rate slip dari jadwal kapal: satu objek (armada) senilai TSI jadwal, dengan satu
 * baris premi flat per section yang dipakai, sesuai urutan format. Diskon, brokerage, installment, polis, dan
 * report memakai premi jadwal; deductible diisi per cover. Id dan deductible baris dengan nama
 * cover yang sama dipertahankan.
 */
export function hullSlipRows(
  slip: Pick<PlacingSlip, "interestItems" | "rateLines">,
  schedule: HullSchedule
): Pick<PlacingSlip, "interestItems" | "rateLines" | "tplLines" | "paLines"> {
  const { premium } = hullSectionTotals(schedule.vessels)
  const itemId = slip.interestItems.length === 1 ? slip.interestItems[0].id : "hull-fleet"
  const item: LineItem = {
    id: itemId,
    description: vesselSummaryText(schedule.vessels, schedule.format) || HULL_INTEREST_FALLBACK,
    amount: hullSumInsured(schedule.vessels),
  }
  const used = new Set<string>()
  const rateLines = activeHullSections(schedule).map((section): RateLine => {
    const label = HULL_LINE_LABELS[section.key]
    const prev = slip.rateLines.find((l) => l.label === label)
    const id = prev && !used.has(prev.id) ? prev.id : `${itemId}-${section.key}`
    used.add(id)
    return {
      id,
      label,
      rate: null,
      premium: premium[section.key],
      flatPremium: true,
      deductibles: prev?.deductibles,
      vehicleId: itemId,
    }
  })
  return { interestItems: [item], rateLines, tplLines: [], paLines: [] }
}

const MAX_ISSUES = 8

/** Pesan release jadwal kapal: minimal satu kapal, tiap kapal bernama dan punya section yang berpremi. */
export function hullScheduleIssues(schedule: HullSchedule): string[] {
  const issues: string[] = []
  if (!schedule.vessels.length) return ["Jadwal kapal: isi minimal satu kapal."]
  schedule.vessels.forEach((v, i) => {
    const name = v.name.trim() || `Kapal baris ${i + 1}`
    if (!v.name.trim()) issues.push(`Jadwal kapal baris ${i + 1}: nama kapal kosong.`)
    let priced = false
    for (const section of HULL_SECTIONS) {
      const hasValue = hullSectionValue(v, section) > 0
      const hasRate = hullSectionRate(v, section) > 0
      if (hasValue && hasRate) priced = true
      else if (hasValue) issues.push(`${name}: rate ${HULL_SECTION_LABELS[section]} belum diisi.`)
      else if (hasRate) issues.push(`${name}: nilai ${HULL_SECTION_LABELS[section]} belum diisi.`)
    }
    if (!priced && !issues.some((m) => m.startsWith(`${name}:`))) {
      issues.push(`${name}: nilai dan rate H&M, IV, atau War belum diisi.`)
    }
  })
  if (issues.length <= MAX_ISSUES) return issues
  return [...issues.slice(0, MAX_ISSUES), `Jadwal kapal: ${issues.length - MAX_ISSUES} isian lain belum lengkap.`]
}

const MAX_VESSELS = 500
const MAX_TEXT = 500

const cleanText = (v: unknown) =>
  typeof v === "string" ? v.trim().slice(0, MAX_TEXT) : typeof v === "number" ? String(v) : ""

const cleanAmount = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null

function cleanYearValues(raw: unknown): HullYearValues {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  return {
    hmValue: cleanAmount(r.hmValue),
    hmRate: cleanAmount(r.hmRate),
    ivValue: cleanAmount(r.ivValue),
    aoiValue: cleanAmount(r.aoiValue),
    ivRate: cleanAmount(r.ivRate),
    warValue: cleanAmount(r.warValue),
    warRate: cleanAmount(r.warRate),
    amd: cleanAmount(r.amd),
  }
}

const TEXT_KEYS = [
  "name",
  "type",
  "imo",
  "built",
  "grt",
  "nrt",
  "dwt",
  "bhp",
  "classSociety",
  "flag",
  "dimensions",
  "cover",
  "owner",
  "managers",
  "mortgagees",
] as const satisfies readonly (keyof Vessel)[]

/** Jadwal kapal dari JSON tersimpan atau kiriman form; null bila slip tidak memakai jadwal. */
export function cleanHullSchedule(raw: unknown): HullSchedule | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const r = raw as { format?: unknown; vessels?: unknown }
  const list = Array.isArray(r.vessels) ? r.vessels.slice(0, MAX_VESSELS) : []
  const vessels = list.map((item, i): Vessel => {
    const v = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
    const vessel = {
      ...emptyVessel(cleanText(v.id) || `v${i + 1}`),
      ...cleanYearValues(v),
      deductible: cleanAmount(v.deductible),
      generalAverage: cleanAmount(v.generalAverage),
      previous: v.previous && typeof v.previous === "object" ? cleanYearValues(v.previous) : null,
    }
    for (const key of TEXT_KEYS) vessel[key] = cleanText(v[key])
    return vessel
  })
  return {
    format: r.format === "mhl" ? "mhl" : "patria",
    vessels,
    ...((raw as { ivWarInAdvance?: unknown }).ivWarInAdvance === true ? { ivWarInAdvance: true } : {}),
  }
}
