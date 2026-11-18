/**
 * Upload lokasi slip Property dari Excel (MoM review Phase 1, poin 6): satu baris satu lokasi,
 * lengkap dengan nama tertanggung, okupasi, sum insured, rate, dan deductible seperti lampiran
 * polis PT. SPIL (Fleet Office) PAR 50013026001304. Kolom dikenali dari judulnya, dan template
 * dari `fillLocationTemplate` memakai daftar kolom yang sama.
 */
import type { Cell, Workbook, Worksheet } from "exceljs"

import { BI_RATE_LABELS } from "./calc"
import { BI_SCALE_OJK, OCCUPATION_TARIFFS } from "./data/ojk-tariff"
import { CONSTRUCTION_CLASSES } from "./data/reference"
import { MAX_DEDUCTIBLES } from "./data/types"
import { locationKey } from "./slip-locations"
import { cellText, cellValue, parseParticipantAmount } from "./slip-participants"

/** Batas lokasi per file, sama dengan jumlah baris template. */
export const LOCATION_IMPORT_LIMIT = 500

/** Baris pertama data di sheet Lokasi template: baris 1 kelompok kolom, baris 2 judul. */
const FIRST_ROW = 3

/** Panjang maksimal isian teks. */
const LIMITS = { insuredName: 500, riskLocation: 1000, occupationLabel: 500 }

type ColumnGroup = "lokasi" | "md" | "bi" | "total" | "rate" | "ded"
type ColumnKind =
  | "text"
  | "number"
  | "code"
  | "class"
  | "indemnity"
  | "money"
  | "rate"
  | "auto"

export interface LocationColumn {
  key: string
  title: string
  group: ColumnGroup
  width: number
  kind: ColumnKind
  required?: boolean
  /** Judul yang dikenali saat upload, huruf kecil tanpa tanda bintang. */
  names: string[]
  /** Catatan di judul kolom template dan di sheet Petunjuk. */
  note?: string
}

/** Cover di template, urut seperti baris rate slip PAR + EQVET. Rate BI dihitung sistem. */
export const TEMPLATE_COVERS = [
  { title: "FLEXAS", label: "FLEXAS", basis: "md" },
  { title: "FWTWD", label: "FWTWD", basis: "md" },
  { title: "RSMDCC", label: "RSMDCC", basis: "md" },
  { title: "Other Losses", label: "Other Losses", basis: "md" },
  { title: "BI PAR", label: BI_RATE_LABELS[0], basis: "bi" },
  { title: "EQVET", label: "EQVET", basis: "md" },
  { title: "BI EQVET", label: BI_RATE_LABELS[1], basis: "bi" },
] as const

const isBiCover = (cover: (typeof TEMPLATE_COVERS)[number]) => cover.basis === "bi"

const MD_PAIRS = 5
const BI_PAIRS = 2

function buildColumns(): LocationColumn[] {
  const cols: LocationColumn[] = [
    {
      key: "no",
      title: "No",
      group: "lokasi",
      width: 5,
      kind: "number",
      names: ["no", "no."],
      note: "Nomor urut lokasi. Boleh kosong; urutan lokasi mengikuti urutan baris.",
    },
    {
      key: "insured",
      title: "Insured Name",
      group: "lokasi",
      width: 30,
      kind: "text",
      names: ["insured name", "nama tertanggung", "tertanggung"],
      note: "Nama tertanggung untuk lokasi ini, misalnya PT A QQ B. Kosong berarti sama dengan tertanggung di slip.",
    },
    {
      key: "location",
      title: "Risk Location",
      group: "lokasi",
      width: 36,
      kind: "text",
      required: true,
      names: ["risk location", "lokasi risiko", "alamat lokasi"],
      note: "Alamat lengkap dengan kabupaten atau kota, misalnya ..., Surabaya. Zona gempa dan banjir OJK dibaca dari nama kota ini.",
    },
    {
      key: "occupation",
      title: "Kode Okupasi OJK",
      group: "lokasi",
      width: 22,
      kind: "code",
      required: true,
      names: ["kode okupasi ojk", "kode okupasi", "occupation code"],
      note: "Pilih dari dropdown atau ketik kodenya saja, misalnya 2971. Daftar lengkap di sheet Okupasi.",
    },
    {
      key: "ojkName",
      title: "Nama Okupasi OJK (otomatis)",
      group: "lokasi",
      width: 36,
      kind: "auto",
      names: [],
      note: "Terisi otomatis dari Kode Okupasi OJK.",
    },
    {
      key: "occupationLabel",
      title: "Nama Okupasi di Slip",
      group: "lokasi",
      width: 22,
      kind: "text",
      names: ["nama okupasi di slip", "nama okupasi slip"],
      note: "Isi bila nama yang dicetak berbeda dari nama OJK, misalnya Office & Mess. Kode okupasi tetap tercetak.",
    },
    {
      key: "constructionClass",
      title: "Construction Class",
      group: "lokasi",
      width: 13,
      kind: "class",
      names: ["construction class", "kelas konstruksi"],
      note: "Class I, Class II, atau Class III. Wajib bila rate FLEXAS atau EQVET diisi.",
    },
    {
      key: "indemnity",
      title: "Period of Indemnity (bulan)",
      group: "lokasi",
      width: 12,
      kind: "indemnity",
      names: ["period of indemnity", "indemnity period"],
      note: "Isi bila ada Section 2 (Business Interruption). Slip menyimpan satu periode, jadi isi sama untuk semua lokasi.",
    },
  ]
  for (let i = 1; i <= MD_PAIRS; i++) {
    cols.push(
      {
        key: `mdDesc${i}`,
        title: `Interest MD ${i}`,
        group: "md",
        width: 22,
        kind: "text",
        required: i === 1,
        names: [`interest md ${i}`],
        note: i === 1 ? "Interest Section 1 Material Damage, misalnya Bangunan, Mesin, Stok." : undefined,
      },
      {
        key: `mdValue${i}`,
        title: `Sum Insured MD ${i}`,
        group: "md",
        width: 18,
        kind: "money",
        required: i === 1,
        names: [`sum insured md ${i}`],
        note:
          i === 1
            ? "Angka saja tanpa mata uang dan titik ribuan, misalnya 23096320000. Mata uang mengikuti slip."
            : undefined,
      }
    )
  }
  cols.push({
    key: "mdTotal",
    title: "Total Material Damage (otomatis)",
    group: "md",
    width: 20,
    kind: "auto",
    names: [],
  })
  for (let i = 1; i <= BI_PAIRS; i++) {
    cols.push(
      {
        key: `biDesc${i}`,
        title: `Interest BI ${i}`,
        group: "bi",
        width: 22,
        kind: "text",
        names: [`interest bi ${i}`],
        note:
          i === 1
            ? "Interest Section 2 Business Interruption, misalnya Gross Profit. Kosongkan bila tidak ada BI."
            : undefined,
      },
      {
        key: `biValue${i}`,
        title: `Sum Insured BI ${i}`,
        group: "bi",
        width: 18,
        kind: "money",
        names: [`sum insured bi ${i}`],
        note: i === 1 ? "Angka saja tanpa mata uang dan titik ribuan." : undefined,
      }
    )
  }
  cols.push(
    {
      key: "biTotal",
      title: "Total Business Interruption (otomatis)",
      group: "bi",
      width: 20,
      kind: "auto",
      names: [],
    },
    {
      key: "tsi",
      title: "Total Sum Insured (otomatis)",
      group: "total",
      width: 20,
      kind: "auto",
      names: [],
      note: "Material Damage + Business Interruption, sama dengan Total Sum Insured lokasi di form.",
    }
  )
  for (const cover of TEMPLATE_COVERS) {
    const bi = isBiCover(cover)
    cols.push({
      key: `rate:${cover.title}`,
      title: bi ? `Rate ${cover.title} (‰, otomatis)` : `Rate ${cover.title} (‰)`,
      group: "rate",
      width: 12,
      kind: bi ? "auto" : "rate",
      names: [`rate ${cover.title.toLowerCase()}`],
      note:
        cover.title === "FLEXAS"
          ? "Rate per mil (‰), sama dengan form slip: 0,75 berarti 0,75‰. Kosongkan cover yang tidak dijamin. Batas FLEXAS OJK per kelas ada di sheet Okupasi."
          : cover.title === "BI PAR"
            ? "Otomatis, sama dengan sistem: (FLEXAS + FWTWD + RSMDCC + Other Losses) × skala Period of Indemnity, bila ada Sum Insured BI."
            : cover.title === "BI EQVET"
              ? "Otomatis, sama dengan sistem: EQVET × skala Period of Indemnity, bila ada Sum Insured BI."
              : undefined,
    })
  }
  cols.push({
    key: "premiumCheck",
    title: "Cek Premi (otomatis)",
    group: "rate",
    width: 18,
    kind: "auto",
    names: [],
    note: "Premi lokasi sebelum diskon: sum insured × rate ÷ 1.000 per cover, dibulatkan per cover seperti sistem. Hanya untuk pengecekan.",
  })
  for (const cover of TEMPLATE_COVERS) {
    cols.push({
      key: `ded:${cover.title}`,
      title: `Deductible ${cover.title}`,
      group: "ded",
      width: 34,
      kind: "text",
      names: [`deductible ${cover.title.toLowerCase()}`],
      note:
        cover.title === "FLEXAS"
          ? `Deductible per cover. Lebih dari satu: pisahkan dengan baris baru (Alt+Enter), maksimal ${MAX_DEDUCTIBLES} baris. Kosongkan semua kolom deductible bila deductible sama untuk semua lokasi.`
          : undefined,
    })
  }
  return cols
}

export const LOCATION_COLUMNS = buildColumns()

const norm = (s: string) =>
  s.toLowerCase().replace(/\s+/g, " ").replace(/[*:]/g, "").trim()

/** Indeks kolom menurut judul dan alias; "Rate FLEXAS (‰)" cocok dengan "rate flexas". */
function columnIndex(header: string[], col: LocationColumn) {
  for (const name of col.names) {
    const index = header.findIndex((h) => h === name || h.startsWith(`${name} (`))
    if (index >= 0) return index
  }
  return -1
}

const OCCUPATIONS = new Map(
  OCCUPATION_TARIFFS.map((o) => [o.code.toLowerCase(), o])
)

/** Kode okupasi dari isian "2971", angka 2971, atau pilihan dropdown "2971 - Office ...". */
function occupationCode(text: string) {
  return text.trim().split(/[^0-9A-Za-z]/)[0].toLowerCase()
}

/** "Class I", "I", "1", "K1", atau "Kelas 1" menjadi kode kelas K1. */
export function parseConstructionClass(text: string) {
  const t = text.toLowerCase().replace(/[\s.]+/g, " ").trim()
  const value = t.replace(/^(class|kelas|klas)\s*/, "").replace(/^k\s*/, "")
  const n = { "1": 1, i: 1, "2": 2, ii: 2, "3": 3, iii: 3 }[value]
  return n ? CONSTRUCTION_CLASSES[n - 1].code : null
}

/** Rate per mil: angka Excel, atau teks "0,75" / "0.75"; tanpa pemisah ribuan. */
export function parseRate(value: unknown): number | null {
  if (value == null || value === "") return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  let text = String(value).replace(/[\s‰%]/g, "")
  if (text.includes(",") && text.includes("."))
    text = text.lastIndexOf(",") > text.lastIndexOf(".")
      ? text.replaceAll(".", "").replace(",", ".")
      : text.replaceAll(",", "")
  else text = text.replace(",", ".")
  if (!/^-?\d*\.?\d+$/.test(text)) return null
  return Number(text)
}

const isFormula = (value: unknown) =>
  value != null &&
  typeof value === "object" &&
  ("formula" in value || "sharedFormula" in value)

export interface LocationImportRow {
  /** Nomor baris di Excel, untuk pesan kesalahan dan pratinjau. */
  row: number
  insuredName?: string
  riskLocation: string
  /** Okupasi OJK "kode - nama", sama dengan pilihan di form. */
  occupation: string
  occupationLabel?: string
  /** Kode kelas konstruksi K1, K2, atau K3. */
  constructionClass?: string
  section1: { description: string; amount: number }[]
  section2: { description: string; amount: number }[]
  /** Rate per mil per label baris rate slip; cover yang kosong tidak ada. */
  rates: Record<string, number>
  /** Deductible per label baris rate slip. */
  deductibles: Record<string, string[]>
}

export interface LocationImportContext {
  /** Label baris rate slip, mengikuti type of cover; rate untuk cover lain ditolak. */
  rateLabels: readonly string[]
  /** Slip floating: hanya data lokasi yang dipakai; sum insured, rate, dan deductible diabaikan. */
  floating: boolean
  /**
   * Kunci lokasi yang sudah ada di slip (`locationKey`); barisnya dilewati supaya file yang sama
   * bisa diupload ulang. Kosong saat semua lokasi diganti.
   */
  existingKeys: ReadonlySet<string>
}

export interface LocationImportResult {
  locations: LocationImportRow[]
  skipped: { row: number; riskLocation: string }[]
  /** Kesalahan per baris ("Baris N: ...") lalu kesalahan tingkat file. */
  errors: string[]
  /** Kesalahan yang menahan seluruh file. */
  fileErrors: string[]
  /** Baris berisi yang dibaca, termasuk yang dilewati dan yang gagal. */
  read: number
  failed: number
  /** Period of Indemnity dari file, sama untuk semua baris; kosong bila tidak diisi. */
  indemnityMonths: number | null
  /** File berisi deductible; tanpa itu lokasi baru memakai deductible lokasi pertama. */
  hasDeductibles: boolean
  /** Baris yang rate BI-nya diisi manual (template lama); rate BI tetap dihitung sistem. */
  biRateRows: number
  /** Baris slip floating yang berisi sum insured, rate, atau deductible yang tidak dipakai. */
  floatingIgnoredRows: number
}

/**
 * Baris pertama yang memuat kolom Risk Location dan Kode Okupasi OJK jadi judul. Baris tanpa isian
 * (termasuk yang hanya berisi rumus template) dilewati. Kesalahan dikumpulkan dengan nomor baris
 * Excel-nya; baris yang salah tidak ikut ditambahkan.
 */
export function locationsFromRows(
  rows: unknown[][],
  ctx: LocationImportContext
): LocationImportResult {
  const result: LocationImportResult = {
    locations: [],
    skipped: [],
    errors: [],
    fileErrors: [],
    read: 0,
    failed: 0,
    indemnityMonths: null,
    hasDeductibles: false,
    biRateRows: 0,
    floatingIgnoredRows: 0,
  }
  const col = (key: string) => LOCATION_COLUMNS.find((c) => c.key === key)!
  const headerIndex = rows.findIndex((row) => {
    const names = row.map((c) => norm(cellText(c)))
    return (
      columnIndex(names, col("location")) >= 0 &&
      columnIndex(names, col("occupation")) >= 0
    )
  })
  if (headerIndex < 0) {
    const message =
      "Kolom Risk Location dan Kode Okupasi OJK tidak ditemukan. Pakai template lokasi."
    result.errors.push(message)
    result.fileErrors.push(message)
    return result
  }
  const header = rows[headerIndex].map((c) => norm(cellText(c)))
  const columnOf = new Map(
    LOCATION_COLUMNS.map((c) => [c.key, columnIndex(header, c)])
  )
  const inputColumns = LOCATION_COLUMNS.filter(
    (c) => c.kind !== "auto" && c.key !== "no"
  )
  const labels = new Set(ctx.rateLabels)
  const seen = new Map<string, number>()
  const indemnities = new Map<number, number>()

  rows.slice(headerIndex + 1).forEach((row, i) => {
    const excelRow = headerIndex + i + 2
    const raw = (key: string) => {
      const index = columnOf.get(key) ?? -1
      return index < 0 ? undefined : row[index]
    }
    // Rumus template (misalnya Nama Okupasi OJK) tidak dihitung sebagai isian.
    const text = (key: string) => {
      const value = raw(key)
      return isFormula(value) ? "" : cellText(value)
    }
    if (inputColumns.every((c) => !text(c.key))) return
    const errors: string[] = []
    const fail = (message: string) => errors.push(`Baris ${excelRow}: ${message}`)

    const riskLocation = text("location")
    if (!riskLocation) fail("Risk Location kosong.")
    else if (riskLocation.length > LIMITS.riskLocation)
      fail(`Risk Location maksimal ${LIMITS.riskLocation} karakter.`)

    const insuredName = text("insured")
    if (insuredName.length > LIMITS.insuredName)
      fail(`Insured Name maksimal ${LIMITS.insuredName} karakter.`)

    const occupationText = text("occupation")
    const occupation = occupationText
      ? OCCUPATIONS.get(occupationCode(occupationText))
      : undefined
    if (!occupationText) fail("Kode Okupasi OJK kosong.")
    else if (!occupation)
      fail(`Kode Okupasi OJK "${occupationText}" tidak ada di daftar OJK (sheet Okupasi).`)

    const occupationLabel = text("occupationLabel")
    if (occupationLabel.length > LIMITS.occupationLabel)
      fail(`Nama Okupasi di Slip maksimal ${LIMITS.occupationLabel} karakter.`)

    const classText = text("constructionClass")
    const constructionClass = classText ? parseConstructionClass(classText) : null
    if (classText && !constructionClass)
      fail(`Construction Class "${classText}" tidak dikenali. Isi Class I, Class II, atau Class III.`)

    const indemnityText = text("indemnity")
    if (indemnityText) {
      const months = parseParticipantAmount(cellValue(raw("indemnity")))
      if (months == null || !Number.isInteger(months) || months <= 0)
        fail(`Period of Indemnity "${indemnityText}" harus jumlah bulan, misalnya 12.`)
      else if (!indemnities.has(months)) indemnities.set(months, excelRow)
    }

    const section1: LocationImportRow["section1"] = []
    const section2: LocationImportRow["section2"] = []
    const rates: Record<string, number> = {}
    const deductibles: Record<string, string[]> = {}
    const valueColumns = LOCATION_COLUMNS.filter(
      (c) => c.group === "md" || c.group === "bi" || c.kind === "rate" || c.group === "ded"
    )

    if (ctx.floating) {
      if (valueColumns.some((c) => text(c.key))) result.floatingIgnoredRows += 1
    } else {
      const pairs = (prefix: "md" | "bi", count: number, target: typeof section1) => {
        const name = prefix.toUpperCase()
        for (let n = 1; n <= count; n++) {
          const description = text(`${prefix}Desc${n}`)
          const valueText = text(`${prefix}Value${n}`)
          if (!description && !valueText) continue
          const amount = parseParticipantAmount(cellValue(raw(`${prefix}Value${n}`)))
          if (!description) fail(`Isi Interest ${name} ${n} untuk Sum Insured ${name} ${n}.`)
          else if (!valueText) fail(`Isi Sum Insured ${name} ${n} untuk ${description}.`)
          else if (amount == null || amount < 0)
            fail(`Sum Insured ${name} ${n} "${valueText}" harus angka 0 atau lebih, tanpa mata uang.`)
          else target.push({ description, amount: Math.round(amount * 100) / 100 })
        }
      }
      if (!text("mdDesc1") && !text("mdValue1"))
        fail("Interest MD 1 dan Sum Insured MD 1 wajib diisi.")
      pairs("md", MD_PAIRS, section1)
      pairs("bi", BI_PAIRS, section2)

      // Template versi pertama punya kolom rate BI yang diisi manual; rate BI selalu dihitung
      // sistem dari rate lain lokasi itu (Harry, 5 November 2026), jadi isiannya hanya dicatat.
      if (TEMPLATE_COVERS.some((c) => isBiCover(c) && text(`rate:${c.title}`)))
        result.biRateRows += 1
      for (const cover of TEMPLATE_COVERS) {
        if (isBiCover(cover)) continue
        const key = `rate:${cover.title}`
        const value = raw(key)
        const rateText = text(key)
        if (!rateText) continue
        const rate = parseRate(cellValue(value))
        if (rate == null || rate < 0 || rate > 1000)
          fail(`Rate ${cover.title} "${rateText}" harus angka per mil antara 0 dan 1000, misalnya 0,75.`)
        else if (!labels.has(cover.label))
          fail(`Rate ${cover.title} diisi, tetapi type of cover slip tidak punya cover ${cover.title}.`)
        else rates[cover.label] = rate
      }

      if (!constructionClass && !classText && ((rates.FLEXAS ?? 0) > 0 || (rates.EQVET ?? 0) > 0))
        fail("Construction Class wajib karena rate FLEXAS atau EQVET diisi.")

      for (const cover of TEMPLATE_COVERS) {
        const value = text(`ded:${cover.title}`)
        if (!value) continue
        result.hasDeductibles = true
        const list = value
          .split(/\r?\n/)
          .map((t) => t.trim())
          .filter(Boolean)
        if (list.length > MAX_DEDUCTIBLES)
          fail(`Deductible ${cover.title} lebih dari ${MAX_DEDUCTIBLES} baris.`)
        else if (!labels.has(cover.label))
          fail(`Deductible ${cover.title} diisi, tetapi type of cover slip tidak punya cover ${cover.title}.`)
        else deductibles[cover.label] = list
      }
    }

    const key = locationKey({ riskLocation, insuredName })
    if (riskLocation && ctx.existingKeys.has(key) && !seen.has(key)) {
      seen.set(key, excelRow)
      result.read += 1
      result.skipped.push({ row: excelRow, riskLocation })
      return
    }
    if (riskLocation && seen.has(key))
      fail(`Lokasi sama dengan baris ${seen.get(key)} (alamat dan tertanggung sama).`)
    else if (riskLocation) seen.set(key, excelRow)

    result.read += 1
    if (errors.length) {
      result.errors.push(...errors)
      result.failed += 1
      return
    }
    result.locations.push({
      row: excelRow,
      ...(insuredName ? { insuredName } : {}),
      riskLocation,
      occupation: `${occupation!.code} - ${occupation!.name}`,
      ...(occupationLabel ? { occupationLabel } : {}),
      ...(constructionClass ? { constructionClass } : {}),
      section1,
      section2,
      rates,
      deductibles,
    })
  })

  if (indemnities.size > 1) {
    result.fileErrors.push(
      `Period of Indemnity berbeda antar baris (${[...indemnities.entries()]
        .map(([months, row]) => `${months} bulan di baris ${row}`)
        .join(", ")}). Slip menyimpan satu periode; samakan untuk semua lokasi.`
    )
  }
  result.indemnityMonths = indemnities.size === 1 ? [...indemnities.keys()][0] : null
  const filled = result.read - result.skipped.length
  if (filled > LOCATION_IMPORT_LIMIT)
    result.fileErrors.push(
      `Maksimal ${LOCATION_IMPORT_LIMIT.toLocaleString("id-ID")} lokasi per file. Pecah file menjadi beberapa upload.`
    )
  if (!result.read) result.fileErrors.push("Tidak ada lokasi di file.")
  if (result.fileErrors.length) {
    result.locations = []
    result.errors.push(...result.fileErrors)
  }
  return result
}

// ------------------------------------------------------------------ template

const GROUP_TITLES: Record<ColumnGroup, string> = {
  lokasi: "Data Lokasi",
  md: "Section 1 — Material Damage",
  bi: "Section 2 — Business Interruption",
  total: "Total",
  rate: "Rate (‰) dan cek premi",
  ded: "Deductible / Time Excess",
}

const GROUP_FILL: Record<ColumnGroup, string> = {
  lokasi: "FFDDEBF7",
  md: "FFE2EFDA",
  bi: "FFFFF2CC",
  total: "FFEDEDED",
  rate: "FFFCE4D6",
  ded: "FFE4DFEC",
}

const AUTO_FILL = "FFF2F2F2"
const BORDER_COLOR = { argb: "FFBFBFBF" }
const BORDER = {
  top: { style: "thin" as const, color: BORDER_COLOR },
  left: { style: "thin" as const, color: BORDER_COLOR },
  bottom: { style: "thin" as const, color: BORDER_COLOR },
  right: { style: "thin" as const, color: BORDER_COLOR },
}

const NUM_FMT: Partial<Record<ColumnKind, string>> = {
  money: "#,##0.00",
  rate: "0.000000",
  number: "0",
  indemnity: "0",
  code: "@",
}

/** Huruf kolom Excel dari nomor kolom (1 = A). */
function letter(n: number) {
  let s = ""
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const COLUMN_LETTER = new Map(LOCATION_COLUMNS.map((c, i) => [c.key, letter(i + 1)]))
const at = (key: string, row: number) => `${COLUMN_LETTER.get(key)}${row}`

/** Rumus kolom otomatis satu baris, mengikuti hitungan sistem. */
function rowFormulas(r: number, occupations: number, scales: number): Record<string, string> {
  const md = Array.from({ length: MD_PAIRS }, (_, i) => at(`mdValue${i + 1}`, r)).join(",")
  const bi = Array.from({ length: BI_PAIRS }, (_, i) => at(`biValue${i + 1}`, r)).join(",")
  const occ = `$${at("occupation", r)}`
  const rate = (title: string) => `N(${at(`rate:${title}`, r)})`
  // Skala BI OJK per Period of Indemnity; kosong dihitung 100% seperti sistem.
  const scale = `IFERROR(VLOOKUP(N(${at("indemnity", r)}),'Skala BI'!$A$2:$B$${scales + 1},2,FALSE),100)`
  const premium = TEMPLATE_COVERS.map(
    (c) => `ROUND(SUM(${c.basis === "md" ? md : bi})*${rate(c.title)}/1000,2)`
  ).join("+")
  const first = at("rate:FLEXAS", r)
  const last = at("rate:BI EQVET", r)
  return {
    ojkName: `IF(${occ}="","",IFERROR(INDEX(Okupasi!$C$2:$C$${occupations + 1},MATCH(TRIM(LEFT(${occ},FIND(" ",${occ}&" ")-1)),Okupasi!$A$2:$A$${occupations + 1},0)),"Kode tidak ditemukan"))`,
    mdTotal: `IF(COUNT(${md})=0,"",SUM(${md}))`,
    biTotal: `IF(COUNT(${bi})=0,"",SUM(${bi}))`,
    tsi: `IF(COUNT(${md},${bi})=0,"",SUM(${md},${bi}))`,
    "rate:BI PAR": `IF(SUM(${bi})=0,"",ROUND((${rate("FLEXAS")}+${rate("FWTWD")}+${rate("RSMDCC")}+${rate("Other Losses")})*${scale}/100,6))`,
    "rate:BI EQVET": `IF(SUM(${bi})=0,"",ROUND(${rate("EQVET")}*${scale}/100,6))`,
    premiumCheck: `IF(COUNT(${first}:${last})=0,"",${premium})`,
  }
}

function header(ws: Worksheet) {
  let start = 1
  LOCATION_COLUMNS.forEach((c, i) => {
    const next = LOCATION_COLUMNS[i + 1]
    if (next?.group === c.group) return
    const end = i + 1
    if (end > start) ws.mergeCells(1, start, 1, end)
    const cell = ws.getCell(1, start)
    cell.value = GROUP_TITLES[c.group]
    cell.font = { bold: true, size: 11 }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    for (let col = start; col <= end; col++) {
      const each = ws.getCell(1, col)
      each.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GROUP_FILL[c.group] } }
      each.border = BORDER
    }
    start = end + 1
  })
  LOCATION_COLUMNS.forEach((c, i) => {
    const cell = ws.getCell(2, i + 1)
    cell.value = c.required ? `${c.title}*` : c.title
    cell.font = { bold: true, size: 10 }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.border = BORDER
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GROUP_FILL[c.group] } }
    if (c.note) cell.note = c.note
    ws.getColumn(i + 1).width = c.width
  })
  ws.getRow(1).height = 22
  ws.getRow(2).height = 48
}

function styleBody(ws: Worksheet, occupations: number, scales: number) {
  const last = FIRST_ROW + LOCATION_IMPORT_LIMIT - 1
  for (let r = FIRST_ROW; r <= last; r++) {
    const formulas = rowFormulas(r, occupations, scales)
    LOCATION_COLUMNS.forEach((c, i) => {
      const cell: Cell = ws.getCell(r, i + 1)
      cell.border = BORDER
      cell.font = { size: 10 }
      if (c.kind === "auto") {
        cell.value = { formula: formulas[c.key] }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AUTO_FILL } }
        cell.numFmt = c.key.startsWith("rate:") ? "0.000000" : c.key === "ojkName" ? "General" : "#,##0.00"
        cell.alignment = { vertical: "top", wrapText: c.key === "ojkName" }
        return
      }
      cell.numFmt = NUM_FMT[c.kind] ?? "General"
      cell.alignment = { vertical: "top", wrapText: c.kind === "text" }
      if (c.kind === "code") {
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`Okupasi!$B$2:$B$${occupations + 1}`],
          showErrorMessage: false,
          showInputMessage: true,
          promptTitle: "Kode Okupasi OJK",
          prompt: "Pilih dari daftar atau ketik kodenya saja, misalnya 2971.",
        }
      } else if (c.kind === "class") {
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`"${CONSTRUCTION_CLASSES.map((k) => k.label).join(",")}"`],
          showErrorMessage: true,
          errorTitle: "Construction Class",
          error: "Pilih Class I, Class II, atau Class III.",
        }
      } else if (c.kind === "indemnity") {
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`"${BI_SCALE_OJK.map((s) => s.months).join(",")}"`],
          showErrorMessage: true,
          errorTitle: "Period of Indemnity",
          error: "Pilih jumlah bulan sesuai skala BI OJK.",
        }
      } else if (c.kind === "money") {
        cell.dataValidation = {
          type: "decimal",
          operator: "greaterThanOrEqual",
          allowBlank: true,
          formulae: [0],
          showErrorMessage: true,
          errorTitle: "Sum Insured",
          error: "Isi angka saja, tanpa mata uang dan titik ribuan.",
        }
      } else if (c.kind === "rate") {
        cell.dataValidation = {
          type: "decimal",
          operator: "between",
          allowBlank: true,
          formulae: [0, 1000],
          showErrorMessage: true,
          errorTitle: "Rate per mil",
          error: "Isi rate per mil (‰) antara 0 dan 1000, misalnya 0,75.",
        }
      }
    })
  }
}

const CLASS_RANGE = (range: readonly [number, number] | null | undefined) =>
  range ? `${range[0]} – ${range[1]}` : ""

/**
 * Template upload lokasi: sheet Lokasi (500 baris, kolom otomatis berumus sama dengan hitungan
 * sistem), Petunjuk, Okupasi (daftar OJK beserta batas FLEXAS per kelas), dan Skala BI.
 */
export function fillLocationTemplate(
  wb: Workbook,
  info: { insuredName: string; currency: string }
) {
  const ws = wb.addWorksheet("Lokasi", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 2 }],
    properties: { tabColor: { argb: "FF2F75B5" } },
  })
  header(ws)
  styleBody(ws, OCCUPATION_TARIFFS.length, BI_SCALE_OJK.length)

  const help = wb.addWorksheet("Petunjuk", { properties: { tabColor: { argb: "FF70AD47" } } })
  help.getColumn(1).width = 8
  help.getColumn(2).width = 34
  help.getColumn(3).width = 8
  help.getColumn(4).width = 90
  const line = (text: string, bold = false) => {
    const row = help.addRow([text])
    help.mergeCells(row.number, 1, row.number, 4)
    row.getCell(1).font = { bold, size: bold ? 12 : 10 }
    row.getCell(1).alignment = { wrapText: true, vertical: "top" }
    if (text.length > 110) row.height = 30
  }
  line("Template Upload Lokasi Property", true)
  line(
    `Untuk placing slip ${info.insuredName.trim() || "Property"}, mata uang ${info.currency}. Satu baris di sheet Lokasi berisi satu lokasi, lengkap dengan nama tertanggung, okupasi, sum insured, rate, dan deductible-nya.`
  )
  line("")
  line("Cara mengisi", true)
  for (const text of [
    `1. Isi sheet Lokasi mulai baris ${FIRST_ROW}, maksimal ${LOCATION_IMPORT_LIMIT} lokasi. Kolom bertanda * wajib diisi.`,
    "2. Kolom abu-abu bertanda (otomatis) terisi sendiri dan tidak perlu diisi.",
    "3. Arahkan kursor ke judul kolom untuk melihat catatan singkat tiap kolom.",
    "4. Simpan sebagai .xlsx, lalu upload lewat tombol Upload Excel di bagian Lokasi & Sum Insured.",
  ])
    line(text)
  line("")
  line("Aturan isian", true)
  for (const text of [
    "Insured Name kosong berarti sama dengan tertanggung di slip.",
    "Risk Location ditulis lengkap dengan kabupaten atau kota. Zona gempa dan banjir OJK dibaca dari nama kota ini.",
    "Kode Okupasi OJK dipilih dari dropdown atau diketik kodenya saja, misalnya 2971. Nama okupasi OJK muncul otomatis di kolom sebelahnya.",
    "Construction Class wajib bila rate FLEXAS atau EQVET diisi.",
    "Period of Indemnity diisi bila ada Section 2 (Business Interruption). Slip menyimpan satu periode, jadi isi sama untuk semua lokasi.",
    "Sum insured diisi angka saja tanpa mata uang dan titik ribuan. Mata uang mengikuti slip.",
    `Section 1 Material Damage menampung sampai ${MD_PAIRS} interest per lokasi; Interest MD 1 dan Sum Insured MD 1 wajib. Section 2 Business Interruption menampung sampai ${BI_PAIRS} interest.`,
    "Rate diisi per mil (‰), sama dengan form slip: 0,75 berarti 0,75‰. Kosongkan cover yang tidak dijamin.",
    "Rate BI PAR dan BI EQVET terisi otomatis seperti sistem: rate lokasi dikali skala Period of Indemnity (sheet Skala BI).",
    `Deductible diisi per cover. Bila lebih dari satu, pisahkan dengan baris baru (Alt+Enter), maksimal ${MAX_DEDUCTIBLES} baris per cover. Bila deductible sama untuk semua lokasi, kosongkan semua kolom deductible; lokasi baru memakai deductible lokasi pertama di form.`,
    "Premi dan diskon tidak diisi di Excel. Sistem menghitung premi per cover = sum insured × rate ÷ 1.000; diskon diisi sekali per slip. Cek Premi memakai cara hitung yang sama.",
    "Lokasi yang alamat dan tertanggungnya sudah ada di slip dilewati, jadi file yang sama boleh diupload ulang setelah baris yang gagal diperbaiki.",
    "Slip Floating Sum Insured hanya memakai kolom Data Lokasi; sum insured, rate, dan deductible diisi sekali di form.",
  ])
    line(`•  ${text}`)
  line("")
  line("Daftar kolom sheet Lokasi", true)
  const head = help.addRow(["Kolom", "Judul", "Wajib", "Keterangan"])
  head.eachCell((cell) => {
    cell.font = { bold: true, size: 10 }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } }
    cell.border = BORDER
  })
  LOCATION_COLUMNS.forEach((c, i) => {
    const row = help.addRow([letter(i + 1), c.title, c.required ? "Ya" : "", c.note ?? ""])
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { size: 10 }
      cell.border = BORDER
      cell.alignment = { wrapText: true, vertical: "top" }
    })
  })

  const occ = wb.addWorksheet("Okupasi", { properties: { tabColor: { argb: "FFFFC000" } } })
  occ.columns = [
    { header: "Kode", key: "code", width: 9 },
    { header: "Pilihan (Kode - Nama)", key: "choice", width: 50 },
    { header: "Nama Okupasi OJK", key: "name", width: 60 },
    { header: "FLEXAS Class I (‰)", key: "k1", width: 16 },
    { header: "FLEXAS Class II (‰)", key: "k2", width: 16 },
    { header: "FLEXAS Class III (‰)", key: "k3", width: 16 },
  ]
  occ.getRow(1).font = { bold: true }
  occ.getColumn(1).numFmt = "@"
  for (const o of OCCUPATION_TARIFFS) {
    occ.addRow({
      code: o.code,
      // Teks pilihan dipotong supaya dropdown Excel tetap terbaca; kodenya yang dibaca sistem.
      choice: `${o.code} - ${o.name}`.slice(0, 120),
      name: o.name,
      k1: CLASS_RANGE(o.k1),
      k2: CLASS_RANGE(o.k2),
      k3: CLASS_RANGE(o.k3),
    })
  }

  const scale = wb.addWorksheet("Skala BI", { properties: { tabColor: { argb: "FFA5A5A5" } } })
  scale.columns = [
    { header: "Period of Indemnity (bulan)", key: "months", width: 26 },
    { header: "Skala rate BI (%)", key: "pct", width: 18 },
  ]
  scale.getRow(1).font = { bold: true }
  for (const s of BI_SCALE_OJK) scale.addRow({ months: s.months, pct: s.pct })
  return ws
}
