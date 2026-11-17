/**
 * Upload deklarasi MOP dari Excel (Agus, 17 November 2026): satu baris satu pengiriman di bawah
 * polis MOP. File bisa memakai template sistem atau General Marine Report dari asuransi
 * (contoh MOC 45031125000646): judul kolom keduanya dikenali. Premi memakai Gross Premium atau
 * kolom Premium bila diisi, selain itu dihitung dari kategori rate slip seperti form Tambah
 * deklarasi.
 */
import type { Workbook } from "exceljs"

import type { OpenCoverRate } from "./data/types"
import { dateShort } from "./format"
import { openCoverPremium, openCoverRateText } from "./open-cover"
import { isProvisionalPolicyNo } from "./policy-from-slip"
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

/** Panjang maksimal isian teks, sama dengan form polis. */
const LIMITS = { policyNo: 100, insuredName: 500, remarks: 2000 }

type ColumnKey =
  | "policyNo"
  | "date"
  | "value"
  | "rate"
  | "units"
  | "premium"
  | "insured"
  | "remarks"
  // Kolom General Marine Report yang tidak ada di template sistem.
  | "mocNo"
  | "currency"
  | "etd"
  | "goods"
  | "conveyance"
  | "vessel"
  | "voyage"
  | "from"
  | "to"
  | "blNo"
  | "invoiceNo"
  | "refNo"

interface ColumnDef {
  key: ColumnKey
  header: string
  /** Judul lain, urut prioritas. General Marine Report memakai judul bahasa Inggris. */
  aliases: string[]
  required?: boolean
  /** Ikut template sistem. */
  template?: boolean
  /** Ambil kolom terakhir yang cocok: General Marine Report punya dua Sum Insured. */
  last?: boolean
}

/** Kolom yang dikenali saat upload. Yang bertanda `template` ikut template sistem. */
export const DECLARATION_COLUMNS: ColumnDef[] = [
  {
    key: "policyNo",
    header: "No. Sertifikat / Deklarasi",
    aliases: [
      "cert no.",
      "cert no",
      "no. sertifikat",
      "no sertifikat",
      "nomor sertifikat",
      "no. deklarasi",
      "no deklarasi",
      "certificate no.",
      "certificate no",
      "certificate number",
    ],
    required: true,
    template: true,
  },
  {
    key: "date",
    header: "Tanggal Deklarasi",
    aliases: [
      "date of issue",
      "tgl deklarasi",
      "tgl. deklarasi",
      "tanggal sertifikat",
      "issue date",
      "declaration date",
      "tanggal",
    ],
    required: true,
    template: true,
  },
  {
    key: "value",
    // Sum Insured kedua di General Marine Report sudah dalam mata uang premi.
    header: "Nilai Deklarasi",
    aliases: [
      "sum insured",
      "nilai",
      "nilai barang",
      "nilai pertanggungan",
      "tsi",
      "insured value",
    ],
    required: true,
    template: true,
    last: true,
  },
  {
    key: "rate",
    header: "Kategori Rate",
    aliases: ["kategori", "category"],
    template: true,
  },
  {
    key: "units",
    header: "Jumlah Unit",
    aliases: ["jumlah", "unit", "units", "jumlah container"],
    template: true,
  },
  {
    key: "premium",
    header: "Premium",
    aliases: ["gross premium", "premi"],
    template: true,
  },
  {
    key: "insured",
    header: "Tertanggung",
    aliases: ["assured name", "insured name", "nama tertanggung", "assured"],
    template: true,
  },
  {
    key: "remarks",
    header: "Keterangan",
    aliases: ["remarks", "catatan"],
    template: true,
  },
  {
    key: "mocNo",
    header: "MOC No.",
    aliases: ["moc no", "no. polis mop", "open cover no.", "open cover no"],
  },
  {
    key: "currency",
    header: "Premium Currency",
    aliases: ["mata uang", "currency"],
  },
  {
    key: "etd",
    header: "ETD",
    aliases: ["sailing date", "tanggal keberangkatan"],
  },
  {
    key: "goods",
    header: "Description of Goods",
    aliases: ["uraian barang", "goods"],
  },
  { key: "conveyance", header: "Conv", aliases: ["conveyance", "alat angkut"] },
  { key: "vessel", header: "Vessel Name", aliases: ["vessel", "nama kapal"] },
  { key: "voyage", header: "Voyage No", aliases: ["voyage no.", "voyage"] },
  { key: "from", header: "From", aliases: ["dari", "asal"] },
  { key: "to", header: "To", aliases: ["ke", "tujuan"] },
  { key: "blNo", header: "B/L No.", aliases: ["b/l no", "bl no"] },
  { key: "invoiceNo", header: "Invoice No.", aliases: ["invoice no"] },
  {
    key: "refNo",
    header: "Internal Ref No.",
    aliases: ["internal ref no", "ref no."],
  },
]

const TEMPLATE_COLUMNS = DECLARATION_COLUMNS.filter((c) => c.template)

export interface DeclarationImportRow {
  /** Nomor baris di Excel, untuk pesan kesalahan dan pratinjau. */
  row: number
  policyNo: string
  inceptionDate: string
  sumInsured: number
  premium: number
  /** Kategori rate yang dipakai; kosong bila premi diambil dari file tanpa kategori. */
  rateLabel: string | null
  units: number | null
  /** Tertanggung di sertifikat, misalnya "... QQ ..."; kosong berarti ikut polis MOP. */
  insuredName: string | null
  remarks: string | null
}

export interface DeclarationImportContext {
  /** Rate per kategori dari slip open cover polis MOP. */
  rates: readonly OpenCoverRate[]
  /** Periode polis MOP; tanggal deklarasi harus di dalamnya. */
  period: { start: string; end: string }
  currency: string
  /**
   * No. polis MOP. MOC No. di file yang berbeda dari nomor ini hanya diberi peringatan: MOC No.
   * bisa nomor kontrak open cover, bukan nomor polis tahunannya (produksi, 17 November 2026:
   * polis 45031126000502, MOC di General Marine Report 45031125000646).
   */
  masterPolicyNo?: string
  /** No. polis yang sudah ada di Policy Database, huruf kecil. */
  existingNos: ReadonlySet<string>
  /**
   * No. deklarasi yang sudah tercatat di polis MOP ini, huruf kecil. Barisnya dilewati, jadi file
   * yang sama atau daftar kumulatif bisa diunggah ulang tanpa dobel.
   */
  savedNos?: ReadonlySet<string>
}

const norm = (s: string) =>
  s.toLowerCase().replace(/\s+/g, " ").replace(/[*:]/g, "").trim()
const compact = (s: string) => s.replace(/\s+/g, "").toLowerCase()

/** Indeks kolom menurut judul dan alias, urut prioritas; -1 bila tidak ada. */
function columnIndex(header: string[], col: ColumnDef) {
  for (const name of [col.header, ...col.aliases].map(norm)) {
    const hit = (h: string) => h === name || h.startsWith(`${name} (`)
    const index = col.last ? header.findLastIndex(hit) : header.findIndex(hit)
    if (index >= 0) return index
  }
  return -1
}

/** Rate yang bisa dipakai: berkategori dan bernilai lebih dari 0. */
export function usableRates(rates: readonly OpenCoverRate[]) {
  return rates.filter((r) => r.label.trim() && r.rate != null && r.rate > 0)
}

const ddmmyyyy = (iso: string) => iso.split("-").reverse().join("/")
const pad = (n: number) => String(n).padStart(2, "0")
const DMY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/

/**
 * Excel berlokal bulan/hari mengubah teks "01/10/2026" menjadi tanggal 10 Januari, sedangkan
 * "14/10/2026" tetap teks. Kolom yang berisi keduanya berasal dari format hari/bulan, jadi
 * tanggal Excel di kolom itu dibalik lagi (contoh General Marine Report, 17 November 2026).
 */
function swappedDateColumn(rows: unknown[][], index: number) {
  if (index < 0) return false
  let dates = 0
  let dayFirstText = 0
  for (const row of rows) {
    const value = cellValue(row[index])
    if (value instanceof Date) dates += 1
    else {
      const m = DMY.exec(cellText(value))
      if (m && Number(m[1]) > 12) dayFirstText += 1
    }
  }
  return dates > 0 && dayFirstText > 0
}

function readDate(value: unknown, swapped: boolean) {
  if (
    swapped &&
    value instanceof Date &&
    !Number.isNaN(value.getTime()) &&
    value.getUTCDate() <= 12
  ) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCDate())}-${pad(value.getUTCMonth() + 1)}`
  }
  return parseParticipantDate(value)
}

/**
 * Baris pertama yang memuat kolom No. Sertifikat dan Nilai Deklarasi (atau Cert No. dan Sum
 * Insured) jadi judul; baris kosong dilewati. Kesalahan dikumpulkan dengan nomor baris Excel-nya
 * supaya file diperbaiki dulu.
 */
export function declarationsFromRows(
  rows: unknown[][],
  ctx: DeclarationImportContext
) {
  const errors: string[] = []
  const declarations: DeclarationImportRow[] = []
  const skipped: { row: number; policyNo: string }[] = []
  const policyNoCol = DECLARATION_COLUMNS.find((c) => c.key === "policyNo")!
  const valueCol = DECLARATION_COLUMNS.find((c) => c.key === "value")!
  const headerIndex = rows.findIndex((row) => {
    const names = row.map((c) => norm(cellText(c)))
    return (
      columnIndex(names, policyNoCol) >= 0 && columnIndex(names, valueCol) >= 0
    )
  })
  if (headerIndex < 0) {
    return {
      declarations,
      skipped,
      swappedDates: 0,
      otherMocNos: [] as string[],
      errors: [
        "Kolom No. Sertifikat dan Nilai Deklarasi (atau Cert No. dan Sum Insured) tidak ditemukan. Pakai template deklarasi atau General Marine Report.",
      ],
    }
  }
  const header = rows[headerIndex].map((c) => norm(cellText(c)))
  const columnOf = new Map(
    DECLARATION_COLUMNS.map((col) => [col.key, columnIndex(header, col)])
  )
  const body = rows.slice(headerIndex + 1)
  const swapDate = swappedDateColumn(body, columnOf.get("date") ?? -1)
  const swapEtd = swappedDateColumn(body, columnOf.get("etd") ?? -1)
  let swappedDates = 0

  const rates = usableRates(ctx.rates)
  const rateNames = rates.map((r) => r.label.trim()).join(", ")
  const seen = new Map<string, number>()
  const periodText = `${dateShort(ctx.period.start)} s/d ${dateShort(ctx.period.end)}`
  const checkMoc =
    ctx.masterPolicyNo && !isProvisionalPolicyNo(ctx.masterPolicyNo)
  const otherMocNos = new Set<string>()
  let filled = 0

  body.forEach((row, i) => {
    const excelRow = headerIndex + i + 2
    const get = (key: ColumnKey) => {
      const index = columnOf.get(key) ?? -1
      return index < 0 ? undefined : row[index]
    }
    const text = (key: ColumnKey) => cellText(get(key))
    if (DECLARATION_COLUMNS.every((c) => !text(c.key))) return
    const fail = (message: string) =>
      errors.push(`Baris ${excelRow}: ${message}`)
    const before = errors.length

    const policyNo = text("policyNo")
    const key = policyNo.toLowerCase()
    if (policyNo && ctx.savedNos?.has(key) && !seen.has(key)) {
      seen.set(key, excelRow)
      skipped.push({ row: excelRow, policyNo })
      return
    }
    filled += 1
    if (!policyNo) fail("No. Sertifikat kosong.")
    else if (policyNo.length > LIMITS.policyNo)
      fail(`No. Sertifikat maksimal ${LIMITS.policyNo} karakter.`)
    else if (seen.has(key))
      fail(`No. Sertifikat ${policyNo} sama dengan baris ${seen.get(key)}.`)
    else if (ctx.existingNos.has(key))
      fail(`No. Sertifikat ${policyNo} sudah terdaftar di Policy Database.`)
    if (policyNo && !seen.has(key)) seen.set(key, excelRow)

    const moc = text("mocNo")
    if (checkMoc && moc && compact(moc) !== compact(ctx.masterPolicyNo!))
      otherMocNos.add(moc)

    const currency = text("currency")
    if (currency && currency.toUpperCase() !== ctx.currency.toUpperCase())
      fail(`Mata uang ${currency} berbeda dengan polis MOP (${ctx.currency}).`)

    // Tanggal deklarasi; General Marine Report tanpa Date of Issue memakai ETD.
    const rawDate = cellValue(get("date"))
    const rawEtd = cellValue(get("etd"))
    const useEtd =
      (rawDate == null || rawDate === "") && rawEtd != null && rawEtd !== ""
    const source = useEtd ? rawEtd : rawDate
    const swapped = useEtd ? swapEtd : swapDate
    const date = readDate(source, swapped)
    if (swapped && source instanceof Date && source.getUTCDate() <= 12)
      swappedDates += 1
    if (source == null || source === "") fail("Tanggal Deklarasi kosong.")
    else if (!date)
      fail(`Tanggal Deklarasi "${cellText(source)}" tidak dikenali.`)
    else if (date < ctx.period.start || date > ctx.period.end)
      fail(
        `Tanggal Deklarasi ${ddmmyyyy(date)} di luar periode polis MOP (${periodText}).`
      )

    const value = parseParticipantAmount(cellValue(get("value")))
    if (value == null || value <= 0)
      fail("Nilai Deklarasi harus angka lebih dari 0.")

    const rateText = text("rate")
    const rate = rateText
      ? (rates.find((r) => norm(r.label) === norm(rateText)) ?? null)
      : rates.length === 1
        ? rates[0]
        : null
    if (rateText && !rate)
      fail(
        `Kategori Rate "${rateText}" tidak ada di slip.${rateNames ? ` Pilihan: ${rateNames}.` : ""}`
      )

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
          fail(
            `Jumlah Unit wajib diisi untuk rate ${rate.label.trim()} (${openCoverRateText(rate, ctx.currency)}).`
          )
        else premium = openCoverPremium(rate, units)
      } else if (value != null && value > 0) {
        premium = openCoverPremium(rate, value)
        if (!(premium > 0))
          fail("Premium dari rate kurang dari 1 sen. Isi kolom Premium.")
      }
    } else if (!rateText) {
      fail(
        rates.length
          ? "Isi Kategori Rate atau Premium."
          : "Isi Premium: slip tidak punya rate berkategori."
      )
    }

    const insuredName = text("insured")
    if (insuredName.length > LIMITS.insuredName)
      fail(`Tertanggung maksimal ${LIMITS.insuredName} karakter.`)

    if (errors.length > before) return
    declarations.push({
      row: excelRow,
      policyNo,
      inceptionDate: date!,
      sumInsured: value!,
      premium,
      rateLabel: rate ? rate.label.trim() : null,
      units: rate?.basis === "per_unit" ? units : null,
      insuredName: insuredName || null,
      remarks:
        shipmentRemarks(text, readDate(rawEtd, swapEtd)).slice(
          0,
          LIMITS.remarks
        ) || null,
    })
  })

  if (filled > DECLARATION_IMPORT_LIMIT) {
    errors.push(
      `Maksimal ${DECLARATION_IMPORT_LIMIT.toLocaleString("id-ID")} deklarasi baru per file. Pecah file menjadi beberapa upload.`
    )
  }
  // Semua baris sudah tercatat bukan kesalahan: tidak ada yang perlu diperbaiki atau disimpan.
  if (!declarations.length && !errors.length && !skipped.length)
    errors.push("Tidak ada deklarasi di file.")
  return {
    declarations,
    skipped,
    swappedDates,
    /** MOC No. di file yang berbeda dari no. polis MOP; ditampilkan sebagai peringatan. */
    otherMocNos: [...otherMocNos],
    errors,
  }
}

/**
 * Keterangan deklarasi: kolom Keterangan bila diisi, ditambah data pengiriman dari General
 * Marine Report (barang, kapal, rute, ETD, B/L, invoice, referensi).
 */
function shipmentRemarks(text: (key: ColumnKey) => string, etd: string | null) {
  const vessel = [
    text("conveyance"),
    text("vessel"),
    text("voyage") && `V. ${text("voyage")}`,
  ]
    .filter(Boolean)
    .join(" ")
  const route =
    text("from") && text("to")
      ? `${text("from")} - ${text("to")}`
      : text("from") || text("to")
  return [
    text("remarks"),
    text("goods"),
    vessel,
    route,
    etd ? `ETD ${ddmmyyyy(etd)}` : "",
    text("blNo") && `B/L ${text("blNo")}`,
    text("invoiceNo") && `Invoice ${text("invoiceNo")}`,
    text("refNo") && `Ref ${text("refNo")}`,
  ]
    .filter(Boolean)
    .join(" · ")
}

/**
 * Template upload: sheet Deklarasi dengan dropdown Kategori Rate dari sheet Rate, dan sheet
 * Petunjuk berisi polis MOP, periode, dan aturan isian.
 */
export function fillDeclarationTemplate(
  wb: Workbook,
  info: {
    policyNo: string
    insuredName: string
    period: { start: string; end: string }
    currency: string
    rates: readonly OpenCoverRate[]
  }
) {
  const ws = wb.addWorksheet("Deklarasi", {
    views: [{ state: "frozen", ySplit: 1 }],
  })
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({
    header: c.required ? `${c.header}*` : c.header,
    key: c.key,
    width:
      c.key === "policyNo" || c.key === "rate"
        ? 30
        : c.key === "remarks" || c.key === "insured"
          ? 40
          : 20,
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
      basis:
        r.basis === "percent"
          ? "Persen dari nilai"
          : `Per ${r.unit?.trim() || "unit"}`,
      rate: openCoverRateText(r, info.currency),
    })
  }
  if (rates.length) {
    const rateColumn = TEMPLATE_COLUMNS.findIndex((c) => c.key === "rate") + 1
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
    "General Marine Report dari asuransi bisa langsung diupload tanpa template ini (simpan dulu sebagai .xlsx).",
    "Isi satu pengiriman per baris di sheet Deklarasi, mulai baris 2. Kolom bertanda * wajib diisi.",
    "Tanggal Deklarasi: DD/MM/YYYY, misalnya 05/12/2026, dan harus di dalam periode polis MOP.",
    "Nilai Deklarasi dan Premium: angka tanpa mata uang, misalnya 1000000000.",
    "Kategori Rate: pilih dari dropdown (daftarnya di sheet Rate). Premium dihitung dari rate itu.",
    ...(perUnit
      ? ["Jumlah Unit: wajib untuk rate per container atau per unit."]
      : []),
    "Premium: kosongkan supaya dihitung dari rate; isi hanya bila premi dari asuransi berbeda.",
    'Tertanggung: isi bila sertifikat atas nama lain, misalnya "... QQ ..."; kosong berarti ikut polis MOP.',
    `Maksimal ${DECLARATION_IMPORT_LIMIT.toLocaleString("id-ID")} baris per file. No. sertifikat yang sudah tercatat di polis MOP ini dilewati, jadi file yang sama boleh diupload ulang.`,
    "File sertifikat diunggah per deklarasi lewat menu Berkas polis.",
  ])
    help.addRow([line])
  help.getRow(1).font = { bold: true }
  return ws
}
