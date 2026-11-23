import assert from "node:assert/strict"
import test from "node:test"

import ExcelJS from "exceljs"

import {
  fillMomReport,
  MOM_TEMPLATE_NOTES,
  momMonths,
  momReport,
  previousYearDate,
} from "../lib/mom-report"
import type { RecapPolicy } from "../lib/production-recap"

const MAG = {
  insurer: "PT Asuransi Multi Artha Guna Tbk",
  share: 100,
  additionalFeePct: 0,
  feeSubAccount: "EF (MAG)",
  feeSubAccountCode: "ef_mag",
}
const ASTRA = {
  insurer: "PT Asuransi Astra Buana",
  share: 100,
  additionalFeePct: 0,
  feeSubAccount: "EF",
  feeSubAccountCode: "ef",
}

function policy(over: Partial<RecapPolicy> = {}): RecapPolicy {
  return {
    policyNo: "MC/2026/0001",
    parentPolicyNo: null,
    slipNo: null,
    type: "Baru",
    endorsementSeq: null,
    insuredName: "PT RUKMA PADAYA TRANS",
    clientName: "PT Rukma Padaya Trans",
    clientType: "Korporasi",
    clientCodes: {},
    sourceCode: "LCH-ID",
    sourceName: "PT. LCH Insurance Brokers",
    cobCode: "03",
    cobName: "MARINE CARGO",
    coverCode: null,
    coverName: null,
    periodStart: "2026-03-10",
    periodEnd: "2027-03-10",
    productionDate: "2026-03-10",
    recordedDate: "2026-03-10",
    paidDate: null,
    currency: "IDR",
    premium: 100_000_000,
    brokeragePct: 15,
    remarks: null,
    groupingInsured: null,
    cobOjkClass: null,
    placementLocation: null,
    insurers: [MAG],
    ...over,
  }
}

const SG = { sourceCode: "LCH-SG", sourceName: "LCH Insurance Brokers Pte Ltd" }

const CURRENT = [
  // Indonesia Maret: komisi 15.000.000 + EF MAG 10.000.000.
  policy({ insurers: [{ ...MAG, additionalFeePct: 10 }] }),
  // Indonesia Maret, brokerage incl. VAT: 7.500.000 ÷ 1,022; 40% di-sharing ke LCH Singapore.
  policy({
    policyNo: "MV/2026/0002",
    productionDate: "2026-03-20",
    premium: 50_000_000,
    includeVat: true,
    commissionShareSgPct: 40,
    insurers: [ASTRA],
  }),
  // Indonesia April: deklarasi MOP, komisi 10% dan margin 200.000.
  policy({
    policyNo: "MOP/2026/0003",
    type: "Deklarasi",
    productionDate: "2026-04-05",
    premium: 1_000_000,
    clientPremium: 1_200_000,
    brokeragePct: 10,
  }),
  // Singapore Maret, USD: komisi MAG 1.500 dan EF MAG 500 × kurs 16.200.
  policy({
    ...SG,
    policyNo: "MH/2026/0004",
    productionDate: "2026-03-15",
    currency: "USD",
    premium: 10_000,
    insurers: [{ ...MAG, additionalFeePct: 5 }],
  }),
  // Singapore Maret, dua asuransi 50:50. Margin deklarasi bisnis Singapore tidak ditulis.
  policy({
    ...SG,
    policyNo: "MOP/2026/0005",
    type: "Deklarasi",
    productionDate: "2026-03-25",
    premium: 20_000_000,
    clientPremium: 22_000_000,
    brokeragePct: 20,
    commissionShareSgPct: 50,
    insurers: [
      { ...MAG, share: 50 },
      { ...ASTRA, share: 50 },
    ],
  }),
  // Desember di luar bulan laporan (Januari–November).
  policy({ policyNo: "MC/2026/0099", productionDate: "2026-12-01" }),
]

const PREVIOUS = [
  policy({ policyNo: "MC/2025/0001", productionDate: "2025-03-01", premium: 40_000_000, brokeragePct: 25 }),
  policy({ policyNo: "MC/2025/0099", productionDate: "2025-12-15" }),
]

const PERIOD = { start: "2026-01-01", end: "2026-11-30" }

test("tahun pembanding memakai tanggal yang sama; 29 Februari menjadi 28 Februari", () => {
  assert.equal(previousYearDate("2026-01-01"), "2025-01-01")
  assert.equal(previousYearDate("2026-11-30"), "2025-11-30")
  assert.equal(previousYearDate("2028-02-29"), "2027-02-28")
  assert.deepEqual(momMonths("2026-03-10", "2026-05-20"), [3, 4, 5])
  assert.deepEqual(momMonths("2026-01-01", "2026-11-30"), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
})

test("bisnis dipisah per Source; Indonesia: brokerage + EF, margin, sharing komisi SG", () => {
  const report = momReport(CURRENT, PREVIOUS, PERIOD)
  assert.equal(report.current.year, 2026)
  assert.equal(report.previous.year, 2025)
  assert.equal(report.months.length, 11)
  // Maret: 15.000.000 + 10.000.000 + 7.338.551,86 (7.500.000 ÷ 1,022).
  assert.deepEqual(report.current.indonesia[2], {
    brokerage: 32_338_551.86,
    margin: 0,
    commissionExpense: 2_935_420.74,
  })
  assert.deepEqual(report.current.indonesia[3], {
    brokerage: 100_000,
    margin: 200_000,
    commissionExpense: 0,
  })
  assert.deepEqual(report.previous.indonesia[2], {
    brokerage: 10_000_000,
    margin: 0,
    commissionExpense: 0,
  })
  // Bulan lain kosong; Desember tidak ikut.
  const totals = (y: typeof report.current) =>
    y.indonesia.reduce((s, m) => s + m.brokerage + m.margin + m.commissionExpense, 0)
  assert.equal(totals(report.current), 32_338_551.86 + 2_935_420.74 + 300_000)
  assert.equal(totals(report.previous), 10_000_000)
})

test("bisnis Singapore: komisi dan EF MAG, Others = brokerage asuransi lain", () => {
  const report = momReport(CURRENT, PREVIOUS, PERIOD)
  assert.deepEqual(report.current.singapore[2], {
    // 1.500 USD × 16.200 + 50% × 4.000.000.
    magCommission: 26_300_000,
    magFee: 8_100_000,
    others: 2_000_000,
  })
  for (const [i, m] of report.current.singapore.entries()) {
    if (i !== 2) assert.deepEqual(m, { magCommission: 0, magFee: 0, others: 0 })
  }
  assert.ok(report.previous.singapore.every((m) => m.magCommission + m.magFee + m.others === 0))
})

test("workbook mengikuti susunan template dengan rumus total dan NET", async () => {
  const wb = new ExcelJS.Workbook()
  fillMomReport(wb, momReport(CURRENT, PREVIOUS, PERIOD), PERIOD, "2026-11-23")
  const ws = wb.getWorksheet("Laporan MOM")
  assert.ok(ws)
  const value = (ref: string) => ws.getCell(ref).value
  const formula = (ref: string) => (ws.getCell(ref).value as { formula: string }).formula
  const result = (ref: string) => (ws.getCell(ref).value as { result: number }).result

  assert.equal(value("A1"), "PT LCH INSURANCE BROKERS")
  assert.equal(value("A5"), "LCH INDONESIA BUSINESS 2026 AS COMPARED TO 2025")
  assert.equal(value("B6"), "ACTUAL")
  assert.equal(value("B7"), 2026)
  assert.equal(value("N7"), 2025)
  assert.equal(value("B9"), "COMM+EF(MAG) + COMM VIA INTERCO")
  assert.equal(value("J9"), "MARKETING EXP-PREMI BEBAN LCH")
  assert.equal(value("L10"), "k=d-j")
  assert.equal(value("X9"), "NET")

  // Maret di baris 13 (Januari baris 11).
  assert.equal(value("A13"), "March")
  assert.equal(value("B13"), 32_338_551.86)
  assert.equal(value("D13"), null)
  assert.equal(formula("E13"), "SUM(B13:D13)")
  assert.equal(value("F13"), 2_935_420.74)
  assert.equal(value("G13"), null)
  assert.equal(formula("K13"), "SUM(F13:J13)")
  assert.equal(formula("L13"), "E13-K13")
  assert.equal(result("L13"), 29_403_131.12)
  // Rumus tahun pembanding sama dengan tahun laporan (rumus template bergeser).
  assert.equal(value("N13"), 10_000_000)
  assert.equal(formula("Q13"), "SUM(N13:P13)")
  assert.equal(formula("W13"), "SUM(R13:V13)")
  assert.equal(formula("X13"), "Q13-W13")
  assert.equal(result("X13"), 10_000_000)

  // TOTAL baris 22, setelah November.
  assert.equal(value("A21"), "November")
  assert.equal(value("A22"), "TOTAL")
  assert.equal(formula("B22"), "SUM(B11:B21)")
  assert.equal(result("B22"), 32_438_551.86)
  assert.equal(formula("D22"), "SUM(D11:D21)")
  assert.equal(result("L22"), 29_703_131.12)

  // Comparative Indonesia: NET per bulan dari kolom L dan X.
  assert.equal(value("A25"), "COMPARATIVE PRODUKSI LCH INDONESIA")
  assert.deepEqual([value("A27"), value("B27"), value("C27")], ["MONTH", 2026, 2025])
  assert.equal(formula("B31"), "L13")
  assert.equal(result("B31"), 29_403_131.12)
  assert.equal(formula("C31"), "X13")
  assert.equal(formula("B40"), "L22")
  assert.equal(result("B40"), 29_703_131.12)
  assert.equal(value("A42"), MOM_TEMPLATE_NOTES.indonesia)

  // LCH Singapore: Maret di baris 55, TOTAL = a+b+c.
  assert.equal(value("A47"), "LCH SINGAPORE BUSINESS 2026 AS COMPARED TO 2025")
  assert.equal(value("B49"), 2026)
  assert.equal(value("F49"), 2025)
  assert.equal(value("B51"), "COMM + COMM VIA INTERCO (MAG)")
  assert.equal(value("E52"), "d=a+b+c")
  assert.equal(value("A55"), "March")
  assert.deepEqual([value("B55"), value("C55"), value("D55")], [26_300_000, 8_100_000, 2_000_000])
  assert.equal(formula("E55"), "SUM(B55:D55)")
  assert.equal(result("E55"), 36_400_000)
  assert.equal(formula("I55"), "SUM(F55:H55)")
  assert.equal(value("A64"), "TOTAL")

  // Comparative Singapore: MAG = a+b, OTHERS = c, untuk kedua tahun.
  assert.equal(value("A67"), "COMPARATIVE PRODUKSI LCH SINGAPORE")
  assert.deepEqual([value("B69"), value("E69")], [2026, 2025])
  assert.deepEqual(
    ["B70", "C70", "D70", "E70", "F70", "G70"].map(value),
    ["MAG", "OTHERS", "TOTAL", "MAG", "OTHERS", "TOTAL"]
  )
  assert.equal(formula("B73"), "B55+C55")
  assert.equal(result("B73"), 34_400_000)
  assert.equal(formula("C73"), "D55")
  assert.equal(formula("D73"), "SUM(B73:C73)")
  assert.equal(result("D73"), 36_400_000)
  assert.equal(formula("E73"), "F55+G55")
  assert.equal(formula("F73"), "H55")
  assert.equal(formula("B82"), "B64+C64")
  assert.equal(value("A84"), MOM_TEMPLATE_NOTES.mag)
  assert.equal(value("A88"), MOM_TEMPLATE_NOTES.singapore)

  assert.ok(wb.getWorksheet("Keterangan"))
  // File bisa ditulis dan dibaca ulang (merge tidak bertabrakan).
  const copy = new ExcelJS.Workbook()
  await copy.xlsx.load(await wb.xlsx.writeBuffer())
  assert.equal(copy.getWorksheet("Laporan MOM")?.getCell("B55").value, 26_300_000)
})
