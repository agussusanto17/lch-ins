import assert from "node:assert/strict"
import test from "node:test"

import type { OpenCoverRate } from "../lib/data/types"
import { declarationsFromRows, type DeclarationImportContext } from "../lib/declaration-import"
import { declarationMargin } from "../lib/open-cover"
import { recapRows, type RecapPolicy } from "../lib/production-recap"

/**
 * Margin rate deklarasi MOP (Agus, 20 November 2026): rate ke klien 0,1% (polis di Merimen),
 * rate MOP ke MAG 0,085%, margin 0,015%.
 */
const MAG: OpenCoverRate[] = [{ id: "a", label: "ALL SHIPMENT", basis: "percent", rate: 0.085 }]

const ctx = (rates: OpenCoverRate[] = MAG): DeclarationImportContext => ({
  rates,
  period: { start: "2026-05-28", end: "2027-05-28" },
  currency: "IDR",
  existingNos: new Set(),
})

const HEADER = ["Cert No.", "Date of Issue", "Sum Insured", "Kategori Rate", "Interest Insured", "Gross Premium"]

test("margin = premi ke klien − premi ke asuransi", () => {
  assert.equal(declarationMargin({ premium: 1_000_000, insurerPremium: 850_000 }), 150_000)
  assert.equal(declarationMargin({ premium: 850_000, insurerPremium: 850_000 }), 0)
  assert.equal(declarationMargin({ premium: 1_000_000, insurerPremium: null }), null)
  assert.equal(declarationMargin({ premium: 1_000_000 }), null)
})

test("upload: Gross Premium dari file rate klien, premi ke asuransi dari rate MOP", () => {
  const { declarations, errors } = declarationsFromRows(
    [
      HEADER,
      // Gross Premium 0,1% dari Merimen.
      ["000501", "05/12/2026", 1_000_000_000, null, null, 1_000_000],
      // Tanpa Gross Premium: premi dari rate MOP, jadi tidak ada margin.
      ["000502", "06/12/2026", 2_000_000_000, null, null, null],
    ],
    ctx()
  )
  assert.deepEqual(errors, [])
  assert.deepEqual(
    declarations.map((d) => [d.policyNo, d.premium, d.insurerPremium, declarationMargin(d)]),
    [
      ["000501", 1_000_000, 850_000, 150_000],
      ["000502", 1_700_000, 1_700_000, 0],
    ]
  )
})

test("upload: kategori tidak diketahui berarti premi ke asuransi kosong", () => {
  const rates: OpenCoverRate[] = [
    { id: "a", label: "DRY", basis: "percent", rate: 0.075 },
    { id: "b", label: "REEFER", basis: "percent", rate: 0.0975 },
    { id: "c", label: "20 FT", basis: "per_unit", rate: 100_000, unit: "container" },
  ]
  const { declarations, errors } = declarationsFromRows(
    [
      HEADER,
      ["000601", "05/12/2026", 1_000_000_000, null, null, 1_000_000],
      ["000602", "05/12/2026", 1_000_000_000, "REEFER", null, 1_200_000],
      ["000603", "05/12/2026", 1_000_000_000, "20 FT", 3, 400_000],
    ],
    ctx(rates)
  )
  assert.deepEqual(errors, [])
  assert.deepEqual(
    declarations.map((d) => [d.policyNo, d.insurerPremium]),
    [
      ["000601", null],
      ["000602", 975_000],
      ["000603", 300_000],
    ]
  )
})

function recapPolicy(over: Partial<RecapPolicy> = {}): RecapPolicy {
  return {
    policyNo: "000501",
    parentPolicyNo: "45031126000502",
    slipNo: null,
    type: "Deklarasi",
    endorsementSeq: null,
    insuredName: "CV KARYA MITRA KASIH",
    clientName: null,
    clientType: null,
    clientCodes: {},
    sourceCode: null,
    sourceName: null,
    cobCode: "03",
    cobName: "Marine Cargo",
    coverCode: "0311",
    coverName: "Marine Open Policy",
    periodStart: "2026-05-28",
    periodEnd: "2027-05-28",
    productionDate: "2026-12-05",
    recordedDate: "2026-12-06",
    paidDate: null,
    currency: "IDR",
    premium: 1_000_000,
    insurerPremium: 850_000,
    brokeragePct: 0,
    remarks: null,
    groupingInsured: null,
    cobOjkClass: null,
    placementLocation: null,
    insurers: [{ insurer: "PT Asuransi Multi Artha Guna Tbk", share: 100, additionalFeePct: 0 }],
    ...over,
  }
}

test("Rekap Produksi: kolom margin rate per asuransi, ditulis negatif seperti pendapatan", () => {
  const [row] = recapRows([recapPolicy()])
  assert.equal(row.Premium_Gross_OC, 1_000_000)
  assert.equal(row.Margin_Rate_OC, -150_000)
  assert.equal(row.Margin_Rate, -150_000)
  // (Income)/Beban tetap komisi + fee seperti contoh LCH.
  assert.equal(row["(Income)/Beban"], 0)

  // Co-insurance: margin dibagi sesuai share.
  const shared = recapRows([
    recapPolicy({
      insurers: [
        { insurer: "PT A", share: 60, additionalFeePct: 0 },
        { insurer: "PT B", share: 40, additionalFeePct: 0 },
      ],
    }),
  ])
  assert.deepEqual(shared.map((r) => r.Margin_Rate_OC), [-90_000, -60_000])

  // Polis biasa dan deklarasi tanpa premi ke asuransi: margin 0.
  const [plain] = recapRows([recapPolicy({ type: "Baru", insurerPremium: null })])
  assert.equal(plain.Margin_Rate_OC, 0)
  // USD: kolom Rupiah memakai kurs report.
  const [usd] = recapRows([recapPolicy({ currency: "USD", premium: 100, insurerPremium: 85 })], { USD: 16_000 })
  assert.deepEqual([usd.Margin_Rate_OC, usd.Margin_Rate], [-15, -240_000])
})
