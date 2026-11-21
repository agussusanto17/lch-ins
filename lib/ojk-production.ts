/**
 * Laporan produksi OJK triwulanan, Form LR 01 dan LR 02 (template Team LCH, 20 November 2026).
 * - LR 01: per lini usaha OJK dan lokasi penempatan: jumlah polis, premi, pendapatan jasa
 *   keperantaraan, dan persentase pendapatan terhadap premi.
 * - LR 02: per penanggung, lini usaha, dan lokasi penempatan.
 * Datanya sama dengan Rekap Produksi (polis yang mulai berlaku di periode), nilai dalam IDR
 * dengan kurs tetap report.
 */
import type { Workbook, Worksheet } from "exceljs"

import { FX, roundCents } from "./calc"
import { dateShort } from "./format"
import type { RecapPolicy } from "./production-recap"

/** Isian kosong di polis: lini usaha OJK atau lokasi penempatan belum dipilih. */
export const OJK_MISSING = "(belum diisi)"

export interface OjkRow {
  insurer?: string
  line: string
  location: string
  /** Polis Baru dan Renewal; endorsement, pembatalan, dan deklarasi hanya menambah premi. */
  policyCount: number
  premium: number
  /** Brokerage + additional fee (EF), dalam IDR. */
  income: number
}

export interface OjkProduction {
  lr01: OjkRow[]
  lr02: OjkRow[]
  /** Polis di periode yang lini usaha OJK atau lokasi penempatannya kosong. */
  missing: string[]
}

const countsAsPolicy = (p: RecapPolicy) => p.type === "Baru" || p.type === "Renewal"

/**
 * Kelompokkan polis periode ke LR 01 dan LR 02. Pendapatan jasa keperantaraan = brokerage +
 * additional fee (EF) dari premi sebelum diskon; margin rate MOP adalah pendapatan lain (O/I),
 * jadi tidak ikut.
 */
export function ojkProduction(
  policies: readonly RecapPolicy[],
  fx: Record<string, number> = FX
): OjkProduction {
  const lr01 = new Map<string, OjkRow & { policies: Set<string> }>()
  const lr02 = new Map<string, OjkRow & { policies: Set<string> }>()
  const missing = new Set<string>()
  const idr = (amount: number, currency: string) => amount * (fx[currency] ?? 1)

  for (const p of policies) {
    const line = p.cobOjkClass?.trim() || OJK_MISSING
    const location = p.placementLocation?.trim() || OJK_MISSING
    if (line === OJK_MISSING || location === OJK_MISSING) missing.add(p.policyNo)
    const insurers = p.insurers.length
      ? p.insurers
      : [{ insurer: OJK_MISSING, share: 100, additionalFeePct: 0 }]
    const premium = idr(p.premium, p.currency)
    const brokerage = (premium * p.brokeragePct) / 100

    const key01 = `${line}\u0000${location}`
    const row01 =
      lr01.get(key01) ??
      { line, location, policyCount: 0, premium: 0, income: 0, policies: new Set<string>() }
    row01.premium += premium
    row01.income += brokerage
    for (const ins of insurers) {
      const part = (premium * ins.share) / 100
      const fee = (part * (ins.additionalFeePct || 0)) / 100
      row01.income += fee

      const key02 = `${ins.insurer}\u0000${line}\u0000${location}`
      const row02 =
        lr02.get(key02) ??
        {
          insurer: ins.insurer,
          line,
          location,
          policyCount: 0,
          premium: 0,
          income: 0,
          policies: new Set<string>(),
        }
      row02.premium += part
      row02.income += (part * p.brokeragePct) / 100 + fee
      if (countsAsPolicy(p)) row02.policies.add(p.policyNo)
      lr02.set(key02, row02)
    }
    if (countsAsPolicy(p)) row01.policies.add(p.policyNo)
    lr01.set(key01, row01)
  }

  const finish = ({ policies: set, ...row }: OjkRow & { policies: Set<string> }): OjkRow => ({
    ...row,
    policyCount: set.size,
    premium: roundCents(row.premium),
    income: roundCents(row.income),
  })
  const byText = (a: string, b: string) => a.localeCompare(b, "id")
  return {
    lr01: [...lr01.values()]
      .map(finish)
      .sort((a, b) => byText(a.line, b.line) || byText(a.location, b.location)),
    lr02: [...lr02.values()]
      .map(finish)
      .sort(
        (a, b) =>
          byText(a.insurer ?? "", b.insurer ?? "") ||
          byText(a.line, b.line) ||
          byText(a.location, b.location)
      ),
    missing: [...missing].sort(byText),
  }
}

/** "LKTW III 2026" bila periode tepat satu triwulan, selain itu null. */
export function quarterLabel(start: string, end: string): string | null {
  const [y, m, d] = start.split("-").map(Number)
  if (d !== 1 || ![1, 4, 7, 10].includes(m)) return null
  const last = new Date(Date.UTC(y, m + 2, 0)).toISOString().slice(0, 10)
  if (end !== last) return null
  return `LKTW ${["I", "II", "III", "IV"][(m - 1) / 3]} ${y}`
}

// Workbook

const BORDER_COLOR = { argb: "FFBFBFBF" }
const BORDER = {
  top: { style: "thin" as const, color: BORDER_COLOR },
  left: { style: "thin" as const, color: BORDER_COLOR },
  bottom: { style: "thin" as const, color: BORDER_COLOR },
  right: { style: "thin" as const, color: BORDER_COLOR },
}
/** Hijau muda seperti template LR 01 dan LR 02 Team LCH. */
const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFA9EFC0" } }
const TOTAL_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF2F2F2" } }
const IDR_FMT = "#,##0"
const PCT_FMT = "0.00%"

type Cell = string | number | null

function writeTable(
  ws: Worksheet,
  startRow: number,
  headers: readonly string[],
  rows: readonly Cell[][],
  formats: readonly (string | null)[],
  total: Cell[]
) {
  const header = ws.getRow(startRow)
  headers.forEach((text, i) => {
    const cell = header.getCell(i + 1)
    cell.value = text
    cell.font = { bold: true }
    cell.fill = HEADER_FILL
    cell.border = BORDER
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  })
  ;[...rows, total].forEach((values, r) => {
    const row = ws.getRow(startRow + 1 + r)
    const isTotal = r === rows.length
    values.forEach((value, i) => {
      const cell = row.getCell(i + 1)
      cell.value = value
      cell.border = BORDER
      if (formats[i]) cell.numFmt = formats[i]!
      if (isTotal) {
        cell.font = { bold: true }
        cell.fill = TOTAL_FILL
      }
    })
  })
  return startRow + rows.length + 2
}

const share = (income: number, premium: number) => (premium ? income / premium : null)

function sum(rows: readonly OjkRow[], key: "policyCount" | "premium" | "income") {
  return roundCents(rows.reduce((s, r) => s + r[key], 0))
}

function writeIntro(ws: Worksheet, form: string, title: string, period: { start: string; end: string }) {
  const quarter = quarterLabel(period.start, period.end)
  ws.getCell("A1").value = quarter ?? "Laporan Produksi"
  ws.getCell("A1").font = { bold: true, size: 13 }
  ws.getCell("A3").value = form
  ws.getCell("A3").font = { bold: true, size: 14 }
  ws.getCell("A4").value = `${title}. Periode tanggal mulai polis ${dateShort(period.start)} s/d ${dateShort(period.end)}; nilai dalam IDR dengan kurs tetap report.`
}

/** Isi workbook laporan produksi OJK: sheet LR 01, LR 02, dan Rincian. */
export function fillOjkProduction(
  wb: Workbook,
  policies: readonly RecapPolicy[],
  period: { start: string; end: string },
  printedOn: string,
  fx: Record<string, number> = FX
) {
  const data = ojkProduction(policies, fx)

  const lr01 = wb.addWorksheet("LR 01")
  lr01.columns = [{ width: 34 }, { width: 14 }, { width: 20 }, { width: 22 }, { width: 26 }, { width: 22 }]
  writeIntro(lr01, "LR 01", "Produksi per lini usaha dan lokasi penempatan", period)
  let next = writeTable(
    lr01,
    6,
    ["Lini Usaha", "Jumlah Polis", "Lokasi Penempatan", "Premi", "Pendapatan Jasa Keperantaraan", "Persentase Pendapatan terhadap Premi"],
    data.lr01.map((r) => [r.line, r.policyCount, r.location, r.premium, r.income, share(r.income, r.premium)]),
    [null, "#,##0", null, IDR_FMT, IDR_FMT, PCT_FMT],
    [
      "Total",
      sum(data.lr01, "policyCount"),
      null,
      sum(data.lr01, "premium"),
      sum(data.lr01, "income"),
      share(sum(data.lr01, "income"), sum(data.lr01, "premium")),
    ]
  )
  next = writeNotes(lr01, next + 1, data.missing, printedOn)

  const lr02 = wb.addWorksheet("LR 02")
  lr02.columns = [{ width: 40 }, { width: 14 }, { width: 30 }, { width: 20 }, { width: 22 }, { width: 26 }, { width: 22 }]
  writeIntro(lr02, "LR 02", "Produksi per penanggung, lini usaha, dan lokasi penempatan", period)
  next = writeTable(
    lr02,
    6,
    ["Penanggung", "Jumlah Polis", "Lini Usaha", "Lokasi Penempatan", "Premi", "Pendapatan Jasa Keperantaraan", "Persentase Pendapatan terhadap Premi"],
    data.lr02.map((r) => [r.insurer ?? "", r.policyCount, r.line, r.location, r.premium, r.income, share(r.income, r.premium)]),
    [null, "#,##0", null, null, IDR_FMT, IDR_FMT, PCT_FMT],
    [
      "Total",
      sum(data.lr02, "policyCount"),
      null,
      null,
      sum(data.lr02, "premium"),
      sum(data.lr02, "income"),
      share(sum(data.lr02, "income"), sum(data.lr02, "premium")),
    ]
  )
  writeNotes(lr02, next + 1, data.missing, printedOn, [
    "Polis dengan beberapa penanggung (co-insurance) dihitung di setiap penanggungnya, jadi total jumlah polis LR 02 bisa lebih besar dari LR 01. Premi dan pendapatan dibagi sesuai share.",
  ])

  // Rincian per polis per asuransi, untuk mencocokkan angka LR 01 dan LR 02.
  const detail = wb.addWorksheet("Rincian")
  detail.columns = [
    { width: 26 }, { width: 14 }, { width: 13 }, { width: 36 }, { width: 36 }, { width: 9 },
    { width: 28 }, { width: 18 }, { width: 9 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 },
  ]
  const rows: Cell[][] = []
  for (const p of policies) {
    const rate = fx[p.currency] ?? 1
    const insurers = p.insurers.length ? p.insurers : [{ insurer: OJK_MISSING, share: 100, additionalFeePct: 0 }]
    for (const ins of insurers) {
      const part = (p.premium * ins.share) / 100
      const brokerage = (part * p.brokeragePct) / 100
      const fee = (part * (ins.additionalFeePct || 0)) / 100
      rows.push([
        p.policyNo,
        p.type,
        p.productionDate,
        p.insuredName,
        ins.insurer,
        ins.share / 100,
        p.cobOjkClass?.trim() || OJK_MISSING,
        p.placementLocation?.trim() || OJK_MISSING,
        p.currency,
        roundCents(part),
        roundCents(part * rate),
        roundCents(brokerage * rate),
        roundCents(fee * rate),
        roundCents((brokerage + fee) * rate),
      ])
    }
  }
  writeTable(
    detail,
    1,
    ["No. Polis", "Tipe", "Tanggal Mulai", "Tertanggung", "Penanggung", "Share", "Lini Usaha", "Lokasi Penempatan", "Mata Uang", "Premi (mata uang polis)", "Premi (IDR)", "Brokerage (IDR)", "Additional Fee / EF (IDR)", "Pendapatan (IDR)"],
    rows,
    [null, null, null, null, null, "0.00%", null, null, null, "#,##0.00", IDR_FMT, IDR_FMT, IDR_FMT, IDR_FMT],
    [
      "Total", null, null, null, null, null, null, null, null, null,
      roundCents(rows.reduce((s, r) => s + Number(r[10]), 0)),
      roundCents(rows.reduce((s, r) => s + Number(r[11]), 0)),
      roundCents(rows.reduce((s, r) => s + Number(r[12]), 0)),
      roundCents(rows.reduce((s, r) => s + Number(r[13]), 0)),
    ]
  )
  return data
}

function writeNotes(
  ws: Worksheet,
  row: number,
  missing: readonly string[],
  printedOn: string,
  extra: readonly string[] = []
) {
  const notes = [
    "Jumlah polis: polis Baru dan Renewal. Endorsement, pembatalan, dan deklarasi MOP hanya menambah premi dan pendapatan.",
    "Premi: premi sebelum diskon. Pendapatan jasa keperantaraan: brokerage + additional fee (EF); margin rate MOP tidak termasuk.",
    "Lini Usaha OJK dan Lokasi Penempatan diambil dari Policy Database. Endorsement, pembatalan, dan deklarasi yang kosong memakai isian polis induknya.",
    ...extra,
    ...(missing.length
      ? [
          `${missing.length} data polis (termasuk endorsement, pembatalan, dan deklarasi) belum punya Lini Usaha OJK atau Lokasi Penempatan: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? ", …" : ""}. Daftar lengkap ada di sheet Rincian.`,
        ]
      : []),
    `Dibuat ${dateShort(printedOn)}.`,
  ]
  notes.forEach((text, i) => {
    ws.getRow(row + i).getCell(1).value = text
  })
  return row + notes.length
}
