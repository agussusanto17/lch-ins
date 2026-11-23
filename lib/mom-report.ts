/**
 * Laporan MOM bulanan dari template Team LCH (Harry lewat Agus, 23 November 2026, "Contoh Format
 * Laporan MOM.xlsx", sheet "Format Lap MOM"). Laporan ini dipakai di meeting bulanan direksi dengan
 * LCH Singapore dan disiapkan Finance. Isinya bisnis LCH Indonesia dan LCH Singapore per bulan,
 * tahun laporan dibanding tahun sebelumnya.
 *
 * Bisnis dipisah per Source polis, sama dengan kolom source Rekap Produksi: LCH-SG = LCH Singapore,
 * Source lain = LCH Indonesia. Angka diambil dari Rekap Produksi (brokerage dan EF sebelum PPN, IDR
 * kurs report). Pendapatan dan beban ditulis positif, karena NET template = pendapatan − beban. Kolom
 * yang belum dicatat di sistem dibiarkan kosong untuk diisi di Excel; total dan NET berupa rumus.
 */
import type { Workbook, Worksheet } from "exceljs"

import { FX, roundCents } from "./calc"
import { BRANCH_SOURCE_CODES } from "./form-options"
import { dateShort } from "./format"
import { recapIncome, type RecapPolicy } from "./production-recap"

/** Source bisnis LCH Singapore (LCH Insurance Brokers Pte Ltd). */
export const SG_SOURCE = BRANCH_SOURCE_CODES.Singapore
/** Kode Sub akun EF "EF (MAG)" di Master Data; asuransinya dihitung sebagai MAG. */
export const MAG_FEE_SUB_ACCOUNT = "ef_mag"

/** Satu bulan bisnis LCH Indonesia. Kolom template yang belum dicatat sistem tidak ada di sini. */
export interface MomIndonesiaMonth {
  /** a: komisi + EF semua asuransi. */
  brokerage: number
  /** b: margin deklarasi MOP. */
  margin: number
  /** e: sharing komisi ke LCH Singapore. */
  commissionExpense: number
}

/** Satu bulan bisnis LCH Singapore: hanya brokerage (komisi + EF). */
export interface MomSingaporeMonth {
  /** a: komisi dari asuransi MAG. */
  magCommission: number
  /** b: EF dari asuransi MAG. */
  magFee: number
  /** c: komisi + EF dari asuransi selain MAG. */
  others: number
}

export interface MomYear {
  year: number
  /** Urutan sama dengan `MomReport.months`. */
  indonesia: MomIndonesiaMonth[]
  singapore: MomSingaporeMonth[]
}

export interface MomReport {
  /** Bulan laporan 1–12, dari bulan tanggal mulai sampai bulan tanggal akhir. */
  months: number[]
  current: MomYear
  previous: MomYear
}

/** Tanggal yang sama tahun sebelumnya; 29 Februari menjadi 28 Februari. */
export function previousYearDate(iso: string) {
  const monthDay = iso.slice(5, 10) === "02-29" ? "02-28" : iso.slice(5, 10)
  return `${Number(iso.slice(0, 4)) - 1}-${monthDay}`
}

/** Bulan laporan dari periode dalam satu tahun kalender. */
export function momMonths(start: string, end: string) {
  const first = Number(start.slice(5, 7))
  const last = Number(end.slice(5, 7))
  return Array.from({ length: last - first + 1 }, (_, i) => first + i)
}

function momYear(
  year: number,
  months: readonly number[],
  policies: RecapPolicy[],
  fx: Record<string, number>
): MomYear {
  const indonesia = months.map(() => ({ brokerage: 0, margin: 0, commissionExpense: 0 }))
  const singapore = months.map(() => ({ magCommission: 0, magFee: 0, others: 0 }))
  // Rekap Produksi menulis pendapatan negatif; di sini dibalik menjadi positif.
  for (const line of recapIncome(policies, fx)) {
    const i = months.indexOf(Number(line.month.slice(5, 7)))
    if (Number(line.month.slice(0, 4)) !== year || i < 0) continue
    if (line.sourceCode === SG_SOURCE) {
      const sg = singapore[i]
      if (line.feeSubAccountCode === MAG_FEE_SUB_ACCOUNT) {
        sg.magCommission -= line.commission
        sg.magFee -= line.fee
      } else {
        sg.others -= line.commission + line.fee
      }
    } else {
      const id = indonesia[i]
      id.brokerage -= line.commission + line.fee
      id.margin -= line.margin
      id.commissionExpense += line.sgShare
    }
  }
  return {
    year,
    indonesia: indonesia.map((m) => ({
      brokerage: roundCents(m.brokerage),
      margin: roundCents(m.margin),
      commissionExpense: roundCents(m.commissionExpense),
    })),
    singapore: singapore.map((m) => ({
      magCommission: roundCents(m.magCommission),
      magFee: roundCents(m.magFee),
      others: roundCents(m.others),
    })),
  }
}

/**
 * Angka Laporan MOM. `current` berisi polis periode laporan, `previous` polis tanggal yang sama
 * tahun sebelumnya (lihat `previousYearDate`).
 */
export function momReport(
  current: RecapPolicy[],
  previous: RecapPolicy[],
  period: { start: string; end: string },
  fx: Record<string, number> = FX
): MomReport {
  const months = momMonths(period.start, period.end)
  const year = Number(period.start.slice(0, 4))
  return {
    months,
    current: momYear(year, months, current, fx),
    previous: momYear(year - 1, months, previous, fx),
  }
}

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

const INDONESIA_HEADERS = [
  "COMM+EF(MAG) + COMM VIA INTERCO",
  "O/I MARGIN",
  "O/I SPONSORSHIP",
  "TOTAL INCOME",
  "COMM EXPENSES",
  "MARKETING EXP-CASHBACK",
  "MARKETING EXP-REFERRAL FEE",
  "MARKETING EXP-DISCOUNT",
  "MARKETING EXP-PREMI BEBAN LCH",
  "TOTAL EXPENSES",
  "NET",
] as const
const INDONESIA_LEGEND = ["a", "b", "c", "d=a+b+c", "e", "f", "g", "h", "i", "j=e+f+g+h+i", "k=d-j"]

const SINGAPORE_HEADERS = ["COMM + COMM VIA INTERCO (MAG)", "EF SG(MAG)", "OTHERS", "TOTAL"] as const
const SINGAPORE_LEGEND = ["a", "b", "c", "d=a+b+c"]

/** Kolom pertama blok tahun laporan dan tahun pembanding (B dan N, B dan F seperti template). */
const ID_CURRENT = 2
const ID_PREVIOUS = 14
const SG_CURRENT = 2
const SG_PREVIOUS = 6

/** Warna template: aksen tema Office dengan terang 80%, kuning untuk tabel comparative. */
const COLOR = {
  year: "FFF2CFEE",
  income: "FFCAEEFB",
  expense: "FFD9F2D0",
  net: "FFFBE3D6",
  singapore: "FFC1E5F5",
  comparative: "FFFFFF00",
} as const

const MONEY_FMT = "#,##0"

type Formula = { formula: string; result: number }
type MoneyValue = number | Formula | null

/** Huruf kolom 1–26; laporan ini paling jauh kolom X. */
const col = (n: number) => String.fromCharCode(64 + n)

const resultOf = (v: MoneyValue) => (v == null ? 0 : typeof v === "number" ? v : v.result)

function money(ws: Worksheet, ref: string, value: MoneyValue) {
  const cell = ws.getCell(ref)
  cell.value = value
  // Sel kosong tetap berformat uang supaya angka yang diketik Finance rapi.
  cell.numFmt = MONEY_FMT
}

function paint(ws: Worksheet, refs: readonly string[], argb: string) {
  for (const ref of refs) {
    ws.getCell(ref).fill = { type: "pattern", pattern: "solid", fgColor: { argb } }
  }
}

/** Garis tipis di semua sel area tabel. */
function box(ws: Worksheet, top: number, left: number, bottom: number, right: number) {
  const thin = { style: "thin" as const }
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      ws.getCell(r, c).border = { top: thin, left: thin, bottom: thin, right: thin }
    }
  }
}

function header(ws: Worksheet, ref: string, text: string | number, argb?: string) {
  const cell = ws.getCell(ref)
  cell.value = text
  cell.font = { bold: true }
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
  if (argb) paint(ws, [ref], argb)
}

function merged(ws: Worksheet, range: string, text: string | number, argb?: string) {
  ws.mergeCells(range)
  header(ws, range.split(":")[0], text, argb)
}

/** Nama bulan di kolom A dan baris TOTAL di bawahnya. */
function monthLabels(ws: Worksheet, months: readonly number[], first: number) {
  months.forEach((m, i) => {
    ws.getCell(`A${first + i}`).value = MONTHS_EN[m - 1]
  })
  const total = ws.getCell(`A${first + months.length}`)
  total.value = "TOTAL"
  total.font = { bold: true }
}

/**
 * Blok satu tahun LCH Indonesia (11 kolom a–k), satu baris per bulan, lalu TOTAL yang menjumlah
 * tiap kolom, termasuk kolom isian manual.
 */
function writeIndonesia(ws: Worksheet, startCol: number, months: MomIndonesiaMonth[], first: number) {
  const c = (i: number) => col(startCol + i)
  const sums = new Array<number>(INDONESIA_HEADERS.length).fill(0)
  months.forEach((m, i) => {
    const r = first + i
    const income = roundCents(m.brokerage + m.margin)
    const values: MoneyValue[] = [
      m.brokerage,
      m.margin,
      null, // c: O/I SPONSORSHIP belum dicatat di sistem.
      { formula: `SUM(${c(0)}${r}:${c(2)}${r})`, result: income },
      m.commissionExpense,
      null, // f–i: beban marketing belum dicatat di sistem.
      null,
      null,
      null,
      { formula: `SUM(${c(4)}${r}:${c(8)}${r})`, result: m.commissionExpense },
      { formula: `${c(3)}${r}-${c(9)}${r}`, result: roundCents(income - m.commissionExpense) },
    ]
    values.forEach((v, j) => {
      money(ws, `${c(j)}${r}`, v)
      sums[j] += resultOf(v)
    })
  })
  const t = first + months.length
  sums.forEach((sum, j) => {
    money(ws, `${c(j)}${t}`, { formula: `SUM(${c(j)}${first}:${c(j)}${t - 1})`, result: roundCents(sum) })
  })
  paint(
    ws,
    Array.from({ length: months.length + 1 }, (_, i) => `${c(10)}${first + i}`),
    COLOR.net
  )
}

/** Blok satu tahun LCH Singapore (4 kolom a–d), satu baris per bulan, lalu TOTAL. */
function writeSingapore(ws: Worksheet, startCol: number, months: MomSingaporeMonth[], first: number) {
  const c = (i: number) => col(startCol + i)
  const sums = new Array<number>(SINGAPORE_HEADERS.length).fill(0)
  months.forEach((m, i) => {
    const r = first + i
    const values: MoneyValue[] = [
      m.magCommission,
      m.magFee,
      m.others,
      {
        formula: `SUM(${c(0)}${r}:${c(2)}${r})`,
        result: roundCents(m.magCommission + m.magFee + m.others),
      },
    ]
    values.forEach((v, j) => {
      money(ws, `${c(j)}${r}`, v)
      sums[j] += resultOf(v)
    })
  })
  const t = first + months.length
  sums.forEach((sum, j) => {
    money(ws, `${c(j)}${t}`, { formula: `SUM(${c(j)}${first}:${c(j)}${t - 1})`, result: roundCents(sum) })
  })
}

/** Teks keterangan template, ejaan "PENDATAPAN" dibetulkan. */
export const MOM_TEMPLATE_NOTES = {
  indonesia:
    "KETERANGAN : SOURCE JAKARTA ANGKA YANG DIBUTUHKAN PADA TAMPILAN PPT UNTUK MOM MERUPAKAN NET SETELAH SELURUH UNSUR PENDAPATAN DIKURANGI BEBAN",
  mag: "MAG = MERUPAKAN BROKERAGE (KOMISI+EF)",
  others: "OTHERS = MERUPAKAN BROKERAGE SELAIN MAG (KOMISI+EF)",
  singapore: "KETERANGAN : SOURCE SINGAPORE ANGKA YANG DIBUTUHKAN HANYA BROKERAGE (COMM+EF SG).",
} as const

/** Penjelasan sumber angka di sheet Keterangan. */
export const MOM_NOTES = [
  "Bisnis dipisah per Source polis, sama dengan kolom source Rekap Produksi: Source LCH-SG (LCH Insurance Brokers Pte Ltd) masuk LCH SINGAPORE BUSINESS, Source lain (LCH-ID, PT. LCH Insurance Brokers) masuk LCH INDONESIA BUSINESS. Slip tanpa Source memakai Source cabang kliennya.",
  "Angka sama dengan Rekap Produksi periode yang sama (tanggal mulai polis): IDR dengan kurs tetap report, brokerage dan EF sebelum PPN. Rekap Produksi menulis pendapatan negatif; laporan ini menulis pendapatan dan beban positif, NET = TOTAL INCOME − TOTAL EXPENSES.",
  "LCH Indonesia, a (COMM+EF(MAG) + COMM VIA INTERCO): komisi dan EF semua asuransi (sub akun EF dan EF (MAG)). Komisi dari LCH Singapore lewat interco yang tidak dicatat sebagai polis di sistem perlu ditambahkan di sel ini.",
  "b (O/I MARGIN): margin deklarasi MOP, yaitu premi tagihan ke klien − premi ke asuransi.",
  "e (COMM EXPENSES): sharing komisi ke LCH Singapore (isian Sharing Komisi LCH Singapore di placing slip atau polis). Beban komisi lain belum dicatat di sistem; tambahkan di sel ini.",
  "c (O/I SPONSORSHIP), f (CASHBACK), g (REFERRAL FEE), h (DISCOUNT), dan i (PREMI BEBAN LCH) belum dicatat di sistem, jadi kosong. Isi langsung di file ini; TOTAL INCOME, TOTAL EXPENSES, NET, TOTAL, dan tabel comparative ikut terhitung ulang.",
  "LCH Singapore: hanya brokerage (komisi + EF). MAG = asuransi dengan Sub akun EF \"EF (MAG)\" di Master Data > Asuransi & Adjuster (Multi Artha Guna). a = komisi asuransi MAG, b = EF asuransi MAG, c (OTHERS) = komisi + EF asuransi lain. Margin deklarasi MOP dan sharing komisi bisnis Singapore tidak ditulis.",
  "Bisnis yang hanya dicatat di sistem LCH Singapore tidak ada di laporan ini; tambahkan angkanya di bagian LCH SINGAPORE BUSINESS.",
  "Tahun pembanding memakai tanggal yang sama tahun sebelumnya, dan hanya berisi polis yang sudah dicatat di sistem.",
] as const

/**
 * Workbook Laporan MOM: sheet Laporan MOM (susunan template Team LCH) dan Keterangan. Rumus template
 * yang bergeser diluruskan: blok tahun pembanding memakai rumus yang sama dengan tahun laporan, dan
 * TOTAL Singapore = a+b+c.
 */
export function fillMomReport(
  wb: Workbook,
  report: MomReport,
  period: { start: string; end: string },
  printedOn: string
) {
  const ws = wb.addWorksheet("Laporan MOM")
  const { months, current, previous } = report
  const n = months.length
  const periodText =
    `Periode ${dateShort(period.start)} s/d ${dateShort(period.end)} dibanding ` +
    `${dateShort(previousYearDate(period.start))} s/d ${dateShort(previousYearDate(period.end))}, ` +
    "berdasarkan tanggal mulai polis."

  ws.getColumn("A").width = 14
  for (let c = 2; c <= 24; c++) ws.getColumn(c).width = 16
  ws.getColumn("M").width = 3
  ws.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  }

  ws.getCell("A1").value = "PT LCH INSURANCE BROKERS"
  ws.getCell("A1").font = { bold: true, size: 12 }
  ws.getCell("A2").value = "MANAGEMENT OF MEETING"
  ws.getCell("A3").value = periodText

  // LCH INDONESIA BUSINESS: judul baris 5, header baris 6–10, bulan mulai baris 11.
  const yearLabel = `${current.year} AS COMPARED TO ${previous.year}`
  ws.getCell("A5").value = `LCH INDONESIA BUSINESS ${yearLabel}`
  ws.getCell("A5").font = { bold: true }
  merged(ws, "B6:X6", "ACTUAL")
  for (const [startCol, year] of [
    [ID_CURRENT, current.year],
    [ID_PREVIOUS, previous.year],
  ] as const) {
    const c = (i: number) => col(startCol + i)
    merged(ws, `${c(0)}7:${c(10)}7`, year, COLOR.year)
    merged(ws, `${c(0)}8:${c(3)}8`, "INCOME", COLOR.income)
    merged(ws, `${c(4)}8:${c(9)}8`, "EXPENSES", COLOR.expense)
    INDONESIA_HEADERS.forEach((text, i) => {
      const color = i < 4 ? COLOR.income : i < 10 ? COLOR.expense : COLOR.net
      header(ws, `${c(i)}9`, text, color)
      header(ws, `${c(i)}10`, INDONESIA_LEGEND[i], i === 10 ? COLOR.net : undefined)
    })
  }
  header(ws, "A8", "MONTH")
  ws.getRow(9).height = 43.5
  const idFirst = 11
  monthLabels(ws, months, idFirst)
  writeIndonesia(ws, ID_CURRENT, current.indonesia, idFirst)
  writeIndonesia(ws, ID_PREVIOUS, previous.indonesia, idFirst)
  const idTotal = idFirst + n
  ws.getRow(idTotal).font = { bold: true }
  box(ws, 7, ID_CURRENT, idTotal, ID_CURRENT + 10)
  box(ws, 7, ID_PREVIOUS, idTotal, ID_PREVIOUS + 10)
  box(ws, 8, 1, idTotal, 1)

  // Comparative Indonesia untuk PPT: NET (k) per bulan.
  const netCurrent = col(ID_CURRENT + 10)
  const netPrevious = col(ID_PREVIOUS + 10)
  const cmpTitle = idTotal + 3
  ws.getCell(`A${cmpTitle}`).value = "COMPARATIVE PRODUKSI LCH INDONESIA"
  ws.getCell(`A${cmpTitle}`).font = { bold: true }
  paint(ws, [`A${cmpTitle}`], COLOR.comparative)
  const cmpHead = cmpTitle + 2
  header(ws, `A${cmpHead}`, "MONTH", COLOR.comparative)
  header(ws, `B${cmpHead}`, current.year, COLOR.comparative)
  header(ws, `C${cmpHead}`, previous.year, COLOR.comparative)
  header(ws, `A${cmpHead + 1}`, "", COLOR.comparative)
  header(ws, `B${cmpHead + 1}`, "NET (k=d-j)", COLOR.comparative)
  header(ws, `C${cmpHead + 1}`, "NET (k=d-j)", COLOR.comparative)
  const cmpFirst = cmpHead + 2
  monthLabels(ws, months, cmpFirst)
  for (let i = 0; i <= n; i++) {
    const source = idFirst + i
    const pick = (y: MomYear) =>
      i < n
        ? roundCents(y.indonesia[i].brokerage + y.indonesia[i].margin - y.indonesia[i].commissionExpense)
        : roundCents(
            y.indonesia.reduce((s, m) => s + m.brokerage + m.margin - m.commissionExpense, 0)
          )
    money(ws, `B${cmpFirst + i}`, { formula: `${netCurrent}${source}`, result: pick(current) })
    money(ws, `C${cmpFirst + i}`, { formula: `${netPrevious}${source}`, result: pick(previous) })
  }
  const cmpTotal = cmpFirst + n
  ws.getRow(cmpTotal).font = { bold: true }
  box(ws, cmpHead, 1, cmpTotal, 3)
  const idNote = cmpTotal + 2
  ws.getCell(`A${idNote}`).value = MOM_TEMPLATE_NOTES.indonesia
  ws.getCell(`A${idNote}`).font = { bold: true }

  // LCH SINGAPORE BUSINESS.
  const sgTitle = idNote + 5
  ws.getCell(`A${sgTitle}`).value = `LCH SINGAPORE BUSINESS ${yearLabel}`
  ws.getCell(`A${sgTitle}`).font = { bold: true }
  const sgYear = sgTitle + 2
  for (const [startCol, year] of [
    [SG_CURRENT, current.year],
    [SG_PREVIOUS, previous.year],
  ] as const) {
    const c = (i: number) => col(startCol + i)
    merged(ws, `${c(0)}${sgYear}:${c(3)}${sgYear}`, year)
    merged(ws, `${c(0)}${sgYear + 1}:${c(3)}${sgYear + 1}`, "INCOME", COLOR.income)
    SINGAPORE_HEADERS.forEach((text, i) => {
      header(ws, `${c(i)}${sgYear + 2}`, text, COLOR.singapore)
      header(ws, `${c(i)}${sgYear + 3}`, SINGAPORE_LEGEND[i])
    })
  }
  header(ws, `A${sgYear + 2}`, "MONTH")
  ws.getRow(sgYear + 2).height = 43.5
  const sgFirst = sgYear + 4
  monthLabels(ws, months, sgFirst)
  writeSingapore(ws, SG_CURRENT, current.singapore, sgFirst)
  writeSingapore(ws, SG_PREVIOUS, previous.singapore, sgFirst)
  const sgTotal = sgFirst + n
  ws.getRow(sgTotal).font = { bold: true }
  box(ws, sgYear, SG_CURRENT, sgTotal, SG_PREVIOUS + 3)
  box(ws, sgYear + 2, 1, sgTotal, 1)

  // Comparative Singapore untuk PPT: MAG = a+b, OTHERS = c. Judul template tertulis "LCH
  // INDONESIA", padahal catatannya untuk source bisnis Singapore.
  const sgCmpTitle = sgTotal + 3
  ws.getCell(`A${sgCmpTitle}`).value = "COMPARATIVE PRODUKSI LCH SINGAPORE"
  ws.getCell(`A${sgCmpTitle}`).font = { bold: true }
  paint(ws, [`A${sgCmpTitle}`], COLOR.comparative)
  const sgCmpHead = sgCmpTitle + 2
  header(ws, `A${sgCmpHead}`, "MONTH", COLOR.comparative)
  merged(ws, `B${sgCmpHead}:D${sgCmpHead}`, current.year, COLOR.comparative)
  merged(ws, `E${sgCmpHead}:G${sgCmpHead}`, previous.year, COLOR.comparative)
  header(ws, `A${sgCmpHead + 1}`, "", COLOR.comparative)
  ;["MAG", "OTHERS", "TOTAL", "MAG", "OTHERS", "TOTAL"].forEach((text, i) => {
    header(ws, `${col(2 + i)}${sgCmpHead + 1}`, text, COLOR.comparative)
  })
  const sgCmpFirst = sgCmpHead + 2
  monthLabels(ws, months, sgCmpFirst)
  for (let i = 0; i <= n; i++) {
    const r = sgCmpFirst + i
    const source = sgFirst + i
    for (const [startCol, out, y] of [
      [SG_CURRENT, 2, current],
      [SG_PREVIOUS, 5, previous],
    ] as const) {
      const c = (k: number) => col(startCol + k)
      const rows = i < n ? [y.singapore[i]] : y.singapore
      const mag = roundCents(rows.reduce((s, m) => s + m.magCommission + m.magFee, 0))
      const others = roundCents(rows.reduce((s, m) => s + m.others, 0))
      money(ws, `${col(out)}${r}`, { formula: `${c(0)}${source}+${c(1)}${source}`, result: mag })
      money(ws, `${col(out + 1)}${r}`, { formula: `${c(2)}${source}`, result: others })
      money(ws, `${col(out + 2)}${r}`, {
        formula: `SUM(${col(out)}${r}:${col(out + 1)}${r})`,
        result: roundCents(mag + others),
      })
    }
  }
  const sgCmpTotal = sgCmpFirst + n
  ws.getRow(sgCmpTotal).font = { bold: true }
  box(ws, sgCmpHead, 1, sgCmpTotal, 7)
  const sgNote = sgCmpTotal + 2
  ws.getCell(`A${sgNote}`).value = MOM_TEMPLATE_NOTES.mag
  ws.getCell(`A${sgNote + 1}`).value = MOM_TEMPLATE_NOTES.others
  ws.getCell(`A${sgNote + 4}`).value = MOM_TEMPLATE_NOTES.singapore
  ws.getCell(`A${sgNote + 4}`).font = { bold: true }

  const notes = wb.addWorksheet("Keterangan")
  notes.getColumn(1).width = 130
  notes.getCell("A1").value = "Keterangan Laporan MOM"
  notes.getCell("A1").font = { bold: true, size: 13 }
  notes.getCell("A2").value = `${periodText} Dibuat ${dateShort(printedOn)}.`
  MOM_NOTES.forEach((text, i) => {
    const cell = notes.getCell(`A${i + 4}`)
    cell.value = text
    cell.alignment = { wrapText: true, vertical: "top" }
  })
}
