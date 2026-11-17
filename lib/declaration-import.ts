/**
 * Upload deklarasi MOP dari Excel (Agus, 17 November 2026): satu baris satu pengiriman di bawah
 * polis MOP. Premi dihitung dari kategori rate slip open cover seperti form Tambah deklarasi,
 * kecuali kolom Premium diisi.
 */
import type { Workbook } from "exceljs"

import type { OpenCoverRate } from "./data/types"
import { dateShort } from "./format"
import { openCoverPremium, openCoverRateText } from "./open-cover"
import {
  cellText,
  cellValue,
  parseParticipantAmount,
  parseParticipantDate,
} from "./slip-participants"

/** Batas baris baru per file. Deklarasi MOP bisa ratusan per bulan (Agus, 17 November 2026). */
export const DECLARATION_IMPORT_LIMIT = 1000

/** Baris per simpan: satu transaksi per kelompok supaya tidak melewati batas waktu server. */
export const DECLARATION_SAVE_BATCH = 100

/** Panjang maksimal no. sertifikat dan keterangan, sama dengan form polis. */
const LIMITS = { policyNo: 100, remarks: 2000 }

type ColumnKey = "policyNo" | "date" | "value" | "rate" | "units" | "premium" | "remarks"

/** Kolom template. Judul lain yang lazim di daftar deklarasi juga dikenali saat upload. */
export const DECLARATION_COLUMNS: {
  key: ColumnKey
  header: string
  aliases: string[]
  required?: boolean
}[] = [
  {
    key: "policyNo",
    header: "No. Sertifikat / Deklarasi",
    aliases: ["no. sertifikat", "no sertifikat", "nomor sertifikat", "no. deklarasi", "no deklarasi", "certificate no", "certificate no.", "certificate number"],
    required: true,
  },
  {
    key: "date",
    header: "Tanggal Deklarasi",
    aliases: ["tgl deklarasi", "tgl. deklarasi", "tanggal", "declaration date", "sailing date", "etd"],
    required: true,
  },
  {
    key: "value",
    header: "Nilai Deklarasi",
    aliases: ["nilai", "nilai barang", "nilai pertanggungan", "sum insured", "tsi", "insured value"],
    required: true,
  },
  { key: "rate", header: "Kategori Rate", aliases: ["kategori", "category"] },
  { key: "units", header: "Jumlah Unit", aliases: ["jumlah", "unit", "units", "jumlah container"] },
  { key: "premium", header: "Premium", aliases: ["premi"] },
  { key: "remarks", header: "Keterangan", aliases: ["remarks", "catatan", "voyage", "rute"] },
]

export interface DeclarationImportRow {
  /** Nomor baris di Excel, untuk pesan kesalahan dan pratinjau. */
  row: number
  policyNo: string
  inceptionDate: string
  sumInsured: number
  premium: number
  /** Kategori rate yang dipakai; kosong bila premi diisi langsung tanpa kategori. */
  rateLabel: string | null
  units: number | null
  remarks: string | null
}

export interface DeclarationImportContext {
  /** Rate per kategori dari slip open cover polis MOP. */
  rates: readonly OpenCoverRate[]
  /** Periode polis MOP; tanggal deklarasi harus di dalamnya. */
  period: { start: string; end: string }
  currency: string
  /** No. polis yang sudah ada di Policy Database, huruf kecil. */
  existingNos: ReadonlySet<string>
  /**
   * No. deklarasi yang sudah tercatat di polis MOP ini, huruf kecil. Barisnya dilewati, jadi file
   * yang sama atau daftar kumulatif bisa diunggah ulang tanpa dobel.
   */
  savedNos?: ReadonlySet<string>
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[*:]/g, "").trim()

function matches(header: string, key: ColumnKey) {
  const col = DECLARATION_COLUMNS.find((c) => c.key === key)!
  return [col.header, ...col.aliases].some((name) => {
    const n = norm(name)
    return header === n || header.startsWith(`${n} (`)
  })
}

/** Rate yang bisa dipakai: berkategori dan bernilai lebih dari 0. */
export function usableRates(rates: readonly OpenCoverRate[]) {
  return rates.filter((r) => r.label.trim() && r.rate != null && r.rate > 0)
}

const ddmmyyyy = (iso: string) => iso.split("-").reverse().join("/")

/**
 * Baris pertama yang memuat kolom No. Sertifikat dan Nilai Deklarasi jadi judul; baris kosong
 * dilewati. Kesalahan dikumpulkan dengan nomor baris Excel-nya supaya file diperbaiki dulu.
 */
export function declarationsFromRows(rows: unknown[][], ctx: DeclarationImportContext) {
  const errors: string[] = []
  const declarations: DeclarationImportRow[] = []
  const skipped: { row: number; policyNo: string }[] = []
  const headerIndex = rows.findIndex((row) => {
    const names = row.map((c) => norm(cellText(c)))
    return names.some((n) => matches(n, "policyNo")) && names.some((n) => matches(n, "value"))
  })
  if (headerIndex < 0) {
    return {
      declarations,
      skipped,
      errors: ["Kolom No. Sertifikat / Deklarasi dan Nilai Deklarasi tidak ditemukan. Pakai template deklarasi."],
    }
  }
  const header = rows[headerIndex].map((c) => norm(cellText(c)))
  const columnOf = new Map(
    DECLARATION_COLUMNS.map((col) => [col.key, header.findIndex((h) => matches(h, col.key))])
  )
  const rates = usableRates(ctx.rates)
  const rateNames = rates.map((r) => r.label.trim()).join(", ")
  const seen = new Map<string, number>()
  const periodText = `${dateShort(ctx.period.start)} s/d ${dateShort(ctx.period.end)}`
  let filled = 0

  rows.slice(headerIndex + 1).forEach((row, i) => {
    const excelRow = headerIndex + i + 2
    const get = (key: ColumnKey) => {
      const index = columnOf.get(key) ?? -1
      return index < 0 ? undefined : row[index]
    }
    if (DECLARATION_COLUMNS.every((c) => !cellText(get(c.key)))) return
    const fail = (message: string) => errors.push(`Baris ${excelRow}: ${message}`)
    const before = errors.length

    const policyNo = cellText(get("policyNo"))
    const key = policyNo.toLowerCase()
    if (policyNo && ctx.savedNos?.has(key) && !seen.has(key)) {
      seen.set(key, excelRow)
      skipped.push({ row: excelRow, policyNo })
      return
    }
    filled += 1
    if (!policyNo) fail("No. Sertifikat / Deklarasi kosong.")
    else if (policyNo.length > LIMITS.policyNo)
      fail(`No. Sertifikat maksimal ${LIMITS.policyNo} karakter.`)
    else if (seen.has(key)) fail(`No. Sertifikat ${policyNo} sama dengan baris ${seen.get(key)}.`)
    else if (ctx.existingNos.has(key)) fail(`No. Sertifikat ${policyNo} sudah terdaftar di Policy Database.`)
    if (policyNo && !seen.has(key)) seen.set(key, excelRow)

    const rawDate = cellValue(get("date"))
    const date = parseParticipantDate(rawDate)
    if (rawDate == null || rawDate === "") fail("Tanggal Deklarasi kosong.")
    else if (!date) fail(`Tanggal Deklarasi "${cellText(rawDate)}" tidak dikenali.`)
    else if (date < ctx.period.start || date > ctx.period.end)
      fail(`Tanggal Deklarasi ${ddmmyyyy(date)} di luar periode polis MOP (${periodText}).`)

    const value = parseParticipantAmount(cellValue(get("value")))
    if (value == null || value <= 0) fail("Nilai Deklarasi harus angka lebih dari 0.")

    const rateText = cellText(get("rate"))
    const rate = rateText
      ? (rates.find((r) => norm(r.label) === norm(rateText)) ?? null)
      : rates.length === 1
        ? rates[0]
        : null
    if (rateText && !rate)
      fail(`Kategori Rate "${rateText}" tidak ada di slip.${rateNames ? ` Pilihan: ${rateNames}.` : ""}`)

    const rawUnits = cellValue(get("units"))
    const units = parseParticipantAmount(rawUnits)
    if (rawUnits != null && rawUnits !== "" && (units == null || units <= 0))
      fail("Jumlah Unit harus angka lebih dari 0.")

    const rawPremium = cellValue(get("premium"))
    const given = parseParticipantAmount(rawPremium)
    const premiumFilled = rawPremium != null && rawPremium !== ""
    let premium = 0
    if (premiumFilled) {
      if (given == null || given <= 0) fail("Premium harus angka lebih dari 0.")
      else premium = Math.round(given * 100) / 100
    } else if (rate) {
      if (rate.basis === "per_unit") {
        if (!(units != null && units > 0))
          fail(`Jumlah Unit wajib diisi untuk rate ${rate.label.trim()} (${openCoverRateText(rate, ctx.currency)}).`)
        else premium = openCoverPremium(rate, units)
      } else if (value != null && value > 0) {
        premium = openCoverPremium(rate, value)
        if (!(premium > 0)) fail("Premium dari rate kurang dari 1 sen. Isi kolom Premium.")
      }
    } else if (!rateText) {
      fail(rates.length ? "Isi Kategori Rate atau Premium." : "Isi Premium: slip tidak punya rate berkategori.")
    }

    if (errors.length > before) return
    declarations.push({
      row: excelRow,
      policyNo,
      inceptionDate: date!,
      sumInsured: value!,
      premium,
      rateLabel: rate ? rate.label.trim() : null,
      units: rate?.basis === "per_unit" ? units : null,
      remarks: cellText(get("remarks")).slice(0, LIMITS.remarks) || null,
    })
  })

  if (filled > DECLARATION_IMPORT_LIMIT) {
    errors.push(
      `Maksimal ${DECLARATION_IMPORT_LIMIT.toLocaleString("id-ID")} deklarasi baru per file. Pecah file menjadi beberapa upload.`
    )
  }
  if (!declarations.length && !errors.length) {
    errors.push(skipped.length ? "Semua deklarasi di file sudah tercatat di polis MOP ini." : "Tidak ada deklarasi di file.")
  }
  return { declarations, skipped, errors }
}

/**
 * Template upload: sheet Deklarasi dengan dropdown Kategori Rate dari sheet Rate, dan sheet
 * Petunjuk berisi polis MOP, periode, dan aturan isian.
 */
export function fillDeclarationTemplate(
  wb: Workbook,
  info: { policyNo: string; insuredName: string; period: { start: string; end: string }; currency: string; rates: readonly OpenCoverRate[] }
) {
  const ws = wb.addWorksheet("Deklarasi", { views: [{ state: "frozen", ySplit: 1 }] })
  ws.columns = DECLARATION_COLUMNS.map((c) => ({
    header: c.required ? `${c.header}*` : c.header,
    key: c.key,
    width: c.key === "policyNo" || c.key === "rate" ? 30 : c.key === "remarks" ? 40 : 20,
  }))
  ws.getRow(1).font = { bold: true }
  ws.getColumn("date").numFmt = "dd/mm/yyyy"
  ws.getColumn("value").numFmt = "#,##0.00"
  ws.getColumn("premium").numFmt = "#,##0.00"
  ws.getColumn("units").numFmt = "#,##0"

  const rates = usableRates(info.rates)
  const rateSheet = wb.addWorksheet("Rate")
  rateSheet.columns = [
    { header: "Kategori Rate", key: "label", width: 40 },
    { header: "Dasar", key: "basis", width: 24 },
    { header: "Rate", key: "rate", width: 28 },
  ]
  rateSheet.getRow(1).font = { bold: true }
  for (const r of rates) {
    rateSheet.addRow({
      label: r.label.trim(),
      basis: r.basis === "percent" ? "Persen dari nilai" : `Per ${r.unit?.trim() || "unit"}`,
      rate: openCoverRateText(r, info.currency),
    })
  }
  if (rates.length) {
    const rateColumn = DECLARATION_COLUMNS.findIndex((c) => c.key === "rate") + 1
    for (let row = 2; row <= DECLARATION_IMPORT_LIMIT + 1; row++) {
      ws.getRow(row).getCell(rateColumn).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`Rate!$A$2:$A$${rates.length + 1}`],
        showErrorMessage: true,
        errorTitle: "Kategori Rate",
        error: "Pilih kategori dari sheet Rate.",
      }
    }
  }

  const help = wb.addWorksheet("Petunjuk")
  help.getColumn(1).width = 110
  const perUnit = rates.some((r) => r.basis === "per_unit")
  for (const line of [
    `Polis MOP ${info.policyNo} · ${info.insuredName}`,
    `Periode ${dateShort(info.period.start)} s/d ${dateShort(info.period.end)}, mata uang ${info.currency}.`,
    "",
    "Isi satu pengiriman per baris di sheet Deklarasi, mulai baris 2. Kolom bertanda * wajib diisi.",
    "Tanggal Deklarasi: DD/MM/YYYY, misalnya 05/12/2026, dan harus di dalam periode polis MOP.",
    "Nilai Deklarasi dan Premium: angka tanpa mata uang, misalnya 1000000000.",
    "Kategori Rate: pilih dari dropdown (daftarnya di sheet Rate). Premium dihitung dari rate itu.",
    ...(perUnit ? ["Jumlah Unit: wajib untuk rate per container atau per unit."] : []),
    "Premium: kosongkan supaya dihitung dari rate; isi hanya bila premi dari asuransi berbeda.",
    `Maksimal ${DECLARATION_IMPORT_LIMIT.toLocaleString("id-ID")} baris per file. No. sertifikat yang sudah tercatat di polis MOP ini dilewati, jadi file yang sama boleh diupload ulang.`,
    "File sertifikat diunggah per deklarasi lewat menu Berkas polis.",
  ])
    help.addRow([line])
  help.getRow(1).font = { bold: true }
  return ws
}
