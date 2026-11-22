import assert from "node:assert/strict"
import test from "node:test"

import type { OpenCoverRate } from "../lib/data/types"
import { declarationsFromRows, type DeclarationImportContext } from "../lib/declaration-import"
import { declarationMargin } from "../lib/open-cover"
import { recapRows, type RecapPolicy } from "../lib/production-recap"

/**
 * Margin deklarasi MOP: rate ke klien 0,1% (polis di Merimen), rate MOP ke MAG 0,085%, margin
 * 0,015%. Sejak 22 November 2026 premi deklarasi adalah premi ke asuransi menurut rate MOP, dan
 * premi tagihan ke klien disimpan terpisah (Agus).
 */
const MAG: OpenCoverRate[] = [{ id: "a", label: "ALL SHIPMENT", basis: "percent", rate: 0.085 }]

const ctx = (rates: OpenCoverRate[] = MAG): DeclarationImportContext => ({
  rates,
  period: { start: "2026-05-28", end: "2027-05-28" },
  currency: "IDR",
  existingNos: new Set(),
})

const HEADER = ["Cert No.", "Date of Issue", "Sum Insured", "Kategori Rate", "Interest Insured", "Gross Premium"]

test("margin = premi tagihan ke klien − premi ke asuransi", () => {
  assert.equal(declarationMargin({ premium: 850_000, clientPremium: 1_000_000 }), 150_000)
  assert.equal(declarationMargin({ premium: 850_000, clientPremium: 850_000 }), 0)
  assert.equal(declarationMargin({ premium: 850_000, clientPremium: null }), null)
  assert.equal(declarationMargin({ premium: 850_000 }), null)
})

test("upload: Gross Premium file = premi tagihan ke klien, premi deklarasi dari rate MOP", () => {
  const { declarations, errors } = declarationsFromRows(
    [
      HEADER,
      // Gross Premium 0,1% dari Merimen.
      ["000501", "05/12/2026", 1_000_000_000, null, null, 1_000_000],
      // Tanpa Gross Premium: premi dari rate MOP, premi ke klien belum diketahui.
      ["000502", "06/12/2026", 2_000_000_000, null, null, null],
    ],
    ctx()
  )
  assert.deepEqual(errors, [])
  assert.deepEqual(
    declarations.map((d) => [d.policyNo, d.premium, d.clientPremium, declarationMargin(d)]),
    [
      ["000501", 850_000, 1_000_000, 150_000],
      ["000502", 1_700_000, null, null],
    ]
  )
})

test("upload: tanpa kategori rate, premi file dipakai untuk premi ke asuransi dan ke klien", () => {
  const rates: OpenCoverRate[] = [
    { id: "a", label: "DRY", basis: "percent", rate: 0.075 },
    { id: "b", label: "REEFER", basis: "percent", rate: 0.0975 },
    { id: "c", label: "20 FT", basis: "per_unit", rate: 100_000, unit: "container" },
  ]
  const { declarations, errors } = declarationsFromRows(
    [
      HEADER,
      // Kategori tidak diketahui: margin 0 sampai Kategori Rate dipilih di form deklarasi.
      ["000601", "05/12/2026", 1_000_000_000, null, null, 1_000_000],
      ["000602", "05/12/2026", 1_000_000_000, "REEFER", null, 1_200_000],
      ["000603", "05/12/2026", 1_000_000_000, "20 FT", 3, 400_000],
    ],
    ctx(rates)
  )
  assert.deepEqual(errors, [])
  assert.deepEqual(
    declarations.map((d) => [d.policyNo, d.premium, d.clientPremium, declarationMargin(d)]),
    [
      ["000601", 1_000_000, 1_000_000, 0],
      ["000602", 975_000, 1_200_000, 225_000],
      ["000603", 300_000, 400_000, 100_000],
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
    premium: 850_000,
    clientPremium: 1_000_000,
    brokeragePct: 0,
    remarks: null,
    groupingInsured: null,
    cobOjkClass: null,
    placementLocation: null,
    insurers: [{ insurer: "PT Asuransi Multi Artha Guna Tbk", share: 100, additionalFeePct: 0 }],
    ...over,
  }
}

test("Rekap Produksi: margin per asuransi di baris O/I-MARGIN, ditulis negatif seperti pendapatan", () => {
  const [commission, margin] = recapRows([recapPolicy()])
  // Premi produksi = premi ke asuransi menurut rate MOP.
  assert.equal(commission.Premium_Gross_OC, 850_000)
  assert.equal(commission.Margin_Rate_OC, 0)
  // Baris margin: sub akun O/I-MARGIN (catatan Team LCH, 20 November 2026), tanpa premi supaya
  // jumlah premi tidak dobel, dan ikut (Income)/Beban sebagai pendapatan.
  assert.equal(margin["akun pnl"], "INCOME")
  assert.equal(margin["sub akun pnl"], "O/I-MARGIN")
  assert.equal(margin.Premium_Gross_OC, 0)
  assert.equal(margin.Margin_Rate_OC, -150_000)
  assert.equal(margin.Margin_Rate, -150_000)
  assert.equal(margin["(Income)/Beban"], -150_000)
  // Persen dari premi produksi (premi ke asuransi), seperti kolom Percentage baris lain.
  assert.equal(margin.Percentage, -150_000 / 850_000)

  // Co-insurance: margin dibagi sesuai share.
  const shared = recapRows([
    recapPolicy({
      insurers: [
        { insurer: "PT A", share: 60, additionalFeePct: 0 },
        { insurer: "PT B", share: 40, additionalFeePct: 0 },
      ],
    }),
  ])
  assert.deepEqual(
    shared.filter((r) => r["sub akun pnl"] === "O/I-MARGIN").map((r) => r.Margin_Rate_OC),
    [-90_000, -60_000]
  )

  // Polis biasa dan deklarasi tanpa premi tagihan ke klien: tidak ada baris margin.
  const plain = recapRows([recapPolicy({ type: "Baru", clientPremium: null })])
  assert.deepEqual(plain.map((r) => r["sub akun pnl"]), ["COMM"])
  // USD: kolom Rupiah memakai kurs report.
  const [, usd] = recapRows([recapPolicy({ currency: "USD", premium: 85, clientPremium: 100 })], { USD: 16_000 })
  assert.deepEqual([usd.Margin_Rate_OC, usd.Margin_Rate], [-15, -240_000])
})
