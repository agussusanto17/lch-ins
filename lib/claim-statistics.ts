/**
 * Statistik Klaim per Status di menu Report (MoM review Phase 1, poin 17). Template dari Team LCH
 * belum ada, jadi sheet Daftar Klaim mengikuti kolom register klaim LCH (sheet CLAIM LIST dan
 * LIST OUTSTANDING CLAIM) dengan judul kolom dua baris, English lalu Indonesia.
 */
import type { Workbook, Worksheet } from "exceljs"

import { roundCents, toIdr } from "./calc"
import { CLAIM_STATUSES } from "./data/reference"
import type { ClaimStatus } from "./data/types"
import { dateShort } from "./format"

/** Satu klaim di report, dengan polis dan tindak lanjut terakhirnya. */
export interface ClaimStatRow {
  claimNo: string
  insuredName: string
  /** Asuransi leader, atau asuransi pertama bila tidak ada leader. */
  insurer: string
  policyNo: string
  cob: string
  /** Mata uang klaim, sama dengan mata uang polis saat klaim dicatat. */
  currency: string
  sumInsured: number
  estimatedLoss: number
  claimedAmount: number
  paidAmount: number
  adjusterFeeAmount: number
  salvageAmount: number
  lossDate: string
  reportedDate: string | null
  documentCompleteDate: string | null
  spkDate: string | null
  status: ClaimStatus
  /** Tahapan dokumen, nama dari Master Data. */
  stage: string
  adjuster: string
  lossDescription: string
  notes: string
  lastFollowup: { date: string; note: string } | null
}

export interface ClaimStatisticsData {
  claims: ClaimStatRow[]
  /** Nama status dari Master Data. */
  statusLabels: Record<ClaimStatus, string>
  /** Tahapan dokumen sesuai urutan Master Data. */
  stages: string[]
}

/** Dasar periode report: tanggal lapor klaim, atau tanggal kejadian bila tanggal lapor kosong. */
export function claimPeriodDate(c: Pick<ClaimStatRow, "reportedDate" | "lossDate">) {
  return c.reportedDate ?? c.lossDate
}

export interface ClaimTotals {
  count: number
  estimatedLoss: number
  claimedAmount: number
  paidAmount: number
  adjusterFee: number
  salvage: number
}

export interface ClaimStatusSummary {
  rows: Array<ClaimTotals & { status: ClaimStatus; /** Bagian dari jumlah klaim, 0–1. */ share: number }>
  total: ClaimTotals
}

const emptyTotals = (): ClaimTotals => ({
  count: 0,
  estimatedLoss: 0,
  claimedAmount: 0,
  paidAmount: 0,
  adjusterFee: 0,
  salvage: 0,
})

function addClaim(t: ClaimTotals, c: ClaimStatRow) {
  t.count += 1
  t.estimatedLoss += toIdr(c.estimatedLoss, c.currency)
  t.claimedAmount += toIdr(c.claimedAmount, c.currency)
  t.paidAmount += toIdr(c.paidAmount, c.currency)
  t.adjusterFee += toIdr(c.adjusterFeeAmount, c.currency)
  t.salvage += toIdr(c.salvageAmount, c.currency)
}

const rounded = (t: ClaimTotals): ClaimTotals => ({
  count: t.count,
  estimatedLoss: roundCents(t.estimatedLoss),
  claimedAmount: roundCents(t.claimedAmount),
  paidAmount: roundCents(t.paidAmount),
  adjusterFee: roundCents(t.adjusterFee),
  salvage: roundCents(t.salvage),
})

/** Jumlah dan nilai klaim (IDR, kurs tetap report) per status, semua status tampil. */
export function claimStatusSummary(claims: readonly ClaimStatRow[]): ClaimStatusSummary {
  const byStatus = new Map(CLAIM_STATUSES.map((s) => [s, emptyTotals()]))
  const total = emptyTotals()
  for (const c of claims) {
    addClaim(byStatus.get(c.status) ?? emptyTotals(), c)
    addClaim(total, c)
  }
  return {
    rows: CLAIM_STATUSES.map((status) => {
      const t = rounded(byStatus.get(status) ?? emptyTotals())
      return { status, share: total.count ? t.count / total.count : 0, ...t }
    }),
    total: rounded(total),
  }
}

export interface StatusPivotRow {
  label: string
  counts: Record<ClaimStatus, number>
  total: number
}

/**
 * Jumlah klaim per kelompok (COB, asuransi, atau tahapan dokumen) dan status. Tanpa `order`,
 * kelompok diurutkan dari klaim terbanyak; dengan `order`, mengikuti urutan itu.
 */
export function claimStatusPivot(
  claims: readonly ClaimStatRow[],
  groupOf: (c: ClaimStatRow) => string,
  order?: readonly string[]
): StatusPivotRow[] {
  const groups = new Map<string, StatusPivotRow>()
  for (const c of claims) {
    const label = groupOf(c).trim() || "—"
    const row =
      groups.get(label) ??
      ({
        label,
        counts: Object.fromEntries(CLAIM_STATUSES.map((s) => [s, 0])) as Record<ClaimStatus, number>,
        total: 0,
      } satisfies StatusPivotRow)
    row.counts[c.status] = (row.counts[c.status] ?? 0) + 1
    row.total += 1
    groups.set(label, row)
  }
  const rank = (label: string) => {
    const i = order?.indexOf(label) ?? -1
    return i < 0 ? Number.MAX_SAFE_INTEGER : i
  }
  return [...groups.values()].sort((a, b) =>
    order
      ? rank(a.label) - rank(b.label) || a.label.localeCompare(b.label)
      : b.total - a.total || a.label.localeCompare(b.label)
  )
}

/** Klaim di sheet Daftar Klaim: urut status, lalu tanggal dasar periode, lalu nomor klaim. */
export function sortedClaims(claims: readonly ClaimStatRow[]) {
  const rank = (s: ClaimStatus) => CLAIM_STATUSES.indexOf(s)
  return [...claims].sort(
    (a, b) =>
      rank(a.status) - rank(b.status) ||
      claimPeriodDate(a).localeCompare(claimPeriodDate(b)) ||
      a.claimNo.localeCompare(b.claimNo)
  )
}

// Workbook

const BORDER_COLOR = { argb: "FFBFBFBF" }
const BORDER = {
  top: { style: "thin" as const, color: BORDER_COLOR },
  left: { style: "thin" as const, color: BORDER_COLOR },
  bottom: { style: "thin" as const, color: BORDER_COLOR },
  right: { style: "thin" as const, color: BORDER_COLOR },
}
const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFDDEBF7" } }
const TOTAL_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF2F2F2" } }
const COUNT_FMT = "#,##0"
const MONEY_FMT = "#,##0.00"
const IDR_FMT = "#,##0"
const DATE_FMT = "dd/mm/yyyy"

/** Tanggal ISO sebagai tengah malam UTC, supaya Excel tidak menggeser hari di zona waktu WIB. */
const excelDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00.000Z`) : null)

type CellValue = string | number | Date | null

function writeTable(
  ws: Worksheet,
  startRow: number,
  headers: readonly string[],
  rows: readonly CellValue[][],
  formats: readonly (string | null)[],
  totalRow?: CellValue[]
) {
  const header = ws.getRow(startRow)
  headers.forEach((text, i) => {
    const cell = header.getCell(i + 1)
    cell.value = text
    cell.font = { bold: true }
    cell.fill = HEADER_FILL
    cell.border = BORDER
    cell.alignment = { vertical: "middle", wrapText: true, horizontal: i ? "center" : "left" }
  })
  const body = totalRow ? [...rows, totalRow] : rows
  body.forEach((values, r) => {
    const row = ws.getRow(startRow + 1 + r)
    const isTotal = Boolean(totalRow) && r === body.length - 1
    values.forEach((value, i) => {
      const cell = row.getCell(i + 1)
      cell.value = value
      cell.border = BORDER
      const fmt = formats[i]
      if (fmt) cell.numFmt = fmt
      if (isTotal) {
        cell.font = { bold: true }
        cell.fill = TOTAL_FILL
      }
    })
  })
  return startRow + 1 + body.length
}

function writeSectionTitle(ws: Worksheet, row: number, text: string) {
  const cell = ws.getRow(row).getCell(1)
  cell.value = text
  cell.font = { bold: true, size: 12 }
}

function periodText(start: string, end: string) {
  return `Periode tanggal lapor klaim ${dateShort(start)} s/d ${dateShort(end)}. Klaim tanpa tanggal lapor memakai tanggal kejadian.`
}

function fillSummarySheet(
  ws: Worksheet,
  data: ClaimStatisticsData,
  period: { start: string; end: string },
  printedOn: string
) {
  ws.columns = [{ width: 38 }, ...Array.from({ length: 7 }, () => ({ width: 20 }))]
  const title = ws.getRow(1).getCell(1)
  title.value = "STATISTIK KLAIM PER STATUS"
  title.font = { bold: true, size: 14 }
  ws.getRow(2).getCell(1).value = periodText(period.start, period.end)
  ws.getRow(3).getCell(1).value =
    "Nilai dalam IDR; klaim mata uang asing dikonversi dengan kurs tetap report."
  ws.getRow(4).getCell(1).value = `Dibuat ${dateShort(printedOn)}.`

  const label = (s: ClaimStatus) => data.statusLabels[s] ?? s
  const summary = claimStatusSummary(data.claims)
  writeSectionTitle(ws, 6, "Per status")
  let next = writeTable(
    ws,
    7,
    [
      "Status Klaim",
      "Jumlah Klaim",
      "% Jumlah",
      "Estimasi Kerugian",
      "Nilai Diajukan",
      "Nilai Disetujui/Dibayar",
      "Adjuster Fee",
      "Salvage",
    ],
    summary.rows.map((r) => [
      label(r.status),
      r.count,
      r.share,
      r.estimatedLoss,
      r.claimedAmount,
      r.paidAmount,
      r.adjusterFee,
      r.salvage,
    ]),
    [null, COUNT_FMT, "0.0%", IDR_FMT, IDR_FMT, IDR_FMT, IDR_FMT, IDR_FMT],
    [
      "Total",
      summary.total.count,
      summary.total.count ? 1 : 0,
      summary.total.estimatedLoss,
      summary.total.claimedAmount,
      summary.total.paidAmount,
      summary.total.adjusterFee,
      summary.total.salvage,
    ]
  )

  const pivots: Array<[string, string, StatusPivotRow[]]> = [
    ["Per COB", "COB", claimStatusPivot(data.claims, (c) => c.cob)],
    ["Per asuransi (leader)", "Asuransi", claimStatusPivot(data.claims, (c) => c.insurer)],
    [
      "Per tahapan dokumen",
      "Tahapan Dokumen",
      claimStatusPivot(data.claims, (c) => c.stage, data.stages),
    ],
  ]
  for (const [heading, first, rows] of pivots) {
    next += 1
    writeSectionTitle(ws, next, heading)
    const totals = CLAIM_STATUSES.map((s) => rows.reduce((sum, r) => sum + r.counts[s], 0))
    next = writeTable(
      ws,
      next + 1,
      [first, ...CLAIM_STATUSES.map(label), "Total"],
      rows.map((r) => [r.label, ...CLAIM_STATUSES.map((s) => r.counts[s]), r.total]),
      [null, ...CLAIM_STATUSES.map(() => COUNT_FMT), COUNT_FMT],
      ["Total", ...totals, rows.reduce((sum, r) => sum + r.total, 0)]
    )
  }
}

/** Kolom sheet Daftar Klaim: judul English (baris 1) dan Indonesia (baris 2) seperti register LCH. */
const LIST_COLUMNS: Array<{
  en: string
  id: string
  width: number
  fmt?: string
  value: (c: ClaimStatRow, no: number, data: ClaimStatisticsData) => CellValue
}> = [
  { en: "No.", id: "No.", width: 6, value: (_c, no) => no },
  { en: "Register No", id: "No. Registrasi", width: 24, value: (c) => c.claimNo },
  { en: "Insured Name", id: "Nama Tertanggung", width: 36, value: (c) => c.insuredName },
  {
    en: "Insurer",
    id: "Nama Penanggung/ Perusahaan Asuransi",
    width: 32,
    value: (c) => c.insurer,
  },
  { en: "Policy No", id: "Nomor Polis", width: 24, value: (c) => c.policyNo },
  { en: "COB", id: "Lini Usaha", width: 18, value: (c) => c.cob },
  { en: "Currency", id: "Mata Uang", width: 10, value: (c) => c.currency },
  { en: "Sum Insured", id: "Total Pertanggungan", width: 20, fmt: MONEY_FMT, value: (c) => c.sumInsured },
  {
    en: "Estimated Claim",
    id: "Perkiraan Nilai Kerugian",
    width: 20,
    fmt: MONEY_FMT,
    value: (c) => c.estimatedLoss,
  },
  { en: "Claimed Amount", id: "Nilai Diajukan", width: 20, fmt: MONEY_FMT, value: (c) => c.claimedAmount },
  {
    en: "Paid Amount",
    id: "Nilai Disetujui/Dibayar",
    width: 20,
    fmt: MONEY_FMT,
    value: (c) => c.paidAmount,
  },
  { en: "Adjuster Fee", id: "Adjuster Fee", width: 16, fmt: MONEY_FMT, value: (c) => c.adjusterFeeAmount },
  { en: "Salvage", id: "Nilai Salvage", width: 16, fmt: MONEY_FMT, value: (c) => c.salvageAmount },
  { en: "DOL", id: "Tanggal Kejadian", width: 14, fmt: DATE_FMT, value: (c) => excelDate(c.lossDate) },
  {
    en: "Date Reported",
    id: "Tanggal Lapor Klaim",
    width: 14,
    fmt: DATE_FMT,
    value: (c) => excelDate(c.reportedDate),
  },
  {
    en: "Date Complete",
    id: "Tanggal Dokumen Lengkap",
    width: 14,
    fmt: DATE_FMT,
    value: (c) => excelDate(c.documentCompleteDate),
  },
  {
    en: "Date SPK / SPGR",
    id: "Tanggal Terbit SPK/SPGR",
    width: 14,
    fmt: DATE_FMT,
    value: (c) => excelDate(c.spkDate),
  },
  {
    en: "Status",
    id: "Status Klaim",
    width: 16,
    value: (c, _no, data) => data.statusLabels[c.status] ?? c.status,
  },
  { en: "Document Status", id: "Tahapan Dokumen", width: 22, value: (c) => c.stage },
  { en: "Adjuster", id: "Adjuster", width: 26, value: (c) => c.adjuster || null },
  { en: "Loss Description", id: "Kronologi", width: 40, value: (c) => c.lossDescription || null },
  {
    en: "Remark",
    id: "Tindak Lanjut Terakhir",
    width: 40,
    value: (c) =>
      c.lastFollowup ? `${dateShort(c.lastFollowup.date)}: ${c.lastFollowup.note}` : null,
  },
  { en: "Note", id: "Catatan", width: 32, value: (c) => c.notes || null },
]

const LIST_HEADER_ROW = 4

function fillListSheet(
  ws: Worksheet,
  data: ClaimStatisticsData,
  period: { start: string; end: string }
) {
  ws.columns = LIST_COLUMNS.map((c) => ({ width: c.width }))
  const title = ws.getRow(1).getCell(1)
  title.value = "DAFTAR KLAIM"
  title.font = { bold: true, size: 14 }
  ws.getRow(2).getCell(1).value = periodText(period.start, period.end)

  const en = ws.getRow(LIST_HEADER_ROW)
  const id = ws.getRow(LIST_HEADER_ROW + 1)
  LIST_COLUMNS.forEach((col, i) => {
    for (const [row, text, italic] of [
      [en, col.en, false],
      [id, col.id, true],
    ] as const) {
      const cell = row.getCell(i + 1)
      cell.value = text
      cell.font = { bold: true, italic }
      cell.fill = HEADER_FILL
      cell.border = BORDER
      cell.alignment = { vertical: "middle", wrapText: true }
    }
  })

  sortedClaims(data.claims).forEach((c, index) => {
    const row = ws.getRow(LIST_HEADER_ROW + 2 + index)
    LIST_COLUMNS.forEach((col, i) => {
      const cell = row.getCell(i + 1)
      cell.value = col.value(c, index + 1, data)
      cell.border = BORDER
      cell.alignment = { vertical: "top", wrapText: col.width >= 32 }
      if (col.fmt) cell.numFmt = col.fmt
    })
  })

  ws.autoFilter = {
    from: { row: LIST_HEADER_ROW + 1, column: 1 },
    to: { row: LIST_HEADER_ROW + 1, column: LIST_COLUMNS.length },
  }
}

/** Isi workbook Statistik Klaim per Status: sheet Ringkasan dan Daftar Klaim. */
export function fillClaimStatistics(
  wb: Workbook,
  data: ClaimStatisticsData,
  period: { start: string; end: string },
  printedOn: string
) {
  const summary = wb.addWorksheet("Ringkasan", {
    properties: { tabColor: { argb: "FF2F75B5" } },
  })
  fillSummarySheet(summary, data, period, printedOn)
  const list = wb.addWorksheet("Daftar Klaim", {
    views: [{ state: "frozen", xSplit: 2, ySplit: LIST_HEADER_ROW + 1 }],
    properties: { tabColor: { argb: "FF70AD47" } },
  })
  fillListSheet(list, data, period)
}
