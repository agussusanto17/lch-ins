/**
 * Upload daftar kendaraan slip Motor Vehicle dari Excel (MoM review Phase 1, poin 20): satu baris
 * satu kendaraan dengan kolom seperti lampiran DAFTAR UNIT KENDARAAN, yaitu data kendaraan, sum
 * insured, rate casco dan perluasan, limit dan rate TPL serta PA, dan deductible. Kolom dikenali
 * dari judulnya, dan template dari `fillVehicleTemplate` memakai daftar kolom yang sama.
 */
import type { Cell, Workbook, Worksheet } from "exceljs"

import { MAX_DEDUCTIBLES, type VehicleBrandOption } from "./data/types"
import { parseRate } from "./location-import"
import { cellText, cellValue, parseParticipantAmount } from "./slip-participants"
import { isCascoLine, isTotalLossLine } from "./slip-vehicles"

/** Batas kendaraan per file, sama dengan jumlah baris template. */
export const VEHICLE_IMPORT_LIMIT = 500

/** Baris pertama data di sheet Kendaraan template: baris 1 kelompok kolom, baris 2 judul. */
const FIRST_ROW = 3

/** Panjang maksimal isian teks. */
const LIMITS = { model: 200, color: 100, plate: 20, chassis: 50, engine: 50 }

type ColumnGroup = "kendaraan" | "si" | "rate" | "tpl" | "pa" | "ded" | "cek"
type ColumnKind = "text" | "number" | "money" | "rate" | "auto"

export interface VehicleColumn {
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

/** Baris TPL dan PA per kendaraan, sama dengan baris standar form. */
export const LIMIT_LINES = [
  { key: "tpl1", title: "TPL 1", group: "tpl", table: "tplLines", index: 0 },
  { key: "tpl2", title: "TPL 2", group: "tpl", table: "tplLines", index: 1 },
  { key: "paDriver", title: "PA Driver", group: "pa", table: "paLines", index: 0 },
  { key: "paPassenger", title: "PA Passenger", group: "pa", table: "paLines", index: 1 },
] as const

export type LimitLineKey = (typeof LIMIT_LINES)[number]["key"]

const norm = (s: string) =>
  s.toLowerCase().replace(/\s+/g, " ").replace(/[*:]/g, "").trim()

/** Label casco Comprehensive dan Total Loss Only di antara cover slip, bila ada. */
function cascoLabels(rateLabels: readonly string[]) {
  return {
    comprehensive: rateLabels.find((l) => isCascoLine(l) && !isTotalLossLine(l)),
    totalLoss: rateLabels.find(isTotalLossLine),
  }
}

/** Catatan kolom rate: kolom casco menjelaskan pilihan Comprehensive atau TLO. */
function rateNote(label: string, rateLabels: readonly string[]) {
  const { comprehensive, totalLoss } = cascoLabels(rateLabels)
  const percent = `Rate ${label} dalam persen, misalnya 1,5 berarti 1,5%.`
  if (comprehensive && totalLoss && label === comprehensive)
    return `${percent} Kendaraan TLO: kosongkan kolom ini dan isi Rate ${totalLoss}.`
  if (comprehensive && totalLoss && label === totalLoss)
    return `Rate ${label} dalam persen untuk kendaraan TLO. Isi salah satu: kolom ini atau Rate ${comprehensive}.`
  return `${percent} Kosongkan bila cover ini tidak dijamin.`
}

/** Kolom template untuk cover slip; rate dan deductible mengikuti cover kendaraan pertama. */
export function vehicleColumns(rateLabels: readonly string[]): VehicleColumn[] {
  return [
    {
      key: "no",
      title: "No",
      group: "kendaraan",
      width: 5,
      kind: "number",
      names: ["no", "no."],
      note: "Nomor urut. Boleh kosong; urutan kendaraan mengikuti urutan baris.",
    },
    {
      key: "brand",
      title: "Merek",
      group: "kendaraan",
      width: 16,
      kind: "text",
      required: true,
      names: ["merek", "merk", "brand"],
      note: "Pilih dari dropdown. Nama merek harus sama dengan Master Data (sheet Merek & Tipe).",
    },
    {
      key: "type",
      title: "Tipe",
      group: "kendaraan",
      width: 20,
      kind: "text",
      required: true,
      names: ["tipe", "type"],
      note: "Tipe di bawah merek itu, sama dengan Master Data (sheet Merek & Tipe). Kategori tarif OJK dibaca dari merek, tipe, dan sum insured.",
    },
    {
      key: "model",
      title: "Model / Seri",
      group: "kendaraan",
      width: 20,
      kind: "text",
      names: ["model / seri", "model/seri", "model", "seri"],
      note: "Misalnya Avanza 1.5 G AT. Boleh kosong.",
    },
    {
      key: "year",
      title: "Tahun",
      group: "kendaraan",
      width: 8,
      kind: "number",
      names: ["tahun", "tahun pembuatan", "year"],
      note: "Tahun pembuatan, 4 angka, misalnya 2022.",
    },
    {
      key: "color",
      title: "Warna",
      group: "kendaraan",
      width: 12,
      kind: "text",
      names: ["warna", "color"],
    },
    {
      key: "plate",
      title: "No. Polisi",
      group: "kendaraan",
      width: 14,
      kind: "text",
      names: ["no. polisi", "no polisi", "nomor polisi", "plat nomor", "license plate"],
      note: "Misalnya B 1234 XYZ. Bila Risk Location slip kosong, wilayah tarif OJK dibaca dari nomor polisi.",
    },
    {
      key: "chassis",
      title: "No. Rangka",
      group: "kendaraan",
      width: 22,
      kind: "text",
      required: true,
      names: ["no. rangka", "no rangka", "nomor rangka", "chassis number", "chassis no"],
      note: "Wajib dan tidak boleh kembar. Kendaraan dengan nomor rangka yang sudah ada di slip dilewati.",
    },
    {
      key: "engine",
      title: "No. Mesin",
      group: "kendaraan",
      width: 20,
      kind: "text",
      names: ["no. mesin", "no mesin", "nomor mesin", "engine number", "engine no"],
    },
    {
      key: "sumInsured",
      title: "Sum Insured",
      group: "si",
      width: 18,
      kind: "money",
      required: true,
      names: ["sum insured", "tsi", "harga pertanggungan"],
      note: "Harga pertanggungan kendaraan dalam mata uang slip. Isi angka saja, tanpa mata uang dan titik ribuan.",
    },
    ...rateLabels.map(
      (label): VehicleColumn => ({
        key: `rate:${label}`,
        title: `Rate ${label} (%)`,
        group: "rate",
        width: 16,
        kind: "rate",
        names: [norm(`rate ${label}`)],
        note: rateNote(label, rateLabels),
      })
    ),
    ...LIMIT_LINES.flatMap((l): VehicleColumn[] => [
      {
        key: `${l.key}:limit`,
        title: `${l.title} Limit`,
        group: l.group,
        width: 16,
        kind: "money",
        names: [norm(`${l.title} limit`)],
        note:
          l.key === "tpl2"
            ? "Lapis kedua TPL bila rate-nya berbeda dari TPL 1. Kosongkan bila hanya satu lapis."
            : l.key === "paPassenger"
              ? "Limit PA penumpang seperti isian form, misalnya limit per kursi × jumlah kursi."
              : undefined,
      },
      {
        key: `${l.key}:rate`,
        title: `${l.title} Rate (%)`,
        group: l.group,
        width: 14,
        kind: "rate",
        names: [norm(`${l.title} rate`)],
      },
    ]),
    ...rateLabels.map(
      (label): VehicleColumn => ({
        key: `ded:${label}`,
        title: `Deductible ${label}`,
        group: "ded",
        width: 28,
        kind: "text",
        names: [norm(`deductible ${label}`)],
      })
    ),
    {
      key: "ded:tpl",
      title: "Deductible TPL",
      group: "ded",
      width: 24,
      kind: "text",
      names: ["deductible tpl"],
    },
    {
      key: "ded:pa",
      title: "Deductible PA",
      group: "ded",
      width: 24,
      kind: "text",
      names: ["deductible pa"],
    },
    {
      key: "premiumCheck",
      title: "Cek Premi (otomatis)",
      group: "cek",
      width: 18,
      kind: "auto",
      names: [],
      note: "Terisi otomatis dengan cara hitung sistem: sum insured × rate, ditambah limit × rate TPL dan PA.",
    },
  ]
}

/** Indeks kolom menurut judul dan alias; "Rate Comprehensive Casco (%)" cocok dengan namanya. */
function columnIndex(header: string[], col: VehicleColumn) {
  for (const name of col.names) {
    const index = header.findIndex((h) => h === name || h.startsWith(`${name} (`))
    if (index >= 0) return index
  }
  return -1
}

const isFormula = (value: unknown) =>
  value != null &&
  typeof value === "object" &&
  ("formula" in value || "sharedFormula" in value)

/** Kunci nomor rangka untuk mencari kendaraan kembar: huruf besar tanpa spasi dan tanda hubung. */
export function chassisKey(chassis: string | null | undefined) {
  return (chassis ?? "").toUpperCase().replace(/[\s.-]/g, "")
}

export interface VehicleImportRow {
  /** Nomor baris di Excel, untuk pesan kesalahan dan pratinjau. */
  row: number
  brandId: string
  brandName: string
  typeId: string
  typeName: string
  model?: string
  year?: string
  color?: string
  plate?: string
  chassis: string
  engine?: string
  sumInsured: number
  /** Rate (%) per label cover; cover yang kosong tidak ada. */
  rates: Record<string, number>
  /** Limit dan rate TPL serta PA; baris yang kosong tidak ada. */
  limits: Partial<Record<LimitLineKey, { limit: number; rate: number | null }>>
  /** Deductible per label cover, ditambah "tpl" dan "pa". */
  deductibles: Record<string, string[]>
}

export interface VehicleImportContext {
  /** Label cover slip, dari kendaraan pertama. */
  rateLabels: readonly string[]
  /** Merek dan tipe dari Master Data. */
  brands: readonly VehicleBrandOption[]
  /** Kunci nomor rangka kendaraan yang sudah ada; barisnya dilewati. Kosong saat semua diganti. */
  existingChassis: ReadonlySet<string>
}

export interface VehicleImportResult {
  vehicles: VehicleImportRow[]
  skipped: { row: number; chassis: string }[]
  /** Kesalahan per baris ("Baris N: ...") lalu kesalahan tingkat file. */
  errors: string[]
  /** Kesalahan yang menahan seluruh file. */
  fileErrors: string[]
  /** Baris berisi yang dibaca, termasuk yang dilewati dan yang gagal. */
  read: number
  failed: number
  /** File berisi deductible; tanpa itu kendaraan baru memakai deductible kendaraan pertama. */
  hasDeductibles: boolean
  /** Kendaraan siap ditambahkan yang belum punya rate casco atau perluasan. */
  noRateRows: number
  /** Judul kolom rate atau deductible yang tidak cocok dengan cover slip. */
  ignoredColumns: string[]
}

/**
 * Baris pertama yang memuat kolom Merek dan No. Rangka jadi judul. Baris tanpa isian (termasuk
 * yang hanya berisi rumus template) dilewati. Kesalahan dikumpulkan dengan nomor baris Excel-nya;
 * baris yang salah tidak ikut ditambahkan.
 */
export function vehiclesFromRows(
  rows: unknown[][],
  ctx: VehicleImportContext
): VehicleImportResult {
  const result: VehicleImportResult = {
    vehicles: [],
    skipped: [],
    errors: [],
    fileErrors: [],
    read: 0,
    failed: 0,
    hasDeductibles: false,
    noRateRows: 0,
    ignoredColumns: [],
  }
  const columns = vehicleColumns(ctx.rateLabels)
  const col = (key: string) => columns.find((c) => c.key === key)!
  const headerIndex = rows.findIndex((row) => {
    const names = row.map((c) => norm(cellText(c)))
    return columnIndex(names, col("brand")) >= 0 && columnIndex(names, col("chassis")) >= 0
  })
  if (headerIndex < 0) {
    const message = "Kolom Merek dan No. Rangka tidak ditemukan. Pakai template kendaraan."
    result.errors.push(message)
    result.fileErrors.push(message)
    return result
  }
  const header = rows[headerIndex].map((c) => norm(cellText(c)))
  const columnOf = new Map(columns.map((c) => [c.key, columnIndex(header, c)]))
  const known = new Set([...columnOf.values()].filter((i) => i >= 0))
  result.ignoredColumns = header.filter(
    (h, i) => !known.has(i) && /^(rate|deductible) /.test(h)
  )
  const inputColumns = columns.filter((c) => c.kind !== "auto" && c.key !== "no")
  const brands = new Map(ctx.brands.map((b) => [norm(b.name), b]))
  const seen = new Map<string, number>()

  rows.slice(headerIndex + 1).forEach((row, i) => {
    const excelRow = headerIndex + i + 2
    const raw = (key: string) => {
      const index = columnOf.get(key) ?? -1
      return index < 0 ? undefined : row[index]
    }
    // Rumus template (Cek Premi) tidak dihitung sebagai isian.
    const text = (key: string) => {
      const value = raw(key)
      return isFormula(value) ? "" : cellText(value).trim()
    }
    if (inputColumns.every((c) => !text(c.key))) return
    const errors: string[] = []
    const fail = (message: string) => errors.push(`Baris ${excelRow}: ${message}`)
    const limited = (key: keyof typeof LIMITS, title: string, value: string) => {
      if (value.length > LIMITS[key]) fail(`${title} maksimal ${LIMITS[key]} karakter.`)
    }

    const brandText = text("brand")
    const brand = brandText ? brands.get(norm(brandText)) : undefined
    if (!brandText) fail("Merek kosong.")
    else if (!brand)
      fail(`Merek "${brandText}" tidak ada di Master Data (sheet Merek & Tipe). Tambahkan dulu di Master Data.`)
    else if (!brand.isActive) fail(`Merek "${brand.name}" nonaktif di Master Data.`)

    const typeText = text("type")
    const type = brand && typeText
      ? brand.types.find((t) => norm(t.name) === norm(typeText))
      : undefined
    if (!typeText) fail("Tipe kosong.")
    else if (brand && !type)
      fail(`Tipe "${typeText}" tidak ada di bawah merek ${brand.name} di Master Data.`)
    else if (type && !type.isActive) fail(`Tipe "${type.name}" nonaktif di Master Data.`)

    const model = text("model")
    limited("model", "Model / Seri", model)
    const color = text("color")
    limited("color", "Warna", color)
    const plate = text("plate").toUpperCase()
    limited("plate", "No. Polisi", plate)
    const engine = text("engine").toUpperCase()
    limited("engine", "No. Mesin", engine)

    const yearText = text("year")
    const year = yearText ? parseParticipantAmount(cellValue(raw("year"))) : null
    if (yearText && (year == null || !Number.isInteger(year) || year < 1900 || year > 2100))
      fail(`Tahun "${yearText}" harus tahun 4 angka, misalnya 2022.`)

    const chassis = text("chassis").toUpperCase()
    if (!chassis) fail("No. Rangka kosong.")
    else limited("chassis", "No. Rangka", chassis)

    const sumText = text("sumInsured")
    const sumInsured = sumText ? parseParticipantAmount(cellValue(raw("sumInsured"))) : null
    if (!sumText) fail("Sum Insured kosong.")
    else if (sumInsured == null || sumInsured <= 0)
      fail(`Sum Insured "${sumText}" harus angka lebih dari 0, tanpa mata uang.`)

    const percent = (key: string, title: string) => {
      const value = text(key)
      if (!value) return null
      const rate = parseRate(cellValue(raw(key)))
      if (rate == null || rate < 0 || rate > 100) {
        fail(`${title} "${value}" harus angka persen antara 0 dan 100, misalnya 1,5.`)
        return null
      }
      return rate
    }

    const rates: Record<string, number> = {}
    for (const label of ctx.rateLabels) {
      const rate = percent(`rate:${label}`, `Rate ${label}`)
      if (rate != null) rates[label] = rate
    }
    // Kendaraan dijamin Comprehensive atau TLO, bukan keduanya (Harry, 19 November 2026).
    const casco = ctx.rateLabels.filter((label) => isCascoLine(label) && (rates[label] ?? 0) > 0)
    const tlo = casco.find(isTotalLossLine)
    const comprehensive = casco.find((label) => !isTotalLossLine(label))
    if (tlo && comprehensive)
      fail(`Rate ${comprehensive} dan Rate ${tlo} terisi bersamaan. Isi salah satu saja.`)

    const limits: VehicleImportRow["limits"] = {}
    for (const l of LIMIT_LINES) {
      const limitText = text(`${l.key}:limit`)
      const rate = percent(`${l.key}:rate`, `${l.title} Rate`)
      if (!limitText) {
        if (text(`${l.key}:rate`)) fail(`${l.title} Rate diisi, tetapi ${l.title} Limit kosong.`)
        continue
      }
      const limit = parseParticipantAmount(cellValue(raw(`${l.key}:limit`)))
      if (limit == null || limit < 0)
        fail(`${l.title} Limit "${limitText}" harus angka 0 atau lebih, tanpa mata uang.`)
      else limits[l.key] = { limit: Math.round(limit * 100) / 100, rate }
    }

    const deductibles: Record<string, string[]> = {}
    const dedColumns = [
      ...ctx.rateLabels.map((label) => ({ key: `ded:${label}`, store: label, title: label })),
      { key: "ded:tpl", store: "tpl", title: "TPL" },
      { key: "ded:pa", store: "pa", title: "PA" },
    ]
    for (const d of dedColumns) {
      const value = text(d.key)
      if (!value) continue
      result.hasDeductibles = true
      const list = value
        .split(/\r?\n/)
        .map((t) => t.trim())
        .filter(Boolean)
      if (list.length > MAX_DEDUCTIBLES)
        fail(`Deductible ${d.title} lebih dari ${MAX_DEDUCTIBLES} baris.`)
      else deductibles[d.store] = list
    }

    const key = chassisKey(chassis)
    if (key && ctx.existingChassis.has(key) && !seen.has(key)) {
      seen.set(key, excelRow)
      result.read += 1
      result.skipped.push({ row: excelRow, chassis })
      return
    }
    if (key && seen.has(key)) fail(`No. Rangka sama dengan baris ${seen.get(key)}.`)
    else if (key) seen.set(key, excelRow)

    result.read += 1
    if (errors.length) {
      result.errors.push(...errors)
      result.failed += 1
      return
    }
    if (!Object.values(rates).some((r) => r > 0)) result.noRateRows += 1
    result.vehicles.push({
      row: excelRow,
      brandId: brand!.id,
      brandName: brand!.name,
      typeId: type!.id,
      typeName: type!.name,
      ...(model ? { model } : {}),
      ...(year != null ? { year: String(year) } : {}),
      ...(color ? { color } : {}),
      ...(plate ? { plate } : {}),
      chassis,
      ...(engine ? { engine } : {}),
      sumInsured: Math.round(sumInsured! * 100) / 100,
      rates,
      limits,
      deductibles,
    })
  })

  const filled = result.read - result.skipped.length
  if (filled > VEHICLE_IMPORT_LIMIT)
    result.fileErrors.push(
      `Maksimal ${VEHICLE_IMPORT_LIMIT.toLocaleString("id-ID")} kendaraan per file. Pecah file menjadi beberapa upload.`
    )
  if (!result.read) result.fileErrors.push("Tidak ada kendaraan di file.")
  if (result.fileErrors.length) {
    result.vehicles = []
    result.errors.push(...result.fileErrors)
  }
  return result
}

// ------------------------------------------------------------------ template

const GROUP_TITLES: Record<ColumnGroup, string> = {
  kendaraan: "Data Kendaraan",
  si: "Sum Insured",
  rate: "Rate Casco & Perluasan (%)",
  tpl: "Third Party Liability",
  pa: "Personal Accident",
  ded: "Deductible",
  cek: "Cek",
}

const GROUP_FILL: Record<ColumnGroup, string> = {
  kendaraan: "FFDDEBF7",
  si: "FFE2EFDA",
  rate: "FFFCE4D6",
  tpl: "FFFFF2CC",
  pa: "FFFFF2CC",
  ded: "FFE4DFEC",
  cek: "FFEDEDED",
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
  rate: "0.0000",
  number: "0",
  auto: "#,##0.00",
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

function header(ws: Worksheet, columns: VehicleColumn[]) {
  let start = 1
  columns.forEach((c, i) => {
    const next = columns[i + 1]
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
  columns.forEach((c, i) => {
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
  ws.getRow(2).height = 60
}

/** Rumus Cek Premi satu baris: premi tiap baris dibulatkan ke sen seperti sistem. */
function premiumFormula(columns: VehicleColumn[], r: number) {
  const at = (key: string) => `${letter(columns.findIndex((c) => c.key === key) + 1)}${r}`
  const si = `N(${at("sumInsured")})`
  const parts = [
    ...columns
      .filter((c) => c.group === "rate")
      .map((c) => `ROUND(${si}*N(${at(c.key)})/100,2)`),
    ...LIMIT_LINES.map(
      (l) => `ROUND(N(${at(`${l.key}:limit`)})*N(${at(`${l.key}:rate`)})/100,2)`
    ),
  ]
  return `IF(${si}=0,"",${parts.join("+")})`
}

function styleBody(ws: Worksheet, columns: VehicleColumn[], brandCount: number) {
  const last = FIRST_ROW + VEHICLE_IMPORT_LIMIT - 1
  for (let r = FIRST_ROW; r <= last; r++) {
    columns.forEach((c, i) => {
      const cell: Cell = ws.getCell(r, i + 1)
      cell.border = BORDER
      cell.font = { size: 10 }
      cell.numFmt = NUM_FMT[c.kind] ?? (c.kind === "text" ? "@" : "General")
      cell.alignment = { vertical: "top", wrapText: c.group === "ded" }
      if (c.kind === "auto") {
        cell.value = { formula: premiumFormula(columns, r) }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AUTO_FILL } }
      } else if (c.key === "brand" && brandCount) {
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Merek & Tipe'!$D$2:$D$${brandCount + 1}`],
          showErrorMessage: true,
          errorTitle: "Merek",
          error: "Pilih merek dari daftar Master Data.",
        }
      } else if (c.key === "year") {
        cell.dataValidation = {
          type: "whole",
          operator: "between",
          allowBlank: true,
          formulae: [1900, 2100],
          showErrorMessage: true,
          errorTitle: "Tahun",
          error: "Isi tahun pembuatan 4 angka, misalnya 2022.",
        }
      } else if (c.kind === "money") {
        cell.dataValidation = {
          type: "decimal",
          operator: "greaterThanOrEqual",
          allowBlank: true,
          formulae: [0],
          showErrorMessage: true,
          errorTitle: c.title,
          error: "Isi angka saja, tanpa mata uang dan titik ribuan.",
        }
      } else if (c.kind === "rate") {
        cell.dataValidation = {
          type: "decimal",
          operator: "between",
          allowBlank: true,
          formulae: [0, 100],
          showErrorMessage: true,
          errorTitle: "Rate (%)",
          error: "Isi rate dalam persen antara 0 dan 100, misalnya 1,5.",
        }
      }
    })
  }
}

/**
 * Template upload kendaraan: sheet Kendaraan (500 baris, kolom rate dan deductible mengikuti cover
 * slip, Cek Premi berumus sama dengan hitungan sistem), Petunjuk, dan Merek & Tipe dari Master Data.
 */
export function fillVehicleTemplate(
  wb: Workbook,
  info: {
    insuredName: string
    currency: string
    rateLabels: readonly string[]
    brands: readonly VehicleBrandOption[]
  }
) {
  const columns = vehicleColumns(info.rateLabels)
  const active = info.brands
    .filter((b) => b.isActive)
    .map((b) => ({ ...b, types: b.types.filter((t) => t.isActive) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const ws = wb.addWorksheet("Kendaraan", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 2 }],
    properties: { tabColor: { argb: "FF2F75B5" } },
  })
  header(ws, columns)
  styleBody(ws, columns, active.length)

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
  line("Template Upload Kendaraan Motor Vehicle", true)
  line(
    `Untuk placing slip ${info.insuredName.trim() || "Motor Vehicle"}, mata uang ${info.currency}. Satu baris di sheet Kendaraan berisi satu kendaraan, lengkap dengan sum insured, rate, TPL, PA, dan deductible-nya.`
  )
  line(`Cover slip ini: ${info.rateLabels.join(", ")}.`)
  const { comprehensive, totalLoss } = cascoLabels(info.rateLabels)
  line("")
  line("Cara mengisi", true)
  for (const text of [
    `1. Isi sheet Kendaraan mulai baris ${FIRST_ROW}, maksimal ${VEHICLE_IMPORT_LIMIT} kendaraan. Kolom bertanda * wajib diisi.`,
    "2. Kolom abu-abu bertanda (otomatis) terisi sendiri dan tidak perlu diisi.",
    "3. Arahkan kursor ke judul kolom untuk melihat catatan singkat tiap kolom.",
    "4. Simpan sebagai .xlsx, lalu upload lewat tombol Upload Excel di bagian Interest Insured.",
  ])
    line(text)
  line("")
  line("Aturan isian", true)
  for (const text of [
    "Merek dan Tipe harus sama dengan Master Data (sheet Merek & Tipe). Baris dengan merek atau tipe yang belum ada gagal; tambahkan dulu di Master Data, lalu upload lagi.",
    "No. Rangka wajib dan tidak boleh kembar. Kendaraan yang nomor rangkanya sudah ada di slip dilewati, jadi file yang sama boleh diupload ulang setelah baris yang gagal diperbaiki.",
    "Sum insured dan limit diisi angka saja tanpa mata uang dan titik ribuan. Mata uang mengikuti slip.",
    "Rate diisi dalam persen, sama dengan form slip: 1,5 berarti 1,5%. Kosongkan cover yang tidak dijamin.",
    ...(comprehensive && totalLoss
      ? [
          `Casco diisi salah satu: Rate ${comprehensive} untuk kendaraan comprehensive, atau Rate ${totalLoss} untuk kendaraan TLO. Baris yang mengisi keduanya gagal. Batas tarif OJK casco dan perluasan kendaraan TLO memakai tarif TLO.`,
        ]
      : []),
    "TPL punya dua baris seperti di form, untuk lapis dengan rate berbeda. PA Driver dan PA Passenger diisi limit dan rate-nya.",
    `Deductible diisi per cover. Bila lebih dari satu, pisahkan dengan baris baru (Alt+Enter), maksimal ${MAX_DEDUCTIBLES} baris per cover. Bila deductible sama untuk semua kendaraan, kosongkan semua kolom deductible; kendaraan baru memakai deductible kendaraan pertama di form.`,
    "Premi tidak diisi di Excel. Sistem menghitung premi = sum insured × rate untuk casco dan perluasan, dan limit × rate untuk TPL dan PA. Cek Premi memakai cara hitung yang sama.",
    "Batas tarif OJK dicek per kendaraan setelah upload. Rate di luar batas perlu alasan di form sebelum release.",
  ])
    line(`•  ${text}`)
  line("")
  line("Daftar kolom sheet Kendaraan", true)
  const head = help.addRow(["Kolom", "Judul", "Wajib", "Keterangan"])
  head.eachCell((cell) => {
    cell.font = { bold: true, size: 10 }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } }
    cell.border = BORDER
  })
  columns.forEach((c, i) => {
    const row = help.addRow([letter(i + 1), c.title, c.required ? "Ya" : "", c.note ?? ""])
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { size: 10 }
      cell.border = BORDER
      cell.alignment = { wrapText: true, vertical: "top" }
    })
  })

  const list = wb.addWorksheet("Merek & Tipe", { properties: { tabColor: { argb: "FFFFC000" } } })
  list.columns = [
    { header: "Merek", key: "brand", width: 22 },
    { header: "Tipe", key: "type", width: 28 },
    { header: "", key: "gap", width: 4 },
    { header: "Daftar Merek", key: "brands", width: 22 },
  ]
  list.getRow(1).font = { bold: true }
  const pairs = active.flatMap((b) =>
    b.types.length ? b.types.map((t) => [b.name, t.name]) : [[b.name, ""]]
  )
  pairs.forEach(([brand, type], i) => {
    list.getCell(i + 2, 1).value = brand
    list.getCell(i + 2, 2).value = type
  })
  active.forEach((b, i) => {
    list.getCell(i + 2, 4).value = b.name
  })
  return ws
}
