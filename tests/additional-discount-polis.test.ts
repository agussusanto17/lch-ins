import assert from "node:assert/strict"
import test from "node:test"

import ExcelJS from "exceljs"

import { additionalDiscountIdr, breakdownByCob } from "../lib/data/analytics"
import type { Policy } from "../lib/data/types"
import { fillMomReport, momReport } from "../lib/mom-report"
import {
  MARKETING_DISCOUNT,
  recapIncome,
  recapPolicyRows,
  recapRows,
  type RecapPolicy,
} from "../lib/production-recap"
import { fillReserveBasis, reserveBasis, reserveFigures } from "../lib/reserve-basis"

/**
 * Additional discount Quotation di polis (Agus, 25 November 2026): persen dari gross premium,
 * ditanggung LCH. Premi ke asuransi tidak berubah; report mencatatnya sebagai beban
 * MARKETING-DISCOUNT BEBAN LCH / MARKETING EXP-DISCOUNT.
 */
function policy(over: Partial<RecapPolicy> = {}): RecapPolicy {
  return {
    policyNo: "PAR/2026/0001",
    parentPolicyNo: null,
    slipNo: "001/LCH-PLCMT/PS-PAR/VIII/2026",
    type: "Baru",
    endorsementSeq: null,
    insuredName: "PT MARGAMAS INDAH DEVELOPMENT",
    clientName: "PT Margamas Indah Development",
    clientType: "Korporasi",
    clientCodes: {},
    sourceCode: "LCH-ID",
    sourceName: "PT. LCH Insurance Brokers",
    cobCode: "01",
    cobName: "PROPERTY",
    coverCode: null,
    coverName: null,
    periodStart: "2026-08-05",
    periodEnd: "2027-08-05",
    productionDate: "2026-08-05",
    recordedDate: "2026-08-05",
    paidDate: null,
    currency: "IDR",
    premium: 100_000_000,
    brokeragePct: 15,
    additionalDiscountPct: 5,
    remarks: null,
    groupingInsured: "D'BEST GROUP",
    cobOjkClass: null,
    placementLocation: null,
    insurers: [
      { insurer: "PT Asuransi Multi Artha Guna Tbk", share: 60, additionalFeePct: 0 },
      { insurer: "PT Asuransi Astra Buana", share: 40, additionalFeePct: 0 },
    ],
    ...over,
  }
}

test("Rekap Produksi: baris EXPENSE MARKETING-DISCOUNT BEBAN LCH per asuransi", () => {
  const rows = recapRows([policy()])
  const pick = (r: (typeof rows)[number]) => [
    r.asuransi,
    r["akun pnl"],
    r["sub akun pnl"],
    r.Premium_Gross,
    r["(Income)/Beban"],
    r.Percentage,
  ]
  assert.deepEqual(rows.map(pick), [
    // Premi dan komisi tidak berubah; diskon tambahan bukan potongan premi ke asuransi.
    ["PT Asuransi Multi Artha Guna Tbk", "INCOME", "COMM", 60_000_000, -9_000_000, -0.15],
    ["PT Asuransi Multi Artha Guna Tbk", "EXPENSE", MARKETING_DISCOUNT, 0, 3_000_000, 0.05],
    ["PT Asuransi Astra Buana", "INCOME", "COMM", 40_000_000, -6_000_000, -0.15],
    ["PT Asuransi Astra Buana", "EXPENSE", MARKETING_DISCOUNT, 0, 2_000_000, 0.05],
  ])
  // Tanpa additional discount tidak ada baris beban.
  assert.equal(recapRows([policy({ additionalDiscountPct: 0 })]).length, 2)
})

test("Per Polis: kolom MARKETING-DISCOUNT BEBAN LCH ikut total (Income)/Beban", () => {
  const [mag] = recapPolicyRows([policy()])
  assert.equal(mag["MARKETING-DISCOUNT BEBAN LCH_OC"], 3_000_000)
  assert.equal(mag["MARKETING-DISCOUNT BEBAN LCH_IDR"], 3_000_000)
  assert.equal(mag["(Income)/Beban"], -9_000_000 + 3_000_000)
  assert.deepEqual(
    recapIncome([policy()]).map((r) => r.marketingDiscount),
    [3_000_000, 2_000_000]
  )
})

test("Reserve Basis: MARKETING EXP-DISCOUNT terisi, reserve 40% pendapatan dikurangi beban", () => {
  const months = reserveBasis([policy()])
  const row = months[0].rows[0]
  assert.equal(row.marketingDiscount, 5_000_000)
  // Pendapatan −15.000.000; reserve = −15.000.000 × 40% + 5.000.000 = −1.000.000.
  assert.deepEqual(reserveFigures(row), {
    revenue: -15_000_000,
    expenses: 5_000_000,
    reserve: -1_000_000,
    rounding: -1_000_000,
    total: -6_000_000,
  })
  const wb = new ExcelJS.Workbook()
  fillReserveBasis(wb, months, "2026-11-25")
  const ws = wb.getWorksheet("08")!
  assert.equal(ws.getCell("K7").value, "MARKETING EXP-DISCOUNT")
  assert.equal(ws.getCell("K9").value, 5_000_000)
  assert.deepEqual(ws.getCell("N9").value, { formula: "SUM(I9:M9)", result: 5_000_000 })
  assert.deepEqual(ws.getCell("R9").value, { formula: "Q9-N9", result: -6_000_000 })
  assert.deepEqual(ws.getCell("S9").value, { formula: "IF(H9=0,0,R9/H9)", result: 0.4 })
  assert.deepEqual(ws.getCell("K10").value, { formula: "SUM(K9:K9)", result: 5_000_000 })
})

test("Laporan MOM: kolom h MARKETING EXP-DISCOUNT dan NET setelah beban", () => {
  const period = { start: "2026-01-01", end: "2026-11-30" }
  const report = momReport([policy()], [], period)
  assert.deepEqual(report.current.indonesia[7], {
    brokerage: 15_000_000,
    margin: 0,
    commissionExpense: 0,
    marketingDiscount: 5_000_000,
  })
  const wb = new ExcelJS.Workbook()
  fillMomReport(wb, report, period, "2026-11-25")
  const ws = wb.getWorksheet("Laporan MOM")!
  // Agustus di baris 18; kolom h tahun laporan = I.
  assert.equal(ws.getCell("A18").value, "August")
  assert.equal(ws.getCell("I9").value, "MARKETING EXP-DISCOUNT")
  assert.equal(ws.getCell("I18").value, 5_000_000)
  assert.deepEqual(ws.getCell("K18").value, { formula: "SUM(F18:J18)", result: 5_000_000 })
  assert.deepEqual(ws.getCell("L18").value, { formula: "E18-K18", result: 10_000_000 })
})

test("Report Operational: Additional Discount (IDR) per polis dan per COB", () => {
  // USD 10.000 × 5% = USD 500 × kurs report 16.200.
  assert.equal(additionalDiscountIdr({ premium: 10_000, currency: "USD", additionalDiscountPct: 5 }), 8_100_000)
  assert.equal(additionalDiscountIdr({ premium: 10_000, currency: "USD" }), 0)
  const policy = (over: Partial<Policy>) =>
    ({
      cob: "Property",
      insurer: "PT Asuransi Multi Artha Guna Tbk",
      insurers: [],
      currency: "IDR",
      sumInsured: 1_000_000_000,
      premium: 100_000_000,
      brokeragePct: 15,
      additionalFee: 0,
      ...over,
    }) as Policy
  const [property] = breakdownByCob([
    policy({ additionalDiscountPct: 5 }),
    policy({ premium: 50_000_000 }),
  ])
  assert.equal(property.additionalDiscount, 5_000_000)
  assert.equal(property.premium, 150_000_000)
})

