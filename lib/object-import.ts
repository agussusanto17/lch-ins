/**
 * Upload daftar objek slip Engineering dari Excel (Agus, 20 November 2026), misalnya 22 unit alat
 * berat Equipment All Risks (CPM) PT Habco Primatama. Satu baris satu objek: merek, tipe, nomor
 * seri, tahun, uraian, nilai pertanggungan, dan rate per cover. Kolom dikenali dari judulnya,
 * jadi jadwal unit LCH (BRAND, TYPE, SERIAL NO., YEAR (M), SUM INSURED, RATE) bisa langsung
 * diupload, dan template dari `fillObjectTemplate` memakai daftar kolom yang sama.
 */
import type { Cell, Workbook, Worksheet } from "exceljs"

import { parseRate } from "./location-import"
import { GENERIC_RATE_LABEL } from "./slip-items"
import { cellText, cellValue, parseParticipantAmount } from "./slip-participants"

export { supportsObjectUpload } from "./slip-items"

/** Batas objek per file, sama dengan jumlah baris template. */
export const OBJECT_IMPORT_LIMIT = 500

/** Baris pertama data di sheet Objek template: baris 1 kelompok kolom, baris 2 judul. */
const FIRST_ROW = 3

/** Panjang maksimal isian teks. */
const LIMITS = { brand: 100, type: 200, serial: 100, description: 1000 }

/**
 * Rate di bawah batas ini kemungkinan diisi sebagai pecahan (0,011 untuk 1,1%), bukan persen.
 * Rate alat berat dan mesin di contoh LCH berkisar 0,3% sampai 3%.
 */
export const LOW_RATE_PERCENT = 0.05

type ColumnGroup = "objek" | "nilai" | "rate" | "cek"
type ColumnKind = "text" | "number" | "money" | "rate" | "auto"

export interface ObjectColumn {
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

const norm = (s: string) =>
  s.toLowerCase().replace(/\s+/g, " ").replace(/[*:]/g, "").trim()

/** Nama cover di judul kolom; cover pertama tanpa nama memakai "Rate (%)". */
const coverName = (label: string) =>
  label.trim() && label.trim() !== GENERIC_RATE_LABEL ? label.trim() : ""

function rateColumn(label: string, first: boolean): ObjectColumn {
  const name = coverName(label)
  const title = name ? `Rate ${name} (%)` : GENERIC_RATE_LABEL
  const names = name
    ? [norm(`rate ${name} (%)`), norm(`rate ${name}`)]
    : [norm(GENERIC_RATE_LABEL)]
  return {
    key: `rate:${label}`,
    title,
    group: "rate",
    width: 14,
    kind: "rate",
    // Jadwal unit LCH hanya punya satu kolom RATE; kolom itu untuk cover pertama.
    names: first ? [...names, "rate"] : names,
    note: `Rate ${name || "objek"} dalam persen, misalnya 1,1 berarti 1,1%. Kosongkan bila cover ini tidak dijamin.`,
  }
}

/** Kolom template; kolom rate mengikuti cover objek pertama slip. */
export function objectColumns(rateLabels: readonly string[]): ObjectColumn[] {
  const labels = rateLabels.length ? rateLabels : [GENERIC_RATE_LABEL]
  return [
    {
      key: "no",
      title: "No",
      group: "objek",
      width: 5,
      kind: "number",
      names: ["no", "no."],
      note: "Nomor urut. Boleh kosong; urutan objek mengikuti urutan baris.",
    },
    {
      key: "brand",
      title: "Merek",
      group: "objek",
      width: 16,
      kind: "text",
      names: ["merek", "merk", "brand"],
      note: "Misalnya Komatsu atau Caterpillar. Isi Merek, Tipe / Model, atau Uraian Lain; minimal salah satu.",
    },
    {
      key: "type",
      title: "Tipe / Model",
      group: "objek",
      width: 26,
      kind: "text",
      names: ["tipe / model", "tipe/model", "tipe", "type", "model"],
      note: "Misalnya Wheel Loader WA 200 atau Bulldozer D5K2 LGP.",
    },
    {
      key: "serial",
      title: "No. Seri",
      group: "objek",
      width: 20,
      kind: "text",
      names: ["no. seri", "no seri", "nomor seri", "serial no.", "serial no", "serial number", "s/n"],
      note: "Nomor seri atau nomor rangka unit, dicetak sebagai S/N. Tidak boleh kembar; objek yang nomor serinya sudah ada di slip dilewati.",
    },
    {
      key: "year",
      title: "Tahun",
      group: "objek",
      width: 12,
      kind: "text",
      names: ["tahun", "tahun pembuatan", "year"],
      note: 'Tahun pembuatan 4 angka, misalnya 2018. Keterangan setelah tahun, misalnya "1996, RECON 2018", ikut dicetak.',
    },
    {
      key: "description",
      title: "Uraian Lain",
      group: "objek",
      width: 34,
      kind: "text",
      names: ["uraian lain", "uraian", "deskripsi", "keterangan", "description"],
      note: "Uraian tambahan, dicetak di baris baru. Untuk objek tanpa merek dan tipe, isi uraian lengkapnya di sini.",
    },
    {
      key: "sumInsured",
      title: "Nilai Pertanggungan",
      group: "nilai",
      width: 20,
      kind: "money",
      required: true,
      names: ["nilai pertanggungan", "sum insured", "nilai", "tsi"],
      note: "Angka saja tanpa mata uang dan titik ribuan. Mata uang mengikuti slip.",
    },
    ...labels.map((label, i) => rateColumn(label, i === 0)),
    {
      key: "premium",
      title: "Premi (otomatis)",
      group: "cek",
      width: 18,
      kind: "auto",
      names: ["premi (otomatis)"],
      note: "Terisi sendiri: nilai pertanggungan × rate, dibulatkan ke sen seperti sistem. Tidak dibaca saat upload.",
    },
  ]
}

function columnIndex(header: string[], col: ObjectColumn) {
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

/**
 * Sel angka berformat persen di Excel menyimpan pecahan: 1,1% tersimpan 0,011. Saat file dibaca,
 * sel seperti itu diubah jadi teks persen ("1.1%") supaya rate tidak 100 kali lebih kecil.
 */
export function percentCellValue(value: unknown, numFmt: string | undefined) {
  if (typeof value !== "number" || !numFmt?.includes("%")) return value
  return `${Number((value * 100).toPrecision(12))}%`
}

/** Kunci nomor seri untuk mencari objek kembar: huruf besar tanpa spasi, titik, dan tanda hubung. */
export function serialKey(serial: string | null | undefined) {
  return (serial ?? "").toUpperCase().replace(/[\s.-]/g, "")
}

/** Nomor seri objek yang sudah ada di slip, dibaca dari "S/N ..." di uraiannya. */
export function existingSerialKeys(items: readonly { description: string }[]) {
  const keys = new Set<string>()
  for (const item of items) {
    for (const m of item.description.matchAll(/S\/N ([^,\n]+)/g)) {
      const key = serialKey(m[1])
      if (key) keys.add(key)
    }
  }
  return keys
}

/** Uraian objek yang dicetak: "KOMATSU WHEEL LOADER WA 200, S/N 30926, Year 1998", lalu uraian lain. */
export function objectDescription(parts: {
  brand?: string
  type?: string
  serial?: string
  year?: string
  yearNote?: string
  description?: string
}) {
  const name = [parts.brand, parts.type].filter(Boolean).join(" ")
  const first = [
    name,
    parts.serial ? `S/N ${parts.serial}` : "",
    parts.year ? `Year ${parts.year}` : "",
    parts.yearNote ?? "",
  ]
    .filter(Boolean)
    .join(", ")
  return [first, parts.description ?? ""].filter(Boolean).join("\n")
}

export interface ObjectImportRow {
  /** Nomor baris di Excel, untuk pesan kesalahan dan pratinjau. */
  row: number
  description: string
  serial?: string
  sumInsured: number
  /** Rate (%) per label cover; cover yang kosong tidak ada. */
  rates: Record<string, number>
}

export interface ObjectImportContext {
  /** Label cover objek pertama slip. */
  rateLabels: readonly string[]
  /** Kunci nomor seri objek yang sudah ada; barisnya dilewati. Kosong saat semua diganti. */
  existingSerials: ReadonlySet<string>
}

export interface ObjectImportResult {
  objects: ObjectImportRow[]
  /** Baris yang dilewati: objek yang nomor serinya sudah ada, atau baris total di akhir jadwal. */
  skipped: { row: number; reason: "existing" | "total"; serial?: string }[]
  /** Kesalahan per baris ("Baris N: ...") lalu kesalahan tingkat file. */
  errors: string[]
  /** Kesalahan yang menahan seluruh file. */
  fileErrors: string[]
  /** Baris berisi yang dibaca, termasuk yang dilewati dan yang gagal. */
  read: number
  failed: number
  /** Objek siap ditambahkan yang belum punya rate. */
  noRateRows: number
  /** Objek dengan rate di bawah LOW_RATE_PERCENT, kemungkinan diisi sebagai pecahan. */
  lowRateRows: number
}

/**
 * Baris pertama yang memuat kolom nilai dan salah satu kolom uraian jadi judul. Baris tanpa
 * isian, termasuk rumus Premi template, dilewati. Baris total di akhir jadwal unit (tanpa uraian,
 * nilainya sama dengan jumlah baris di atasnya) dilewati, bukan dihitung gagal.
 */
export function objectsFromRows(rows: unknown[][], ctx: ObjectImportContext): ObjectImportResult {
  const result: ObjectImportResult = {
    objects: [],
    skipped: [],
    errors: [],
    fileErrors: [],
    read: 0,
    failed: 0,
    noRateRows: 0,
    lowRateRows: 0,
  }
  const columns = objectColumns(ctx.rateLabels)
  const col = (key: string) => columns.find((c) => c.key === key)!
  const descriptive = ["brand", "type", "description"]
  const headerIndex = rows.findIndex((row) => {
    const names = row.map((c) => norm(cellText(c)))
    return (
      columnIndex(names, col("sumInsured")) >= 0 &&
      descriptive.some((key) => columnIndex(names, col(key)) >= 0)
    )
  })
  if (headerIndex < 0) {
    const message =
      "Kolom Nilai Pertanggungan dan Merek, Tipe / Model, atau Uraian Lain tidak ditemukan. Pakai template objek."
    result.errors.push(message)
    result.fileErrors.push(message)
    return result
  }
  const header = rows[headerIndex].map((c) => norm(cellText(c)))
  const columnOf = new Map(columns.map((c) => [c.key, columnIndex(header, c)]))
  const inputColumns = columns.filter((c) => c.kind !== "auto" && c.key !== "no")
  const labels = ctx.rateLabels.length ? ctx.rateLabels : [GENERIC_RATE_LABEL]
  const seen = new Map<string, number>()
  // Jumlah nilai baris di atasnya, untuk mengenali baris total jadwal unit.
  let runningTotal = 0

  rows.slice(headerIndex + 1).forEach((row, i) => {
    const excelRow = headerIndex + i + 2
    const raw = (key: string) => {
      const index = columnOf.get(key) ?? -1
      return index < 0 ? undefined : row[index]
    }
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

    const brand = text("brand")
    limited("brand", "Merek", brand)
    const type = text("type")
    limited("type", "Tipe / Model", type)
    const serial = text("serial")
    limited("serial", "No. Seri", serial)
    const description = text("description")
    limited("description", "Uraian Lain", description)

    const sumText = text("sumInsured")
    const sumInsured = sumText ? parseParticipantAmount(cellValue(raw("sumInsured"))) : null

    if (!brand && !type && !serial && !description) {
      // Baris total jadwal unit: tanpa uraian, nilainya jumlah baris di atasnya.
      if (sumInsured != null && runningTotal > 0 && Math.abs(sumInsured - runningTotal) < 1) {
        result.read += 1
        result.skipped.push({ row: excelRow, reason: "total" })
        return
      }
      fail("Merek, Tipe / Model, dan Uraian Lain kosong. Isi minimal salah satu.")
    } else if (!brand && !type && !description) {
      fail("Merek, Tipe / Model, dan Uraian Lain kosong. Isi minimal salah satu selain No. Seri.")
    }

    if (!sumText) fail("Nilai Pertanggungan kosong.")
    else if (sumInsured == null || sumInsured <= 0)
      fail(`Nilai Pertanggungan "${sumText}" harus angka lebih dari 0, tanpa mata uang.`)
    else runningTotal += sumInsured

    // "1996, RECON 2018": tahun 1996, keterangannya ikut dicetak.
    const yearText = text("year")
    let year: string | undefined
    let yearNote: string | undefined
    if (yearText) {
      const m = /^(\d{4})(?:[\s,;/-]+([\s\S]*))?$/.exec(yearText)
      const value = m ? Number(m[1]) : NaN
      if (!m || value < 1900 || value > 2100)
        fail(`Tahun "${yearText}" harus diawali tahun 4 angka, misalnya 2018.`)
      else {
        year = m[1]
        yearNote = m[2]?.replace(/\s+/g, " ").trim() || undefined
      }
    }

    const rates: Record<string, number> = {}
    labels.forEach((label, index) => {
      const key = `rate:${label}`
      const value = text(key)
      if (!value) return
      const rate = parseRate(cellValue(raw(key)))
      const name = coverName(label) || (index === 0 ? "" : label)
      if (rate == null || rate < 0 || rate > 100)
        fail(`Rate${name ? ` ${name}` : ""} "${value}" harus angka persen antara 0 dan 100, misalnya 1,1.`)
      else rates[label] = rate
    })

    const key = serialKey(serial)
    if (key && ctx.existingSerials.has(key) && !seen.has(key)) {
      seen.set(key, excelRow)
      result.read += 1
      result.skipped.push({ row: excelRow, reason: "existing", serial })
      return
    }
    if (key && seen.has(key)) fail(`No. Seri sama dengan baris ${seen.get(key)}.`)
    else if (key) seen.set(key, excelRow)

    result.read += 1
    if (errors.length) {
      result.errors.push(...errors)
      result.failed += 1
      return
    }
    const priced = Object.values(rates).filter((r) => r > 0)
    if (!priced.length) result.noRateRows += 1
    else if (priced.some((r) => r < LOW_RATE_PERCENT)) result.lowRateRows += 1
    result.objects.push({
      row: excelRow,
      description: objectDescription({
        brand,
        type,
        serial,
        year,
        yearNote,
        description,
      }),
      ...(serial ? { serial } : {}),
      sumInsured: Math.round(sumInsured! * 100) / 100,
      rates,
    })
  })

  const filled = result.read - result.skipped.length
  if (filled > OBJECT_IMPORT_LIMIT)
    result.fileErrors.push(
      `Maksimal ${OBJECT_IMPORT_LIMIT.toLocaleString("id-ID")} objek per file. Pecah file menjadi beberapa upload.`
    )
  if (!result.read) result.fileErrors.push("Tidak ada objek di file.")
  if (result.fileErrors.length) {
    result.objects = []
    result.errors.push(...result.fileErrors)
  }
  return result
}

// ------------------------------------------------------------------ template

const GROUP_TITLES: Record<ColumnGroup, string> = {
  objek: "Data Objek",
  nilai: "Nilai",
  rate: "Rate (%)",
  cek: "Cek",
}

const GROUP_FILL: Record<ColumnGroup, string> = {
  objek: "FFDDEBF7",
  nilai: "FFE2EFDA",
  rate: "FFFCE4D6",
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

function writeHeader(ws: Worksheet, columns: ObjectColumn[]) {
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
  ws.getRow(2).height = 45
}

/** Rumus Premi satu baris: premi tiap cover dibulatkan ke sen seperti sistem. */
function premiumFormula(columns: ObjectColumn[], r: number) {
  const at = (key: string) => `${letter(columns.findIndex((c) => c.key === key) + 1)}${r}`
  const si = `N(${at("sumInsured")})`
  const parts = columns
    .filter((c) => c.group === "rate")
    .map((c) => `ROUND(${si}*N(${at(c.key)})/100,2)`)
  return `IF(${si}=0,"",${parts.join("+")})`
}

function styleBody(ws: Worksheet, columns: ObjectColumn[]) {
  const last = FIRST_ROW + OBJECT_IMPORT_LIMIT - 1
  for (let r = FIRST_ROW; r <= last; r++) {
    columns.forEach((c, i) => {
      const cell: Cell = ws.getCell(r, i + 1)
      cell.border = BORDER
      cell.font = { size: 10 }
      cell.numFmt = NUM_FMT[c.kind] ?? (c.kind === "text" ? "@" : "General")
      cell.alignment = { vertical: "top", wrapText: c.key === "description" }
      if (c.kind === "auto") {
        cell.value = { formula: premiumFormula(columns, r) }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AUTO_FILL } }
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
          error: "Isi rate dalam persen antara 0 dan 100, misalnya 1,1.",
        }
      }
    })
  }
}

/**
 * Template upload objek: sheet Objek (500 baris, kolom rate mengikuti cover objek pertama, Premi
 * berumus sama dengan hitungan sistem) dan Petunjuk.
 */
export function fillObjectTemplate(
  wb: Workbook,
  info: {
    insuredName: string
    currency: string
    typeOfCover: string
    rateLabels: readonly string[]
  }
) {
  const columns = objectColumns(info.rateLabels)
  const ws = wb.addWorksheet("Objek", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 2 }],
    properties: { tabColor: { argb: "FF2F75B5" } },
  })
  writeHeader(ws, columns)
  styleBody(ws, columns)

  const help = wb.addWorksheet("Petunjuk", { properties: { tabColor: { argb: "FF70AD47" } } })
  help.getColumn(1).width = 8
  help.getColumn(2).width = 26
  help.getColumn(3).width = 8
  help.getColumn(4).width = 90
  const line = (text: string, bold = false) => {
    const row = help.addRow([text])
    help.mergeCells(row.number, 1, row.number, 4)
    row.getCell(1).font = { bold, size: bold ? 12 : 10 }
    row.getCell(1).alignment = { wrapText: true, vertical: "top" }
    if (text.length > 110) row.height = 30
  }
  const covers = (info.rateLabels.length ? info.rateLabels : [GENERIC_RATE_LABEL]).map(
    (l) => coverName(l) || "rate objek"
  )
  line("Template Upload Objek Engineering", true)
  line(
    `Untuk placing slip ${info.insuredName.trim() || "Engineering"}${
      info.typeOfCover ? ` (${info.typeOfCover})` : ""
    }, mata uang ${info.currency}. Satu baris di sheet Objek berisi satu objek, misalnya satu unit alat berat, lengkap dengan nilai pertanggungan dan rate-nya.`
  )
  line(`Cover objek: ${covers.join(", ")}.`)
  line("")
  line("Cara mengisi", true)
  for (const text of [
    `1. Isi sheet Objek mulai baris ${FIRST_ROW}, maksimal ${OBJECT_IMPORT_LIMIT} objek. Kolom bertanda * wajib diisi.`,
    "2. Kolom abu-abu Premi (otomatis) terisi sendiri dan tidak perlu diisi.",
    "3. Arahkan kursor ke judul kolom untuk melihat catatan singkat tiap kolom.",
    "4. Simpan sebagai .xlsx, lalu upload lewat tombol Upload Excel di bagian Interest Insured.",
  ])
    line(text)
  line("")
  line("Aturan isian", true)
  for (const text of [
    "Isi Merek, Tipe / Model, atau Uraian Lain, minimal salah satu. Uraian yang dicetak disusun dari kolom-kolom itu, misalnya: KOMATSU WHEEL LOADER WA 200, S/N 30926, Year 1998.",
    "No. Seri tidak boleh kembar. Objek yang nomor serinya sudah ada di slip dilewati, jadi file yang sama boleh diupload ulang setelah baris yang gagal diperbaiki.",
    "Nilai pertanggungan diisi angka saja tanpa mata uang dan titik ribuan. Mata uang mengikuti slip.",
    "Rate diisi dalam persen, sama dengan form slip: 1,1 berarti 1,1%. Sel berformat persen di Excel (1,10%) juga terbaca benar.",
    "Jadwal unit dari asuransi atau LCH boleh langsung diupload bila judul kolomnya BRAND, TYPE, SERIAL NO., YEAR, SUM INSURED, dan RATE. Baris total di akhir jadwal dilewati.",
    "Premi tidak diisi di Excel. Sistem menghitung premi = nilai pertanggungan × rate per objek. Deductible objek baru mengikuti objek pertama di form.",
  ])
    line(`•  ${text}`)
  line("")
  line("Daftar kolom sheet Objek", true)
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
  return ws
}
