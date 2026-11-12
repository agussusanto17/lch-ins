import assert from "node:assert/strict"
import test from "node:test"

import {
  RECAP_COLUMNS,
  RECAP_HEADERS,
  recapDate,
  recapRows,
  type RecapPolicy,
} from "../lib/production-recap"

function policy(over: Partial<RecapPolicy> = {}): RecapPolicy {
  return {
    policyNo: "018/LCH-PLCMT/CI-MV/XI/2026",
    parentPolicyNo: null,
    slipNo: "018/LCH-PLCMT/PS-MV/XI/2026",
    type: "Baru",
    endorsementSeq: null,
    insuredName: "PT NUSANTARA FLEET SERVICES",
    clientName: "PT Nusantara Fleet Services",
    clientType: "Korporasi",
    clientCodes: {},
    sourceCode: "LCH-ID",
    sourceName: "PT. LCH Insurance Brokers",
    cobCode: "02",
    cobName: "MOTOR VEHICLE",
    coverCode: "0201",
    coverName: "PSKBI",
    periodStart: "2026-11-01",
    periodEnd: "2027-11-01",
    productionDate: "2026-11-01",
    recordedDate: "2026-11-12",
    paidDate: null,
    currency: "IDR",
    premium: 1_000_000,
    brokeragePct: 15,
    remarks: null,
    groupingInsured: null,
    cobOjkClass: null,
    placementLocation: null,
    insurers: [{ insurer: "PT Asuransi Multi Artha Guna Tbk", share: 100, additionalFeePct: 0 }],
    ...over,
  }
}

test("the recap has the 49 headers of the LCH sample, in order", () => {
  assert.equal(RECAP_HEADERS.length, 49)
  assert.equal(RECAP_COLUMNS.length, 49)
  assert.deepEqual(RECAP_HEADERS.slice(0, 5), ["refno", "voucher", "thn", "mth", "insured"])
  assert.equal(RECAP_HEADERS[30], "RM_Fee_OC")
  assert.equal(RECAP_HEADERS[48], "Perusahaan/Perorangan")
})

test("dates follow the sample format MM/DD/YYYY", () => {
  assert.equal(recapDate("2025-12-21"), "12/21/2025")
  assert.equal(recapDate(null), "")
})

test("a USD row matches the sample: rupiah from the unrounded original amounts", () => {
  const [row] = recapRows(
    [policy({ currency: "USD", premium: 80_013.96, brokeragePct: 0.15 })],
    { USD: 16_782 }
  )
  assert.equal(row.rate, 16_782)
  assert.equal(row.Premium_Gross_OC, 80_013.96)
  assert.equal(row.Premium_Gross, 1_342_794_276.72)
  assert.equal(row.Premium_Commission_OC, -120.02)
  assert.equal(row.Premium_Commission, -2_014_191.42)
  assert.equal(row["(Income)/Beban"], -2_014_191.42)
  assert.equal(row.Percentage, -0.0015)
})

test("co-insurance gives one row per insurer with its premium share and fee percent", () => {
  const rows = recapRows([
    policy({
      insurers: [
        { insurer: "PT Asuransi Astra Buana", share: 60, additionalFeePct: 12.5 },
        { insurer: "PT Asuransi Sinar Mas", share: 40, additionalFeePct: 10 },
      ],
    }),
  ])
  assert.equal(rows.length, 2)
  assert.deepEqual(
    rows.map((r) => [r.asuransi, r.Premium_Gross, r.Premium_Commission, r.RM_Fee, r["(Income)/Beban"]]),
    [
      ["PT Asuransi Astra Buana", 600_000, -90_000, -75_000, -165_000],
      ["PT Asuransi Sinar Mas", 400_000, -60_000, -40_000, -100_000],
    ]
  )
  assert.equal(rows[0].cob, "02 - MOTOR VEHICLE")
  assert.equal(rows[0].toc, "0201 - PSKBI")
  assert.equal(rows[0].tipe, "NEW")
  assert.equal(rows[0].source, "LCH-ID - PT. LCH Insurance Brokers")
  assert.equal(rows[0]["Perusahaan/Perorangan"], "Perusahaan")
  assert.equal(rows[0].thn, 2026)
  assert.equal(rows[0].mth, 11)
})

test("the insured column uses the client code of each insurer when Marketing has it", () => {
  const rows = recapRows([
    policy({
      clientName: "BUANA LINTAS LAUTAN TBK",
      clientCodes: { "PT Asuransi Multi Artha Guna Tbk": "D45BL00001" },
    }),
  ])
  assert.equal(rows[0].insured, "D45BL00001 - BUANA LINTAS LAUTAN TBK")
  assert.equal(rows[0]["Insured Name"], "D45BL00001 - BUANA LINTAS LAUTAN TBK")
  assert.equal(rows[0]["Grouping Insured"], "BUANA LINTAS LAUTAN TBK")
})

test("an endorsement row carries the parent policy number, sequence, and parent period", () => {
  const [row] = recapRows([
    policy({
      type: "Endorsement",
      policyNo: "019/LCH-PLCMT/ES-MV/XI/2026",
      parentPolicyNo: "45020125022398",
      endorsementSeq: 5,
      periodStart: "2025-05-01",
      periodEnd: "2026-04-30",
      productionDate: "2026-01-06",
      remarks: "Additional accessories",
    }),
  ])
  assert.equal(row.tipe, "ENDORSE")
  assert.equal(row.policyno, "45020125022398")
  assert.equal(row.CERTIFICATENO, "019/LCH-PLCMT/ES-MV/XI/2026")
  assert.equal(row.eseqno, 5)
  assert.equal(row.sdate, "05/01/2025")
  assert.equal(row.edate, "04/30/2026")
  assert.equal(row.mth, 1)
  assert.equal(row.Note, "Additional accessories")
})

test("a cancellation refund reverses income, so commission and fee turn positive", () => {
  const [row] = recapRows([
    policy({
      type: "Cancellation",
      premium: -200_000,
      insurers: [{ insurer: "PT Asuransi Astra Buana", share: 100, additionalFeePct: 15 }],
    }),
  ])
  assert.equal(row.tipe, "CANCEL")
  assert.equal(row.Premium_Gross, -200_000)
  assert.equal(row.Premium_Commission, 30_000)
  assert.equal(row.RM_Fee, 30_000)
})
