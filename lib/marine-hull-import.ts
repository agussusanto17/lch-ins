/**
 * Upload dan template Excel jadwal kapal Marine Hull (Harry lewat Agus, 26 November 2026). Ada dua
 * format sesuai lampiran LCH Singapore: Patria (ringkas) dan MHL (lengkap, dengan tahun lalu).
 * Kolom dibaca dari judulnya, jadi file LCH Singapore bisa diupload langsung. Judul dua baris (judul
 * lalu tahun polis di baris bawahnya) digabung, dan kolom bertahun dibagi ke tahun lalu dan tahun
 * ini dari tahun terkecil dan terbesar. Kolom premi tidak dibaca; premi dihitung ulang nilai × rate.
 */
import type { Workbook } from "exceljs"

import {
  emptyVessel,
  EMPTY_YEAR_VALUES,
  HULL_COLUMNS,
  hullColumnTitle,
  type HullColumnKey,
  type HullScheduleFormat,
  type HullYearValues,
  type Vessel,
} from "./marine-hull"
import { parseParticipantAmount } from "./slip-participants"

/** Batas kapal per file, supaya browser tetap ringan. Jadwal MHL contoh berisi 107 kapal. */
export const HULL_IMPORT_LIMIT = 500

const normalize = (value: unknown) =>
  String(value ?? "")
    .toUpperCase()
    .replace(/\s*&\s*/g, "&")
    .replace(/\((IDR|USD|SGD|EUR|%)\)/g, " ")
    .replace(/[@*:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const YEAR = /\b(19|20)\d{2}\b/

/** Alias judul kolom (sudah dinormalisasi, tanpa tahun) ke kunci kolom. */
const ALIASES: Record<string, HullColumnKey> = {
  NO: "no",
  "NO.": "no",
  VESSEL: "name",
  "VESSEL NAME": "name",
  "NAMA KAPAL": "name",
  KAPAL: "name",
  TYPE: "type",
  TIPE: "type",
  "JENIS KAPAL": "type",
  "IMO NUMBER": "imo",
  "IMO NO": "imo",
  "IMO NO.": "imo",
  IMO: "imo",
  BUILT: "built",
  "YEAR BUILT": "built",
  "TAHUN PEMBUATAN": "built",
  GRT: "grt",
  NRT: "nrt",
  DWT: "dwt",
  BHP: "bhp",
  CLASS: "classSociety",
  KLASIFIKASI: "classSociety",
  FLAG: "flag",
  BENDERA: "flag",
  DIMENSIONS: "dimensions",
  DIMENSION: "dimensions",
  COVER: "cover",
  "H&M INSURED VALUE": "hmValue",
  "H&M VALUE": "hmValue",
  "HULL VALUE": "hmValue",
  "H&M RATE": "hmRate",
  "H&M PREMIUM": "hmPremium",
  DEDUCTIBLE: "deductible",
  "DEDUCTIBLE CLAUSE 12": "deductible",
  AMD: "amd",
  "GENERAL AVERAGE": "generalAverage",
  "IV INSURED VALUE": "ivValue",
  "IV VALUE": "ivValue",
  "AOI INSURED VALUE": "aoiValue",
  "AOI VALUE": "aoiValue",
  "IV RATE": "ivRate",
  "IV/AOI RATE": "ivRate",
  "IV PREMIUM": "ivPremium",
  "IV/AOI PREMIUM": "ivPremium",
  "WAR INSURED VALUE": "warValue",
  "WR INSURED VALUE": "warValue",
  "WAR VALUE": "warValue",
  "WAR RATE": "warRate",
  "WR RATE": "warRate",
  "WAR PREMIUM": "warPremium",
  "WR PREMIUM": "warPremium",
  OWNER: "owner",
  OWNERS: "owner",
  MANAGERS: "managers",
  MANAGER: "managers",
  MORTGAGEES: "mortgagees",
  MORTGAGEE: "mortgagees",
}

/** Kolom yang hanya ada di format MHL; salah satunya ada berarti file MHL. */
const MHL_ONLY = new Set<HullColumnKey>([
  "imo",
  "nrt",
  "dwt",
  "bhp",
  "dimensions",
  "cover",
  "deductible",
  "amd",
  "generalAverage",
  "aoiValue",
  "owner",
  "managers",
  "mortgagees",
])

/**
 * Rate dalam persen. Teks "0.585%" atau "0,585" dibaca 0,585; angka apa adanya. Sel Excel berformat
 * persen sudah diubah pembaca file menjadi teks "x%".
 */
export function parseHullRate(value: unknown): number | null {
  if (value == null || value === "") return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const text = String(value).replace("%", "").replace(/\s/g, "").replace(",", ".")
  if (!/\d/.test(text)) return null
  const n = Number(text.replace(/[^\d.-]/g, ""))
  return Number.isFinite(n) ? n : null
}

const cellText = (value: unknown) => {
  if (value == null) return ""
  if (value instanceof Date) return String(value.getUTCFullYear())
  return String(value).replace(/\s+/g, " ").trim()
}

interface ColumnRef {
  key: HullColumnKey
  previous: boolean
}

export interface HullImportResult {
  format: HullScheduleFormat
  vessels: Vessel[]
  /** Kesalahan per baris ("Baris N: …") dan kesalahan file. */
  errors: string[]
  /** Tahun polis yang terbaca dari judul kolom bertahun (MHL), untuk keterangan. */
  years: { previous: number | null; current: number | null }
}

/** Baris judul: baris pertama yang punya kolom VESSEL. */
function headerIndex(rows: readonly unknown[][]) {
  return rows.findIndex((row) => row.some((c) => ALIASES[normalize(c)] === "name"))
}

/**
 * Baris lanjutan judul (misalnya tahun polis atau "RATE 2021" di bawah "H&M"): sel VESSEL kosong,
 * nomor bukan angka, dan berisi tahun atau kata judul.
 */
function isHeaderContinuation(row: readonly unknown[], nameIndex: number) {
  if (cellText(row[nameIndex])) return false
  const texts = row.map(normalize).filter(Boolean)
  if (!texts.length) return false
  return texts.every(
    (t) => YEAR.test(t) || /^(RATE|PREMIUM|CLAUSE|AVERAGE|VALUE|INSURED|\(IDR\)|\(USD\))/.test(t)
  )
}

/** Baca jadwal kapal dari baris Excel (nilai sel per baris, tanpa judul sheet di atasnya). */
export function vesselsFromRows(
  rows: readonly unknown[][],
  idOf: (index: number) => string
): HullImportResult {
  const errors: string[] = []
  const start = headerIndex(rows)
  if (start < 0) {
    return {
      format: "patria",
      vessels: [],
      errors: ["Kolom VESSEL tidak ditemukan. Pakai template jadwal kapal atau jadwal dari LCH Singapore."],
      years: { previous: null, current: null },
    }
  }
  const header = rows[start].map(normalize)
  const nameIndex = header.findIndex((h) => ALIASES[h] === "name")
  // Judul dua atau tiga baris: gabungkan baris lanjutan ke judul kolom yang sama.
  let body = start + 1
  while (body < rows.length && body <= start + 2 && isHeaderContinuation(rows[body], nameIndex)) {
    rows[body].forEach((c, i) => {
      const extra = normalize(c)
      if (extra) header[i] = `${header[i] ?? ""} ${extra}`.trim()
    })
    body += 1
  }
  const years = [...new Set(header.map((h) => h.match(YEAR)?.[0]).filter(Boolean).map(Number))].sort()
  const previousYear = years.length > 1 ? years[0] : null
  const currentYear = years.length ? years[years.length - 1] : null

  const columns: (ColumnRef | null)[] = header.map((h) => {
    const year = h.match(YEAR)?.[0]
    const label = h.replace(YEAR, " ").replace(/\s+/g, " ").trim()
    const key = ALIASES[label]
    if (!key) return null
    return { key, previous: year != null && previousYear != null && Number(year) === previousYear }
  })
  const keys = columns.filter((c): c is ColumnRef => c != null)
  const format: HullScheduleFormat = keys.some((c) => c.previous || MHL_ONLY.has(c.key))
    ? "mhl"
    : "patria"

  const vessels: Vessel[] = []
  for (let r = body; r < rows.length; r++) {
    const row = rows[r]
    const excelRow = r + 1
    const get = (key: HullColumnKey, previous = false) => {
      const index = columns.findIndex((c) => c?.key === key && c.previous === previous)
      return index < 0 ? undefined : row[index]
    }
    const name = cellText(get("name"))
    if (!name) {
      // Baris total atau kosong dilewati; nomor tanpa nama kapal ditandai.
      const no = Number(cellText(get("no")))
      if (Number.isInteger(no) && no > 0) errors.push(`Baris ${excelRow}: VESSEL kosong.`)
      continue
    }
    const money = (key: HullColumnKey, previous = false) => parseParticipantAmount(get(key, previous))
    const rate = (key: HullColumnKey, previous = false) => parseHullRate(get(key, previous))
    const yearValues = (previous: boolean): HullYearValues => ({
      hmValue: money("hmValue", previous),
      hmRate: rate("hmRate", previous),
      ivValue: money("ivValue", previous),
      aoiValue: money("aoiValue", previous),
      ivRate: rate("ivRate", previous),
      warValue: money("warValue", previous),
      warRate: rate("warRate", previous),
      amd: money("amd", previous),
    })
    const current = yearValues(false)
    const previous = previousYear != null ? yearValues(true) : null
    const fail = (message: string) => errors.push(`Baris ${excelRow}: ${message}`)
    if (!current.hmValue && !current.ivValue && !current.aoiValue && !current.warValue) {
      fail(`${name}: nilai H&M, IV, atau War belum diisi.`)
    }
    const needsRate: [number | null, number | null, string][] = [
      [current.hmValue, current.hmRate, "H&M"],
      [(current.ivValue || 0) + (current.aoiValue || 0), current.ivRate, "IV"],
      [current.warValue, current.warRate, "War"],
    ]
    for (const [value, r2, label] of needsRate) {
      if (value && r2 == null) fail(`${name}: rate ${label} belum diisi.`)
    }
    vessels.push({
      ...emptyVessel(idOf(vessels.length)),
      ...current,
      name,
      type: cellText(get("type")),
      imo: cellText(get("imo")),
      built: cellText(get("built")),
      grt: cellText(get("grt")),
      nrt: cellText(get("nrt")),
      dwt: cellText(get("dwt")),
      bhp: cellText(get("bhp")),
      classSociety: cellText(get("classSociety")),
      flag: cellText(get("flag")),
      dimensions: cellText(get("dimensions")),
      cover: cellText(get("cover")),
      deductible: money("deductible"),
      generalAverage: money("generalAverage"),
      owner: cellText(get("owner")),
      managers: cellText(get("managers")),
      mortgagees: cellText(get("mortgagees")),
      previous:
        previous && Object.values(previous).some((v) => v != null)
          ? { ...EMPTY_YEAR_VALUES, ...previous }
          : null,
    })
  }
  if (!vessels.length && !errors.length) errors.push("Tidak ada kapal di file.")
  if (vessels.length > HULL_IMPORT_LIMIT) {
    errors.push(`Maksimal ${HULL_IMPORT_LIMIT} kapal per file.`)
  }
  return { format, vessels, errors, years: { previous: previousYear, current: currentYear } }
}

/**
 * Template Excel jadwal kapal: sheet "Jadwal Kapal" dengan kolom persis lampiran contoh, kolom premi
 * berisi rumus nilai × rate / 100, lalu sheet Petunjuk.
 */
export function fillHullTemplate(wb: Workbook, format: HullScheduleFormat, policyYear: number) {
  const columns = HULL_COLUMNS[format]
  const ws = wb.addWorksheet("Jadwal Kapal")
  ws.columns = columns.map((c) => ({
    header: hullColumnTitle(c, policyYear),
    key: `${c.key}${c.previous ? "Prev" : ""}`,
    width: c.kind === "text" ? (c.key === "name" || c.key === "owner" ? 28 : 14) : c.kind === "no" ? 5 : 20,
  }))
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).alignment = { wrapText: true, vertical: "middle" }
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }]
  const letter = (i: number) => ws.getColumn(i + 1).letter
  columns.forEach((c, i) => {
    const column = ws.getColumn(i + 1)
    if (c.kind === "money" || c.kind === "premium") column.numFmt = "#,##0.00"
    if (c.kind === "rate") column.numFmt = "0.000##"
  })
  // Rumus premi: nilai × rate / 100 (IV/AOI: (IV + AOI) × rate).
  for (let row = 2; row <= 201; row++) {
    columns.forEach((c, i) => {
      if (c.kind !== "premium") return
      const find = (key: HullColumnKey) =>
        columns.findIndex((x) => x.key === key && Boolean(x.previous) === Boolean(c.previous))
      const rateKey: HullColumnKey =
        c.key === "hmPremium" ? "hmRate" : c.key === "ivPremium" ? "ivRate" : "warRate"
      const valueKeys: HullColumnKey[] =
        c.key === "hmPremium"
          ? ["hmValue"]
          : c.key === "ivPremium"
            ? ["ivValue", "aoiValue"]
            : ["warValue"]
      const values = valueKeys
        .map(find)
        .filter((index) => index >= 0)
        .map((index) => `N(${letter(index)}${row})`)
      const rate = find(rateKey)
      if (!values.length || rate < 0) return
      ws.getRow(row).getCell(i + 1).value = {
        formula: `IF(${letter(rate)}${row}="","",(${values.join("+")})*${letter(rate)}${row}/100)`,
      }
    })
  }

  const help = wb.addWorksheet("Petunjuk")
  help.getColumn(1).width = 110
  for (const line of [
    `Jadwal kapal Marine Hull, format ${format === "patria" ? "Patria (ringkas)" : "MHL (lengkap)"}.`,
    "",
    "Isi satu kapal per baris, mulai baris 2. Kolom VESSEL wajib.",
    "Nilai (INSURED VALUE, DEDUCTIBLE, AMD, GENERAL AVERAGE) diisi angka tanpa mata uang, misalnya 1600000.",
    "Rate diisi dalam persen, misalnya 0.585 untuk 0,585%. Boleh juga ditulis 0.585%.",
    "Kolom PREMIUM terisi rumus nilai × rate dan tidak dibaca saat upload; sistem menghitung ulang premi.",
    ...(format === "mhl"
      ? [
          `Kolom bertahun ${policyYear - 1} adalah nilai tahun polis lalu untuk perbandingan renewal; boleh dikosongkan.`,
          "IV/AOI RATE berlaku untuk IV INSURED VALUE + AOI INSURED VALUE.",
        ]
      : []),
    "Jadwal kapal dari LCH Singapore boleh diupload langsung (simpan sebagai .xlsx).",
  ]) {
    help.addRow([line])
  }
  help.getRow(1).font = { bold: true }
  return ws
}
