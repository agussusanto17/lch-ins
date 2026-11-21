/**
 * Laporan Reserve Basis bulanan dari template Team LCH (20 November 2026, sheet "08" "LAP. RESERVE
 * BASIS AGUSTUS 2026"): per insured, pendapatan (COMM, COMM VIA INTERCO, EF, O/I-MARGIN,
 * O/I-SPONSORSHIP) dan beban marketing, lalu reserve 40% pendapatan dikurangi beban.
 *
 * Pendapatan diambil dari Rekap Produksi. Beban dan sponsorship belum dicatat di sistem, jadi
 * kolomnya kosong untuk diisi di Excel; total, reserve, pembulatan, dan persentase berupa rumus
 * sehingga ikut berubah. Tanda mengikuti rekap LCH: pendapatan negatif, beban positif.
 */
import type { Workbook, Worksheet } from "exceljs"

import { FX, roundCents } from "./calc"
import { dateShort, monthLabel } from "./format"
import { recapIncome, type RecapPolicy } from "./production-recap"

/** Batas beban + reserve terhadap pendapatan (header "MAX 40 %" template). */
export const RESERVE_PCT = 0.4
/** Source yang komisinya diterima lewat LCH Singapura (intercompany). */
export const INTERCO_SOURCE = "LCH-SG"

export interface ReserveRow {
  account: string
  commission: number
  commissionInterco: number
  fee: number
  margin: number
}

export interface ReserveMonth {
  /** "YYYY-MM" */
  month: string
  rows: ReserveRow[]
}

/** Total pendapatan satu baris (kolom TOTAL revenue). */
export const reserveRevenue = (r: ReserveRow) =>
  roundCents(r.commission + r.commissionInterco + r.fee + r.margin)

/** Reserve dibulatkan ke juta ke arah nol, seperti kolom ROUNDING template (ROUNDDOWN(x, -6)). */
export const reserveRounding = (reserve: number) => Math.trunc(reserve / 1_000_000) * 1_000_000 || 0

/** Pendapatan per bulan produksi per akun; bulan urut naik, akun urut nama. */
export function reserveBasis(
  policies: RecapPolicy[],
  fx: Record<string, number> = FX
): ReserveMonth[] {
  const months = new Map<string, Map<string, ReserveRow>>()
  for (const income of recapIncome(policies, fx)) {
    let accounts = months.get(income.month)
    if (!accounts) {
      accounts = new Map()
      months.set(income.month, accounts)
    }
    let row = accounts.get(income.account)
    if (!row) {
      row = { account: income.account, commission: 0, commissionInterco: 0, fee: 0, margin: 0 }
      accounts.set(income.account, row)
    }
    if (income.sourceCode === INTERCO_SOURCE) row.commissionInterco += income.commission
    else row.commission += income.commission
    row.fee += income.fee
    row.margin += income.margin
  }
  return [...months]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, accounts]) => ({
      month,
      rows: [...accounts.values()]
        .map((r) => ({
          account: r.account,
          commission: roundCents(r.commission),
          commissionInterco: roundCents(r.commissionInterco),
          fee: roundCents(r.fee),
          margin: roundCents(r.margin),
        }))
        .sort((a, b) => a.account.localeCompare(b.account)),
    }))
}

const MONEY_FMT = "#,##0"
const PCT_FMT = "0.00%"
const PINK = "FFFFCCFF"
const YELLOW = "FFFFFF00"

const HEADERS = [
  "INSURED",
  "COMM",
  "COMM VIA INTERCO",
  "EF",
  "O/I-MARGIN",
  "O/I-SPONSORSHIP",
  "TOTAL",
  "MARKETING EXP-COMM",
  "MARKETING EXP-CASHBACK",
  "MARKETING EXP-DISCOUNT",
  "MARKETING EXP-REFERRAL FEE",
  "MARKETING EXP-PREMI BEBAN LCH",
  "TOTAL",
  "%",
  "RESERVE",
  "ROUNDING",
  "TOTAL BEBAN + RESERVE",
  "%",
] as const

/** Huruf rumus di bawah header, ditulis seperti template (nilai absolut). */
const LEGEND = [
  "",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F = A+B+C+D+E",
  "G",
  "G",
  "G",
  "G",
  "G",
  "H = jumlah G",
  "I = H/F",
  "J = F×40% − H",
  "K = J dibulatkan",
  "L = K+H",
  "M = L/F",
] as const

/** Kolom B sampai S seperti template; kolom A dibiarkan kosong. */
const COL = (i: number) => String.fromCharCode("B".charCodeAt(0) + i)

export const RESERVE_NOTES = [
  "Pendapatan dari Rekap Produksi bulan ini (tanggal mulai polis), dikelompokkan per Grouping Insured, dalam IDR dengan kurs tetap report. Pendapatan ditulis negatif dan beban positif.",
  "COMM VIA INTERCO: komisi polis dengan Source LCH-SG (LCH Insurance Brokers Pte Ltd). O/I-MARGIN: margin rate deklarasi MOP, nilai gross sebelum cashback.",
  "O/I-SPONSORSHIP dan kolom EXPENSES belum dicatat di sistem. Isi langsung di file ini; TOTAL, %, RESERVE, ROUNDING, dan TOTAL BEBAN + RESERVE ikut terhitung ulang.",
  "RESERVE = 40% TOTAL revenue − TOTAL expenses (rumus sel: H×40% + N karena pendapatan negatif). Template Team LCH menulis + M (premi beban LCH), tetapi angka ROUNDING di contohnya cocok dengan TOTAL expenses (N), jadi rumus memakai N.",
  "ROUNDING: RESERVE dibulatkan ke juta ke arah nol. TOTAL BEBAN + RESERVE = ROUNDING + TOTAL expenses; persentasenya maksimal 40% dari revenue.",
] as const

function fill(ws: Worksheet, range: string[], argb: string) {
  for (const ref of range) {
    ws.getCell(ref).fill = { type: "pattern", pattern: "solid", fgColor: { argb } }
  }
}

function writeMonth(ws: Worksheet, data: ReserveMonth, printedOn: string) {
  const [year, month] = data.month.split("-").map(Number)
  ws.getColumn("A").width = 3
  ws.getColumn("B").width = 36
  for (let i = 1; i < HEADERS.length; i++) {
    const header = HEADERS[i]
    ws.getColumn(COL(i)).width = header === "%" ? 9 : 17
  }
  ws.getCell("B2").value = "PT LCH INSURANCE BROKERS"
  ws.getCell("B3").value = "LAP. RESERVE BASIS"
  ws.getCell("B4").value = monthLabel(month - 1, year).toUpperCase()
  ws.getCell("F4").value = "Gross"
  for (const ref of ["B2", "B3", "B4"]) ws.getCell(ref).font = { bold: true }

  ws.mergeCells("C6:H6")
  ws.getCell("C6").value = "REVENUE"
  ws.mergeCells("I6:O6")
  ws.getCell("I6").value = "EXPENSES"
  ws.mergeCells("R6:S6")
  ws.getCell("R6").value = "MAX 40 %"
  HEADERS.forEach((header, i) => {
    ws.getCell(`${COL(i)}7`).value = header
    ws.getCell(`${COL(i)}8`).value = LEGEND[i] || null
  })
  for (const row of [6, 7, 8]) {
    ws.getRow(row).font = { bold: true }
    ws.getRow(row).alignment = { horizontal: "center", vertical: "middle", wrapText: true }
  }
  ws.getRow(7).height = 32
  const headerCells = (from: number, to: number) =>
    [6, 7, 8].flatMap((r) => Array.from({ length: to - from + 1 }, (_, i) => `${COL(from + i)}${r}`))
  fill(ws, headerCells(0, 13), PINK)
  fill(ws, headerCells(14, 17), YELLOW)

  const first = 9
  data.rows.forEach((r, i) => {
    const n = first + i
    const revenue = reserveRevenue(r)
    const reserve = roundCents(revenue * RESERVE_PCT)
    const rounding = reserveRounding(reserve)
    const row = ws.getRow(n)
    row.getCell("B").value = r.account
    row.getCell("C").value = r.commission
    row.getCell("D").value = r.commissionInterco
    row.getCell("E").value = r.fee
    row.getCell("F").value = r.margin
    row.getCell("H").value = { formula: `SUM(C${n}:G${n})`, result: revenue }
    row.getCell("N").value = { formula: `SUM(I${n}:M${n})`, result: 0 }
    row.getCell("O").value = { formula: `IF(H${n}=0,0,N${n}/H${n})`, result: 0 }
    row.getCell("P").value = { formula: `H${n}*40%+N${n}`, result: reserve }
    row.getCell("Q").value = { formula: `ROUNDDOWN(P${n},-6)`, result: rounding }
    row.getCell("R").value = { formula: `Q${n}-N${n}`, result: rounding }
    row.getCell("S").value = {
      formula: `IF(H${n}=0,0,R${n}/H${n})`,
      result: revenue ? rounding / revenue : 0,
    }
  })

  const last = first + data.rows.length - 1
  const total = last + 1
  const totals = ws.getRow(total)
  totals.getCell("B").value = "TOTAL"
  const sum = (key: keyof Omit<ReserveRow, "account">) =>
    roundCents(data.rows.reduce((s, r) => s + r[key], 0))
  const totalRevenue = roundCents(data.rows.reduce((s, r) => s + reserveRevenue(r), 0))
  const totalRounding = data.rows.reduce(
    (s, r) => s + reserveRounding(roundCents(reserveRevenue(r) * RESERVE_PCT)),
    0
  )
  const results: Record<string, number> = {
    C: sum("commission"),
    D: sum("commissionInterco"),
    E: sum("fee"),
    F: sum("margin"),
    G: 0,
    H: totalRevenue,
    I: 0,
    J: 0,
    K: 0,
    L: 0,
    M: 0,
    N: 0,
    P: roundCents(totalRevenue * RESERVE_PCT),
    Q: totalRounding,
    R: totalRounding,
  }
  for (const [col, result] of Object.entries(results)) {
    totals.getCell(col).value = { formula: `SUM(${col}${first}:${col}${last})`, result }
  }
  totals.getCell("O").value = { formula: `IF(H${total}=0,0,N${total}/H${total})`, result: 0 }
  totals.getCell("S").value = {
    formula: `IF(H${total}=0,0,R${total}/H${total})`,
    result: totalRevenue ? totalRounding / totalRevenue : 0,
  }
  totals.font = { bold: true }

  for (let r = first; r <= total; r++) {
    for (let i = 1; i < HEADERS.length; i++) {
      ws.getCell(`${COL(i)}${r}`).numFmt = HEADERS[i] === "%" ? PCT_FMT : MONEY_FMT
    }
  }
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 8 }]

  const notes = [...RESERVE_NOTES, `Dibuat ${dateShort(printedOn)}.`]
  notes.forEach((text, i) => {
    ws.getCell(`B${total + 3 + i}`).value = text
  })
}

/**
 * Workbook Reserve Basis: satu sheet per bulan. Nama sheet nomor bulan seperti template ("08"),
 * atau "2026-08" bila periodenya lintas tahun.
 */
export function fillReserveBasis(wb: Workbook, months: readonly ReserveMonth[], printedOn: string) {
  const years = new Set(months.map((m) => m.month.slice(0, 4)))
  for (const data of months) {
    const name = years.size > 1 ? data.month : data.month.slice(5)
    writeMonth(wb.addWorksheet(name), data, printedOn)
  }
}
