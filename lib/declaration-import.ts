/**
 * Upload deklarasi MOP dari Excel (Agus, 17 November 2026): satu baris satu pengiriman di bawah
 * polis MOP. File bisa memakai template sistem atau General Marine Report dari asuransi
 * (contoh MOC 45031125000646): judul kolom keduanya dikenali. Gross Premium (atau kolom Premium)
 * adalah premi tagihan ke klien; premi deklarasi adalah premi ke asuransi menurut kategori rate
 * MOP, selisihnya margin (Agus, 22 November 2026). Tanpa kategori rate, premi file dipakai untuk
 * keduanya.
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
  | "mocNo"
  | "insured"
  | "goods"
  | "conveyance"
  | "vessel"
  | "voyage"
  | "etd"
  | "from"
  | "to"
  | "currency"
  | "value"
  | "premium"
  | "adminFee"
  | "refNo"
  | "invoiceNo"
  | "blNo"
  | "rate"
  | "units"
  | "remarks"

interface ColumnDef {
  key: ColumnKey
  /** Judul di template, sama dengan General Marine Report dari asuransi. */
  title: string
  /** Judul yang dikenali saat upload, urut prioritas. */
  names: string[]
  required?: boolean
  /** Ikut template sistem. */
  template?: boolean
  /** Ambil kolom terakhir yang cocok: General Marine Report punya dua Sum Insured. */
  last?: boolean
}

/**
 * Kolom yang dikenali saat upload, urut seperti General Marine Report (Agus, 17 November 2026:
 * template harus memuat Admin Fee, B/L, invoice, currency, rute, alat angkut, kapal, dan uraian
 * barang). Kategori Rate, Interest Insured (jumlah container), dan Keterangan tambahan dari sistem.
 */
export const DECLARATION_COLUMNS: ColumnDef[] = [
  {
    key: "policyNo",
    title: "Cert No.",
    names: [
      "cert no.",
      "cert no",
      "no. sertifikat / deklarasi",
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
    title: "Date of Issue",
    names: [
      "date of issue",
      "tanggal deklarasi",
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
    key: "mocNo",
    title: "MOC No.",
    names: [
      "moc no.",
      "moc no",
      "no. polis mop",
      "open cover no.",
      "open cover no",
    ],
  },
  {
    key: "insured",
    title: "Assured Name",
    names: [
      "assured name",
      "tertanggung",
      "insured name",
      "nama tertanggung",
      "assured",
    ],
    template: true,
  },
  {
    key: "goods",
    title: "Description of Goods",
    names: ["description of goods", "uraian barang", "goods"],
    template: true,
  },
  {
    key: "conveyance",
    title: "Conv",
    names: ["conv", "conveyance", "alat angkut"],
    template: true,
  },
  {
    key: "vessel",
    title: "Vessel Name",
    names: ["vessel name", "vessel", "nama kapal"],
    template: true,
  },
  {
    key: "voyage",
    title: "Voyage No",
    names: ["voyage no", "voyage no.", "voyage"],
    template: true,
  },
  {
    key: "etd",
    title: "ETD",
    names: ["etd", "sailing date", "tanggal keberangkatan"],
    template: true,
  },
  {
    key: "from",
    title: "From",
    names: ["from", "dari", "asal"],
    template: true,
  },
  { key: "to", title: "To", names: ["to", "ke", "tujuan"], template: true },
  // Premium Currency lebih dulu: di General Marine Report, Currency adalah mata uang barang.
  {
    key: "currency",
    title: "Currency",
    names: ["premium currency", "currency", "mata uang"],
    template: true,
  },
  {
    key: "value",
    // Sum Insured kedua di General Marine Report sudah dalam mata uang premi.
    title: "Sum Insured",
    names: [
      "sum insured",
      "nilai deklarasi",
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
    key: "premium",
    title: "Gross Premium",
    names: ["gross premium", "premium", "premi"],
    template: true,
  },
  {
    key: "adminFee",
    title: "Admin Fee",
    names: ["admin fee", "biaya admin", "admin cost", "biaya administrasi"],
    template: true,
  },
  {
    key: "refNo",
    title: "Internal Ref No.",
    names: ["internal ref no.", "internal ref no", "ref no."],
    template: true,
  },
  {
    key: "invoiceNo",
    title: "Invoice No.",
    names: ["invoice no.", "invoice no"],
    template: true,
  },
  {
    key: "blNo",
    title: "B/L No.",
    names: ["b/l no.", "b/l no", "bl no"],
    template: true,
  },
  {
    key: "rate",
    title: "Kategori Rate",
    names: ["kategori rate", "kategori", "category"],
    template: true,
  },
  {
    // Biasanya diisi jumlah container (Agus, 17 November 2026); angkanya dipakai rate per container.
    key: "units",
    title: "Interest Insured",
    names: [
      "interest insured",
      "jumlah container",
      "jumlah unit",
      "jumlah",
      "unit",
      "units",
    ],
    template: true,
  },
  {
    key: "remarks",
    title: "Keterangan",
    names: ["keterangan", "remarks", "catatan"],
    template: true,
  },
]

const TEMPLATE_COLUMNS = DECLARATION_COLUMNS.filter((c) => c.template)

export interface DeclarationImportRow {
  /** Nomor baris di Excel, untuk pesan kesalahan dan pratinjau. */
  row: number
  policyNo: string
  inceptionDate: string
  sumInsured: number
  /** Premi deklarasi: premi ke asuransi menurut kategori rate MOP, atau premi file tanpa kategori. */
  premium: number
  /**
   * Premi tagihan ke klien dari Gross Premium file (Agus, 22 November 2026); selisihnya dengan
   * premi deklarasi adalah margin. Kosong bila kolom premi tidak diisi.
   */
  clientPremium: number | null
  /** Kategori rate yang dipakai; kosong bila premi diambil dari file tanpa kategori. */
  rateLabel: string | null
  units: number | null
  /** Tertanggung di sertifikat, misalnya "... QQ ..."; kosong berarti ikut polis MOP. */
  insuredName: string | null
  /** Admin Fee dari asuransi per sertifikat; tidak menambah premi produksi. */
  adminFee: number | null
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
  for (const name of col.names.map(norm)) {
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
    const message =
      "Kolom Cert No. dan Sum Insured tidak ditemukan. Pakai template deklarasi atau General Marine Report."
    return {
      declarations,
      skipped,
      swappedDates: 0,
      otherMocNos: [] as string[],
      errors: [message],
      fileErrors: [message],
      read: 0,
      failed: 0,
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
  // Baris yang punya kesalahan tidak ikut disimpan; jumlahnya dilaporkan (Agus, 17 November 2026).
  let failed = 0

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

    // Interest Insured: angka (jumlah container) dipakai rate per container; teks seperti
    // "3X20' CONTAINER" hanya dicatat di keterangan, tidak dibaca sebagai angka.
    const rawUnits = cellValue(get("units"))
    const unitsText = text("units")
    const units =
      typeof rawUnits === "number"
        ? rawUnits
        : /^\d+([.,]\d+)?$/.test(unitsText)
          ? Number(unitsText.replace(",", "."))
          : null
    if (units != null && units <= 0)
      fail("Interest Insured harus angka lebih dari 0.")

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
            `Interest Insured wajib diisi jumlah container (angka) untuk rate ${rate.label.trim()} (${openCoverRateText(rate, ctx.currency)}).`
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
      fail(`Assured Name maksimal ${LIMITS.insuredName} karakter.`)

    const rawAdmin = cellValue(get("adminFee"))
    const adminFee = parseParticipantAmount(rawAdmin)
    const adminFilled = rawAdmin != null && rawAdmin !== ""
    if (adminFilled && (adminFee == null || adminFee < 0))
      fail("Admin Fee harus angka 0 atau lebih.")

    if (errors.length > before) {
      failed += 1
      return
    }
    declarations.push({
      row: excelRow,
      policyNo,
      inceptionDate: date!,
      sumInsured: value!,
      premium:
        (rate
          ? rate.basis === "per_unit"
            ? units != null && units > 0
              ? openCoverPremium(rate, units)
              : null
            : openCoverPremium(rate, value!)
          : null) ?? premium,
      clientPremium: premiumFilled ? premium : null,
      rateLabel: rate ? rate.label.trim() : null,
      units: rate?.basis === "per_unit" ? units : null,
      insuredName: insuredName || null,
      adminFee:
        adminFilled && adminFee != null
          ? Math.round(adminFee * 100) / 100
          : null,
      remarks:
        shipmentRemarks(text, readDate(rawEtd, swapEtd)).slice(
          0,
          LIMITS.remarks
        ) || null,
    })
  })

  // Kesalahan tingkat file menahan seluruh upload; kesalahan per baris hanya menahan baris itu.
  const fileErrors: string[] = []
  if (filled > DECLARATION_IMPORT_LIMIT)
    fileErrors.push(
      `Maksimal ${DECLARATION_IMPORT_LIMIT.toLocaleString("id-ID")} deklarasi baru per file. Pecah file menjadi beberapa upload.`
    )
  // Semua baris sudah tercatat bukan kesalahan: tidak ada yang perlu diperbaiki atau disimpan.
  if (!declarations.length && !errors.length && !skipped.length)
    fileErrors.push("Tidak ada deklarasi di file.")
  return {
    declarations: fileErrors.length ? [] : declarations,
    skipped,
    swappedDates,
    /** MOC No. di file yang berbeda dari no. polis MOP; ditampilkan sebagai peringatan. */
    otherMocNos: [...otherMocNos],
    /** Kesalahan per baris ("Baris N: ...") lalu kesalahan tingkat file. */
    errors: [...errors, ...fileErrors],
    fileErrors,
    /** Baris berisi yang dibaca, termasuk yang dilewati dan yang gagal. */
    read: filled + skipped.length,
    /** Baris yang gagal dan tidak ikut disimpan. */
    failed,
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
    text("units") && `Interest Insured: ${text("units")}`,
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
  const widths: Partial<Record<ColumnKey, number>> = {
    insured: 40,
    goods: 50,
    remarks: 40,
    rate: 30,
    from: 24,
    to: 24,
    vessel: 22,
  }
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({
    header: c.required ? `${c.title}*` : c.title,
    key: c.key,
    width: widths[c.key] ?? 16,
  }))
  ws.getRow(1).font = { bold: true }
  for (const key of ["date", "etd"] as const)
    ws.getColumn(key).numFmt = "dd/mm/yyyy"
  for (const key of ["value", "premium", "adminFee"] as const)
    ws.getColumn(key).numFmt = "#,##0.00"
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
    "Kolom sheet Deklarasi sama dengan General Marine Report dari asuransi, jadi barisnya bisa disalin langsung. Laporannya juga bisa diupload langsung (simpan dulu sebagai .xlsx).",
    "Isi satu sertifikat per baris, mulai baris 2. Kolom bertanda * wajib diisi.",
    "Date of Issue dan ETD: DD/MM/YYYY, misalnya 05/12/2026. Date of Issue menentukan bulan produksi dan harus di dalam periode polis MOP.",
    "Sum Insured, Gross Premium, dan Admin Fee: angka tanpa mata uang, misalnya 1000000000.",
    `Currency: kosongkan atau isi ${info.currency}, sama dengan mata uang polis MOP.`,
    "Gross Premium: premi tagihan ke klien (rate polis Merimen). Premi ke asuransi dihitung dari Kategori Rate MOP (dropdown, daftarnya di sheet Rate); selisihnya margin. Kosongkan bila premi ke klien belum diketahui.",
    ...(perUnit
      ? [
          "Interest Insured: jumlah container (angka), misalnya 3. Wajib untuk rate per container.",
        ]
      : [
          "Interest Insured: jumlah container, misalnya 3; dicatat di keterangan deklarasi.",
        ]),
    'Assured Name: isi bila sertifikat atas nama lain, misalnya "... QQ ..."; kosong berarti ikut polis MOP.',
    "Description of Goods, Interest Insured, Conv, Vessel Name, Voyage No, ETD, From, To, Internal Ref No., Invoice No., B/L No., dan Keterangan disimpan sebagai keterangan deklarasi. Admin Fee disimpan sebagai biaya admin, tidak menambah premi produksi.",
    `Maksimal ${DECLARATION_IMPORT_LIMIT.toLocaleString("id-ID")} baris per file. Cert No. yang sudah tercatat di polis MOP ini dilewati, jadi file yang sama boleh diupload ulang.`,
    "File sertifikat diunggah per deklarasi lewat menu Berkas polis.",
  ])
    help.addRow([line])
  help.getRow(1).font = { bold: true }
  return ws
}
