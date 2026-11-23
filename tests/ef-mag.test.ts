import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip, switchCob } from "../components/underwriting/slip-model"
import {
  feeBeforeVat,
  magCommissionVat,
  magCommissionVatFor,
  nettPremium,
  roundCents,
} from "../lib/calc"
import { closingSummary } from "../lib/closing-summary"
import { feeIdr } from "../lib/data/analytics"
import type { PlacingSlip, SecurityPanelRow } from "../lib/data/types"
import { outgo, policyShare, type LrPolicy } from "../lib/loss-ratio-report"
import { recapRows, type RecapPolicy } from "../lib/production-recap"

/**
 * EF MAG sesuai produksi MAG (sheet TARIF EF Team LCH, kolom "ef (sesuai prod mag)"; Agus, 23
 * November 2026): outgo 42,5% = FB 15% excl. VAT + EF 27,5% incl. VAT, EF sebelum PPN = 42,5% −
 * 15% − (15% × 2,2%) = 27,17%. EF MAG tidak kena PPN sendiri; PPN-nya hanya PPN komisi.
 */
const MAG = "PT Asuransi Multi Artha Guna Tbk"
const ASTRA = "PT Asuransi Astra Buana"
const MASTER = [
  { name: MAG, feeSubAccountCode: "ef_mag" },
  { name: ASTRA, feeSubAccountCode: "ef" },
]
const magFee = { additionalFeePct: 27.5, additionalFeeIncludeVat: true, feeSubAccountCode: "ef_mag" }

function slipWith(panel: SecurityPanelRow[], extra: Partial<PlacingSlip> = {}): PlacingSlip {
  return {
    ...switchCob(emptySlip(), "Motor Vehicle"),
    rateLines: [{ id: "r1", label: "Rate", rate: null, premium: 100_000_000 }],
    tplLines: [],
    paLines: [],
    brokeragePct: 15,
    includeVat: false,
    securityPanel: panel,
    ...extra,
  }
}

const row = (insurer: string, share: number, additionalFeePct: number): SecurityPanelRow => ({
  id: insurer,
  insurer,
  share,
  role: share >= 50 ? "As Leader" : "As Member",
  additionalFeePct,
  additionalFeeIncludeVat: true,
})

test("EF MAG sama dengan sheet TARIF EF: 42,5% − 15% − 0,33% = 27,17%", () => {
  // Baris MAG sheet "2 NOV": premi share 1.563.343.723,45, EF 424.760.489,66.
  const premium = 1_563_343_723.45
  const commission = (premium * 15) / 100
  const vat = magCommissionVat(magFee, commission, false)
  assert.equal(roundCents(feeBeforeVat((premium * 27.5) / 100, true, vat)), 424_760_489.66)
  // Brokerage incl. VAT sudah memuat PPN komisinya: EF MAG utuh.
  assert.equal(magCommissionVat(magFee, commission, true), 0)
  // Asuransi lain, fee excl. VAT, atau tanpa fee: aturan umum.
  assert.equal(magCommissionVat({ ...magFee, feeSubAccountCode: "ef" }, commission, false), undefined)
  assert.equal(magCommissionVat({ ...magFee, additionalFeeIncludeVat: false }, commission, false), undefined)
  assert.equal(magCommissionVat({ ...magFee, additionalFeePct: 0 }, commission, false), undefined)
})

test("Rekap Produksi: Percentage EF MAG −27,17%, asuransi lain × 97,8%", () => {
  const policy = (insurer: string, code: string): RecapPolicy => ({
    policyNo: "PAR/2026/0001",
    parentPolicyNo: null,
    slipNo: "001/LCH-PLCMT/PS-PAR/XI/2026",
    type: "Baru",
    endorsementSeq: null,
    insuredName: "PT D'BEST",
    clientName: "PT D'Best",
    clientType: "Korporasi",
    clientCodes: {},
    sourceCode: "LCH-ID",
    sourceName: "PT. LCH Insurance Brokers",
    cobCode: "01",
    cobName: "PROPERTY",
    coverCode: null,
    coverName: null,
    periodStart: "2026-11-01",
    periodEnd: "2027-11-01",
    productionDate: "2026-11-01",
    recordedDate: "2026-11-01",
    paidDate: null,
    currency: "IDR",
    premium: 1_563_343_723.45,
    brokeragePct: 15,
    remarks: null,
    groupingInsured: "D'BEST",
    cobOjkClass: null,
    placementLocation: null,
    insurers: [
      {
        insurer,
        share: 100,
        additionalFeePct: 27.5,
        additionalFeeIncludeVat: true,
        feeSubAccount: code === "ef_mag" ? "EF (MAG)" : "EF",
        feeSubAccountCode: code,
      },
    ],
  })
  const ef = (rows: ReturnType<typeof recapRows>) => rows.find((r) => r["sub akun pnl"] !== "COMM")!

  const mag = ef(recapRows([policy(MAG, "ef_mag")]))
  assert.equal(mag["sub akun pnl"], "EF (MAG)")
  assert.equal(mag.RM_Fee, -424_760_489.66)
  assert.ok(Math.abs((mag.Percentage as number) + 0.2717) < 1e-12)

  const other = ef(recapRows([policy(ASTRA, "ef")]))
  assert.equal(other.RM_Fee, -420_461_294.42)
  assert.ok(Math.abs((other.Percentage as number) + 0.26895) < 1e-12)
})

test("Ringkasan Penutupan MAG: EF 27,17%, PPN hanya PPN komisi, net = premi − 42,5%", () => {
  const s = closingSummary(slipWith([row(MAG, 100, 27.5)]), MASTER)
  assert.equal(s.magFee, true)
  assert.equal(s.brokerage, 15_000_000)
  assert.equal(s.brokerageVat, 330_000)
  assert.equal(s.fee, 27_170_000)
  assert.equal(s.feeVat, 0)
  assert.equal(s.net, 57_500_000)
  assert.equal(s.income, 42_500_000)
  assert.equal(s.incomeVat, 330_000)

  // Tanpa kode Sub akun EF: aturan umum EF × 97,8% dan PPN komisi ditambahkan.
  const general = closingSummary(slipWith([row(MAG, 100, 27.5)]))
  assert.equal(general.magFee, false)
  assert.equal(general.fee, 26_895_000)
  assert.equal(general.feeVat, 605_000)
  assert.equal(general.net, 57_170_000)
})

test("MAG dengan brokerage incl. VAT: PPN komisi di dalam brokerage, EF utuh", () => {
  const s = closingSummary(slipWith([row(MAG, 100, 27.5)], { includeVat: true }), MASTER)
  assert.equal(s.brokerage, 14_677_103.72)
  assert.equal(s.brokerageVat, 322_896.28)
  assert.equal(s.fee, 27_500_000)
  assert.equal(s.feeVat, 0)
  assert.equal(s.net, 57_500_000)
})

test("co-insurance MAG 60% + Astra 40%: aturan MAG hanya untuk bagian MAG", () => {
  const s = closingSummary(slipWith([row(MAG, 60, 27.5), row(ASTRA, 40, 25)]), MASTER)
  // MAG: EF 16.500.000 − PPN komisi 198.000; Astra: EF 10.000.000 × 97,8%.
  assert.equal(s.fee, 16_302_000 + 9_780_000)
  assert.equal(s.feeVat, 220_000)
  assert.deepEqual(
    s.insurers.map((r) => [r.insurer, r.brokerage, r.fee, r.vat, r.net]),
    [
      // Net MAG = 60.000.000 × 57,5%.
      [MAG, 9_000_000, 16_302_000, 198_000, 34_500_000],
      // Astra: PPN komisi 132.000 ditambahkan + PPN EF 220.000.
      [ASTRA, 6_000_000, 9_780_000, 352_000, 23_868_000],
    ]
  )
  assert.equal(s.net, 34_500_000 + 23_868_000)
})

test("form polis, Loss Ratio, dan Report Operational memakai aturan MAG yang sama", () => {
  const rows = [{ share: 100, ...magFee }]
  const magVat = magCommissionVatFor(100_000_000, rows, { pct: 15 })
  assert.equal(magVat, 330_000)
  assert.equal(magCommissionVatFor(100_000_000, rows, { pct: 15, includeVat: true }), 0)
  // Nett Premium form polis: PPN komisi MAG tidak ditambahkan lagi.
  const policy = { premium: 100_000_000, brokeragePct: 15, additionalFee: 27_500_000 }
  assert.equal(nettPremium({ ...policy, vatAdded: 330_000 - magVat }), 57_500_000)

  const lr: LrPolicy = {
    id: "p1",
    rootId: "p1",
    yearStart: "2026-11-01",
    policyNo: "PAR/2026/0001",
    type: "Baru",
    cobCode: "01",
    cob: "PROPERTY",
    account: "D'BEST",
    currency: "IDR",
    premium: 100_000_000,
    discount: 0,
    brokeragePct: 15,
    insurers: [{ insurer: MAG, share: 100, ...magFee }],
  }
  const share = policyShare(lr, lr.insurers[0])
  assert.equal(roundCents(share.fee), 27_170_000)
  assert.equal(roundCents(share.vat), 330_000)
  assert.equal(outgo({ ...share, claim: 0 }), 42_500_000)

  assert.equal(
    feeIdr({
      additionalFee: 27_500_000,
      currency: "IDR",
      premium: 100_000_000,
      brokeragePct: 15,
      includeVat: false,
      insurers: rows,
    }),
    27_170_000
  )
})
