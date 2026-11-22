import assert from "node:assert/strict"
import test from "node:test"

import ExcelJS from "exceljs"

import type { RecapPolicy } from "../lib/production-recap"
import {
  fillReserveBasis,
  reserveBasis,
  reserveRevenue,
  reserveRounding,
} from "../lib/reserve-basis"

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
    periodStart: "2026-08-05",
    periodEnd: "2027-08-05",
    productionDate: "2026-08-05",
    recordedDate: "2026-08-06",
    paidDate: null,
    currency: "IDR",
    premium: 100_000_000,
    brokeragePct: 15,
    remarks: null,
    groupingInsured: "RUKMA PADAYA TRANS",
    cobOjkClass: null,
    placementLocation: null,
    insurers: [{ insurer: "PT Asuransi Multi Artha Guna Tbk", share: 100, additionalFeePct: 0 }],
    ...over,
  }
}

test("rounding follows the template: reserve truncated to millions toward zero", () => {
  // Contoh template Team LCH: −2.725.420 → −2.000.000; −40.352.590 → −40.000.000.
  assert.equal(reserveRounding(-2_725_420.38), -2_000_000)
  assert.equal(reserveRounding(-40_352_589.7), -40_000_000)
  assert.equal(reserveRounding(-999_999), 0)
  assert.equal(reserveRounding(1_500_000), 1_000_000)
})

test("revenue per account per month: commission, interco commission, EF, and MOP margin", () => {
  const months = reserveBasis([
    policy(),
    // Endorsement di bulan yang sama, grouping sama: digabung ke satu baris.
    policy({ policyNo: "MC/2026/0001-END1", type: "Endorsement", premium: 10_000_000 }),
    // Source LCH-SG: komisinya lewat interco.
    policy({ policyNo: "MC/2026/0002", sourceCode: "LCH-SG", premium: 20_000_000 }),
    // Deklarasi MOP bermargin dengan EF: premi ke asuransi 1.000.000, tagihan ke klien 1.150.000.
    policy({
      policyNo: "MOP/0001",
      type: "Deklarasi",
      premium: 1_000_000,
      clientPremium: 1_150_000,
      brokeragePct: 0,
      insurers: [{ insurer: "PT Asuransi Multi Artha Guna Tbk", share: 100, additionalFeePct: 10 }],
    }),
    policy({ policyNo: "PAR/2026/0009", groupingInsured: null, clientName: "PT Cahaya Express" }),
    policy({ policyNo: "PAR/2026/0010", productionDate: "2026-09-02" }),
  ])
  assert.deepEqual(
    months.map((m) => [m.month, m.rows.map((r) => r.account)]),
    [
      ["2026-08", ["PT Cahaya Express", "RUKMA PADAYA TRANS"]],
      ["2026-09", ["RUKMA PADAYA TRANS"]],
    ]
  )
  const rukma = months[0].rows[1]
  assert.deepEqual(rukma, {
    account: "RUKMA PADAYA TRANS",
    commission: -16_500_000,
    commissionInterco: -3_000_000,
    fee: -100_000,
    margin: -150_000,
  })
  assert.equal(reserveRevenue(rukma), -19_750_000)
})

test("workbook: one sheet per month with the template columns and live formulas", () => {
  const wb = new ExcelJS.Workbook()
  fillReserveBasis(
    wb,
    reserveBasis([policy(), policy({ policyNo: "PAR/2026/0010", productionDate: "2026-09-02" })]),
    "2026-11-21"
  )
  assert.deepEqual(
    wb.worksheets.map((ws) => ws.name),
    ["08", "09"]
  )
  const ws = wb.getWorksheet("08")!
  assert.equal(ws.getCell("B4").value, "AGUSTUS 2026")
  assert.equal(ws.getCell("C7").value, "COMM")
  assert.equal(ws.getCell("D7").value, "COMM VIA INTERCO")
  assert.equal(ws.getCell("M7").value, "MARKETING EXP-PREMI BEBAN LCH")
  assert.equal(ws.getCell("S7").value, "%")
  assert.equal(ws.getCell("B9").value, "RUKMA PADAYA TRANS")
  assert.equal(ws.getCell("C9").value, -15_000_000)
  // Reserve 40% pendapatan dikurangi total beban (kolom N), lalu dibulatkan ke juta.
  assert.deepEqual(ws.getCell("P9").value, { formula: "H9*40%+N9", result: -6_000_000 })
  assert.deepEqual(ws.getCell("Q9").value, { formula: "ROUNDDOWN(P9,-6)", result: -6_000_000 })
  assert.deepEqual(ws.getCell("R9").value, { formula: "Q9-N9", result: -6_000_000 })
  assert.equal(ws.getCell("B10").value, "TOTAL")
  assert.deepEqual(ws.getCell("C10").value, { formula: "SUM(C9:C9)", result: -15_000_000 })
  // Kolom beban kosong untuk diisi Team LCH.
  assert.equal(ws.getCell("J9").value, null)

  const crossYear = new ExcelJS.Workbook()
  fillReserveBasis(
    crossYear,
    reserveBasis([policy({ productionDate: "2025-12-20" }), policy({ productionDate: "2026-01-05" })]),
    "2026-11-21"
  )
  assert.deepEqual(
    crossYear.worksheets.map((ws) => ws.name),
    ["2025-12", "2026-01"]
  )
})
