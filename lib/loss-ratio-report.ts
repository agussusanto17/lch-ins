/**
 * Report loss ratio dari template Team LCH (20 November 2026):
 * - Loss Ratio per Asuransi, seperti laporan MAG "Produksi Lestari Cipta Hokindo all COB"
 *   (documents/report template/COB.pdf): per asuransi, per COB, per tahun polis: gross premium,
 *   net premium, klaim, dan rasio terhadap gross dan net.
 * - Loss Ratio Akun per Asuransi, seperti "Calculation LOSS RATIO DBEST": satu akun (grouping
 *   insured) per tahun polis per asuransi: share, premi gross, BF, diskon, EF, total outgo, net
 *   premium, klaim, dan loss ratio, lalu gabungan semua tahun dan sheet per asuransi.
 *
 * Nilainya bagian tiap asuransi sesuai share. Klaim memakai nilai disetujui/dibayar + adjuster
 * fee − salvage, tanpa klaim Rejected, sama dengan loss ratio polis di form klaim (MoM poin 13).
 * Semua nilai dalam IDR dengan kurs tetap report.
 */
import type { Workbook, Worksheet } from "exceljs"

import { BROKERAGE_VAT_RATE, beforeVat, feeBeforeVat, FX, roundCents } from "./calc"
import type { ClaimStatus, PolicyType } from "./data/types"
import { dateShort } from "./format"
import { lossRatioClaimValue } from "./loss-ratio"

export interface LrInsurerShare {
  insurer: string
  /** Persen, misalnya 25. */
  share: number
  /** Additional fee (EF) asuransi ini dalam persen premi. */
  additionalFeePct: number
  /** EF asuransi ini sudah termasuk PPN 2,2%. */
  additionalFeeIncludeVat?: boolean
}

export interface LrPolicy {
  id: string
  /** Polis Baru/Renewal pembuka tahun polis; sama dengan id untuk polis Baru/Renewal. */
  rootId: string
  /** Tanggal mulai tahun polis "YYYY-MM-DD". */
  yearStart: string
  policyNo: string
  type: PolicyType
  cobCode: string
  /** Nama COB master, misalnya "PROPERTY". */
  cob: string
  /** Grouping insured, atau nama klien/tertanggung bila kosong. */
  account: string
  currency: string
  premium: number
  discount: number
  brokeragePct: number
  /** Brokerage sudah termasuk PPN 2,2%. */
  includeVat?: boolean
  insurers: LrInsurerShare[]
}

export interface LrClaim {
  id: string
  claimNo: string
  /** Polis Baru/Renewal tahun polis klaim. */
  rootId: string
  status: ClaimStatus
  paidAmount: number
  adjusterFeeAmount: number
  salvageAmount: number
  currency: string
}

export interface LossRatioReportData {
  policies: LrPolicy[]
  claims: LrClaim[]
}

/** Nilai satu asuransi pada satu kelompok, dalam IDR. */
export interface LrAmounts {
  gross: number
  /** Brokerage sebelum PPN. */
  brokerage: number
  discount: number
  /** Additional fee sebelum PPN. */
  fee: number
  /** PPN 2,2% atas brokerage dan fee, di dalam persen (incl. VAT) atau ditambahkan (excl. VAT). */
  vat: number
  claim: number
}

const emptyAmounts = (): LrAmounts => ({ gross: 0, brokerage: 0, discount: 0, fee: 0, vat: 0, claim: 0 })

/**
 * Total outgo = BF + diskon + EF + PPN; net premium = gross − total outgo, sama dengan Net ke
 * asuransi di Ringkasan Penutupan placing (22 November 2026).
 */
export function outgo(a: LrAmounts) {
  return roundCents(a.brokerage + a.discount + a.fee + a.vat)
}
export function netPremium(a: LrAmounts) {
  return roundCents(a.gross - outgo(a))
}
/** Rasio klaim terhadap dasar; null bila dasarnya 0 atau kurang. */
export function ratio(claim: number, base: number) {
  return base > 0 ? claim / base : null
}

const AMOUNT_KEYS = ["gross", "brokerage", "discount", "fee", "vat", "claim"] as const

function add(target: LrAmounts, source: Partial<LrAmounts>) {
  for (const key of AMOUNT_KEYS) target[key] += source[key] ?? 0
}

function rounded(a: LrAmounts): LrAmounts {
  return {
    gross: roundCents(a.gross),
    brokerage: roundCents(a.brokerage),
    discount: roundCents(a.discount),
    fee: roundCents(a.fee),
    vat: roundCents(a.vat),
    claim: roundCents(a.claim),
  }
}

/** Klaim incurred 100% dalam IDR: disetujui/dibayar + adjuster fee − salvage; Rejected 0. */
export function claimIncurred(c: LrClaim, fx: Record<string, number> = FX) {
  if (c.status === "Rejected") return 0
  const rate = fx[c.currency] ?? 1
  return (lossRatioClaimValue(c) + (c.adjusterFeeAmount || 0) - (c.salvageAmount || 0)) * rate
}

/** Bagian premi, BF, diskon, dan EF satu asuransi dari satu polis, dalam IDR. */
export function policyShare(p: LrPolicy, ins: LrInsurerShare, fx: Record<string, number> = FX) {
  const rate = fx[p.currency] ?? 1
  const part = (p.premium * ins.share) / 100
  // Brokerage dan EF sebelum PPN, PPN-nya terpisah (Agus dan Harry, 22 November 2026).
  const brokerage = beforeVat((part * p.brokeragePct) / 100, p.includeVat) * rate
  // EF incl. VAT = nominal × 97,8%; PPN EF = 2,2% × nominal, di dalam maupun ditambahkan
  // (sheet TARIF EF Team LCH, 23 November 2026).
  const feeGross = ((part * (ins.additionalFeePct || 0)) / 100) * rate
  return {
    gross: part * rate,
    brokerage,
    discount: ((p.discount * ins.share) / 100) * rate,
    fee: feeBeforeVat(feeGross, ins.additionalFeeIncludeVat),
    vat: (brokerage + feeGross) * BROKERAGE_VAT_RATE,
  }
}

/** Polis per id, untuk membagi klaim sesuai share asuransi polis tahun polisnya. */
function rootsById(data: LossRatioReportData) {
  return new Map(data.policies.filter((p) => p.id === p.rootId).map((p) => [p.id, p]))
}

// Loss Ratio per Asuransi per COB per tahun (COB.pdf)

export interface LrYearRow extends LrAmounts {
  year: string
  /** Akun dengan klaim terbesar di baris ini, seperti catatan di laporan MAG. */
  topClaimAccount: string | null
}

export interface LrCobTable {
  cobCode: string
  cob: string
  years: LrYearRow[]
  total: LrAmounts
}

export interface InsurerCobLossRatio {
  insurer: string
  cobs: LrCobTable[]
  /** ALL BISNIS: semua COB per tahun. */
  all: LrCobTable
}

/**
 * Loss ratio per asuransi, per COB, per tahun mulai polis. `insurer` kosong berarti semua
 * asuransi yang punya premi atau klaim di data; urut nama.
 */
export function insurerCobLossRatio(
  data: LossRatioReportData,
  insurer?: string | null,
  fx: Record<string, number> = FX
): InsurerCobLossRatio[] {
  type Cell = LrAmounts & { accounts: Map<string, number> }
  // insurer → cobCode → year → nilai
  const tree = new Map<string, Map<string, Map<string, Cell>>>()
  const cobNames = new Map<string, string>()
  const cell = (ins: string, cobCode: string, year: string) => {
    const cobs = tree.get(ins) ?? new Map<string, Map<string, Cell>>()
    tree.set(ins, cobs)
    const years = cobs.get(cobCode) ?? new Map<string, Cell>()
    cobs.set(cobCode, years)
    const c = years.get(year) ?? { ...emptyAmounts(), accounts: new Map<string, number>() }
    years.set(year, c)
    return c
  }
  const wanted = (name: string) => !insurer || name === insurer

  for (const p of data.policies) {
    cobNames.set(p.cobCode, p.cob)
    for (const ins of p.insurers) {
      if (!wanted(ins.insurer)) continue
      add(cell(ins.insurer, p.cobCode, p.yearStart.slice(0, 4)), policyShare(p, ins, fx))
    }
  }
  const roots = rootsById(data)
  for (const c of data.claims) {
    const root = roots.get(c.rootId)
    if (!root) continue
    const incurred = claimIncurred(c, fx)
    for (const ins of root.insurers) {
      if (!wanted(ins.insurer)) continue
      const part = (incurred * ins.share) / 100
      const target = cell(ins.insurer, root.cobCode, root.yearStart.slice(0, 4))
      target.claim += part
      target.accounts.set(root.account, (target.accounts.get(root.account) ?? 0) + part)
    }
  }

  const topAccount = (accounts: Map<string, number>) => {
    let best: [string, number] | null = null
    for (const entry of accounts) if (entry[1] > 0 && (!best || entry[1] > best[1])) best = entry
    return best ? best[0] : null
  }
  const tableOf = (cobCode: string, cob: string, years: Map<string, Cell>): LrCobTable => {
    const rows = [...years.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, c]) => ({ year, ...rounded(c), topClaimAccount: topAccount(c.accounts) }))
    const total = emptyAmounts()
    rows.forEach((r) => add(total, r))
    return { cobCode, cob, years: rows, total: rounded(total) }
  }

  return [...tree.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "id"))
    .map(([name, cobs]) => {
      const tables = [...cobs.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, years]) => tableOf(code, cobNames.get(code) ?? code, years))
      const allYears = new Map<string, Cell>()
      for (const years of cobs.values()) {
        for (const [year, c] of years) {
          const target = allYears.get(year) ?? { ...emptyAmounts(), accounts: new Map<string, number>() }
          add(target, c)
          for (const [acc, v] of c.accounts) target.accounts.set(acc, (target.accounts.get(acc) ?? 0) + v)
          allYears.set(year, target)
        }
      }
      return { insurer: name, cobs: tables, all: tableOf("ALL", "ALL BISNIS", allYears) }
    })
}

// Loss Ratio Akun per Asuransi (Calculation LOSS RATIO DBEST)

export interface AccountInsurerRow extends LrAmounts {
  insurer: string
  /** Share efektif: premi gross asuransi ini dibagi premi gross tahun itu. */
  share: number | null
}

export interface AccountYear {
  /** Tahun mulai polis, misalnya "2025". */
  year: string
  /** Label tahun polis, misalnya "2025-2026". */
  label: string
  insurers: AccountInsurerRow[]
  total: LrAmounts
}

export interface AccountLossRatio {
  account: string
  /** Terbaru lebih dulu, seperti sheet COMBINE Team LCH. */
  years: AccountYear[]
  total: LrAmounts
  /** Per asuransi untuk semua tahun. */
  insurers: AccountInsurerRow[]
}

/** Label tahun polis dari tahun mulai: 2025 → "2025-2026". */
export const policyYearLabel = (year: string) => `${year}-${Number(year) + 1}`

/** Loss ratio satu akun per tahun polis per asuransi, beserta gabungan semua tahun. */
export function accountLossRatio(
  data: LossRatioReportData,
  account: string,
  fx: Record<string, number> = FX
): AccountLossRatio {
  const policies = data.policies.filter((p) => p.account === account)
  const ids = new Set(policies.map((p) => p.id))
  const roots = rootsById({ policies, claims: [] })
  // tahun → asuransi → nilai
  const years = new Map<string, Map<string, LrAmounts>>()
  const cell = (year: string, insurer: string) => {
    const byInsurer = years.get(year) ?? new Map<string, LrAmounts>()
    years.set(year, byInsurer)
    const c = byInsurer.get(insurer) ?? emptyAmounts()
    byInsurer.set(insurer, c)
    return c
  }
  for (const p of policies) {
    for (const ins of p.insurers) add(cell(p.yearStart.slice(0, 4), ins.insurer), policyShare(p, ins, fx))
  }
  for (const c of data.claims) {
    if (!ids.has(c.rootId)) continue
    const root = roots.get(c.rootId)
    if (!root) continue
    const incurred = claimIncurred(c, fx)
    for (const ins of root.insurers) {
      cell(root.yearStart.slice(0, 4), ins.insurer).claim += (incurred * ins.share) / 100
    }
  }

  const rowsOf = (byInsurer: Map<string, LrAmounts>) => {
    const total = emptyAmounts()
    byInsurer.forEach((a) => add(total, a))
    const rows = [...byInsurer.entries()]
      .map(([insurer, a]) => ({ insurer, ...rounded(a), share: total.gross ? a.gross / total.gross : null }))
      .sort((a, b) => b.gross - a.gross || a.insurer.localeCompare(b.insurer, "id"))
    return { rows, total: rounded(total) }
  }

  const yearList: AccountYear[] = [...years.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, byInsurer]) => {
      const { rows, total } = rowsOf(byInsurer)
      return { year, label: policyYearLabel(year), insurers: rows, total }
    })
  const combined = new Map<string, LrAmounts>()
  for (const byInsurer of years.values()) {
    for (const [insurer, a] of byInsurer) {
      const target = combined.get(insurer) ?? emptyAmounts()
      add(target, a)
      combined.set(insurer, target)
    }
  }
  const { rows, total } = rowsOf(combined)
  return { account, years: yearList, total, insurers: rows }
}

/** Daftar akun (grouping insured) yang punya polis di data, urut nama. */
export function lossRatioAccounts(data: LossRatioReportData) {
  return [...new Set(data.policies.map((p) => p.account).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "id")
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
/** Kuning seperti judul blok tahun di workbook Team LCH. */
const TITLE_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFF00" } }
const TOTAL_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF2F2F2" } }
const IDR_FMT = "#,##0"
const PCT_FMT = "0.00%"

type Value = string | number | null

function writeTable(
  ws: Worksheet,
  startRow: number,
  headers: readonly string[],
  rows: readonly Value[][],
  formats: readonly (string | null)[],
  total?: Value[]
) {
  const header = ws.getRow(startRow)
  headers.forEach((text, i) => {
    const c = header.getCell(i + 1)
    c.value = text
    c.font = { bold: true }
    c.fill = HEADER_FILL
    c.border = BORDER
    c.alignment = { vertical: "middle", horizontal: i ? "center" : "left", wrapText: true }
  })
  const body = total ? [...rows, total] : rows
  body.forEach((values, r) => {
    const row = ws.getRow(startRow + 1 + r)
    const isTotal = Boolean(total) && r === body.length - 1
    values.forEach((value, i) => {
      const c = row.getCell(i + 1)
      c.value = value
      c.border = BORDER
      if (formats[i]) c.numFmt = formats[i]!
      if (isTotal) {
        c.font = { bold: true }
        c.fill = TOTAL_FILL
      }
    })
  })
  return startRow + 1 + body.length
}

function title(ws: Worksheet, row: number, text: string, size = 12) {
  const c = ws.getRow(row).getCell(1)
  c.value = text
  c.font = { bold: true, size }
}

/** Nama sheet Excel: maksimal 31 karakter, tanpa karakter terlarang, unik di workbook. */
function sheetName(wb: Workbook, wanted: string) {
  const base = wanted.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Sheet"
  let name = base
  for (let i = 2; wb.getWorksheet(name); i++) {
    const suffix = ` (${i})`
    name = base.slice(0, 31 - suffix.length) + suffix
  }
  return name
}

/** Baris tahun: tahun terakhir periode yang belum penuh ditulis "2026 s/d 31 Okt 2026". */
function yearText(year: string, end: string) {
  return year === end.slice(0, 4) && !end.endsWith("-12-31") ? `${year} s/d ${dateShort(end)}` : year
}

const COB_HEADERS = [
  "Tahun",
  "Sum of Gross Premium",
  "Sum of Net Premium",
  "Sum of Claim",
  "Ratio Base on Gross Premium",
  "Ratio Base on Net Premium",
  "Keterangan (akun klaim terbesar)",
]
const COB_FORMATS = [null, IDR_FMT, IDR_FMT, IDR_FMT, PCT_FMT, PCT_FMT, null]

function cobRows(table: LrCobTable, end: string): Value[][] {
  return table.years.map((y) => [
    yearText(y.year, end),
    y.gross,
    netPremium(y),
    y.claim,
    ratio(y.claim, y.gross),
    ratio(y.claim, netPremium(y)),
    y.topClaimAccount,
  ])
}

function cobTotal(table: LrCobTable): Value[] {
  const t = table.total
  return ["Total", t.gross, netPremium(t), t.claim, ratio(t.claim, t.gross), ratio(t.claim, netPremium(t)), null]
}

/** Workbook Loss Ratio per Asuransi: satu sheet per asuransi, tabel per COB lalu ALL BISNIS. */
export function fillInsurerCobLossRatio(
  wb: Workbook,
  results: readonly InsurerCobLossRatio[],
  period: { start: string; end: string },
  printedOn: string
) {
  for (const r of results) {
    const ws = wb.addWorksheet(sheetName(wb, r.insurer))
    ws.columns = [{ width: 24 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 34 }]
    title(ws, 1, r.insurer.toUpperCase(), 14)
    ws.getRow(2).getCell(1).value = `As of ${dateShort(period.end)}. Tahun = tahun mulai polis (polis Baru/Renewal beserta endorsement, pembatalan, dan deklarasinya), mulai ${dateShort(period.start)}.`
    ws.getRow(3).getCell(1).value =
      "Bagian asuransi sesuai share, dalam IDR. Net premium = gross − brokerage − diskon − additional fee (EF) − PPN 2,2% atas brokerage dan EF; brokerage dan EF sebelum PPN (brokerage incl. VAT: persen ÷ 1,022; EF incl. VAT: × 97,8%), sama dengan Net ke asuransi di placing. Klaim = nilai disetujui/dibayar + adjuster fee − salvage, tanpa klaim Rejected."
    ws.getRow(4).getCell(1).value = `Dibuat ${dateShort(printedOn)}.`
    let row = 6
    for (const table of [...r.cobs, r.all]) {
      title(ws, row, table.cob.toUpperCase())
      row = writeTable(ws, row + 1, COB_HEADERS, cobRows(table, period.end), COB_FORMATS, cobTotal(table)) + 1
    }
  }
}

const ACCOUNT_HEADERS = [
  "Asuransi",
  "Share",
  "Premi Gross",
  "BF",
  "Diskon",
  "EF",
  "PPN",
  "Total Outgo",
  "Net Premium",
  "Klaim",
  "Loss Ratio",
]
const ACCOUNT_FORMATS = [null, PCT_FMT, IDR_FMT, IDR_FMT, IDR_FMT, IDR_FMT, IDR_FMT, IDR_FMT, IDR_FMT, IDR_FMT, PCT_FMT]

function accountRow(label: string, share: number | null, a: LrAmounts): Value[] {
  return [label, share, a.gross, a.brokerage, a.discount, a.fee, a.vat, outgo(a), netPremium(a), a.claim, ratio(a.claim, netPremium(a))]
}

/**
 * Workbook Loss Ratio Akun per Asuransi, seperti workbook DBEST Team LCH: sheet Per Tahun (blok
 * per tahun polis), Gabungan (semua tahun), dan satu sheet per asuransi.
 */
export function fillAccountLossRatio(
  wb: Workbook,
  result: AccountLossRatio,
  period: { start: string; end: string },
  printedOn: string
) {
  const intro = (ws: Worksheet, heading: string) => {
    title(ws, 1, heading, 14)
    ws.getRow(2).getCell(1).value = `Akun: ${result.account}. Tahun polis mulai ${dateShort(period.start)} s/d ${dateShort(period.end)}; nilai dalam IDR, bagian asuransi sesuai share.`
    ws.getRow(3).getCell(1).value =
      "BF = brokerage dan EF = additional fee, keduanya sebelum PPN (BF incl. VAT: persen ÷ 1,022; EF incl. VAT: × 97,8%); PPN = 2,2% × BF sebelum PPN + 2,2% × nominal EF. Total Outgo = BF + diskon + EF + PPN, Net Premium = premi gross − total outgo (sama dengan Net ke asuransi di placing). Klaim = nilai disetujui/dibayar + adjuster fee − salvage (tanpa Rejected); Loss Ratio = klaim / net premium."
    ws.getRow(4).getCell(1).value = `Dibuat ${dateShort(printedOn)}.`
  }
  const widths = [{ width: 40 }, { width: 10 }, ...Array.from({ length: 9 }, () => ({ width: 19 }))]

  const perYear = wb.addWorksheet("Per Tahun")
  perYear.columns = widths
  intro(perYear, `LOSS RATIO ${result.account.toUpperCase()}`)
  let row = 6
  for (const y of result.years) {
    const t = perYear.getRow(row).getCell(1)
    t.value = `TOTAL ${y.label}`
    t.font = { bold: true }
    t.fill = TITLE_FILL
    row = writeTable(
      perYear,
      row + 1,
      ACCOUNT_HEADERS,
      y.insurers.map((r) => accountRow(r.insurer, r.share, r)),
      ACCOUNT_FORMATS,
      accountRow("Total", y.total.gross ? 1 : null, y.total)
    ) + 1
  }

  const combined = wb.addWorksheet("Gabungan")
  combined.columns = widths
  intro(combined, `LOSS RATIO ${result.account.toUpperCase()} - SEMUA TAHUN`)
  writeTable(
    combined,
    6,
    ["Tahun Polis", "", ...ACCOUNT_HEADERS.slice(2)],
    result.years.map((y) => accountRow(y.label, null, y.total)),
    ACCOUNT_FORMATS,
    accountRow("Total", null, result.total)
  )
  const insurerStart = 8 + result.years.length + 1
  title(combined, insurerStart, "Per asuransi, semua tahun")
  writeTable(
    combined,
    insurerStart + 1,
    ACCOUNT_HEADERS,
    result.insurers.map((r) => accountRow(r.insurer, r.share, r)),
    ACCOUNT_FORMATS,
    accountRow("Total", result.total.gross ? 1 : null, result.total)
  )

  for (const ins of result.insurers) {
    const ws = wb.addWorksheet(sheetName(wb, ins.insurer))
    ws.columns = widths
    intro(ws, `${ins.insurer.toUpperCase()} - ${result.account.toUpperCase()}`)
    const rows = result.years.flatMap((y) => {
      const r = y.insurers.find((x) => x.insurer === ins.insurer)
      return r ? [accountRow(y.label, r.share, r)] : []
    })
    writeTable(
      ws,
      6,
      ["Tahun Polis", "Share", ...ACCOUNT_HEADERS.slice(2)],
      rows,
      ACCOUNT_FORMATS,
      accountRow("Total", ins.share, ins)
    )
  }
}
