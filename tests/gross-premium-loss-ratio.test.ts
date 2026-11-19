import assert from "node:assert/strict"
import test from "node:test"

import {
  grossPremium,
  nettPremium,
  recalcSlip,
  slipDiscountAmount,
  slipPolicyDiscount,
} from "../lib/calc"
import { closingSummary } from "../lib/closing-summary"
import { emptySlip, switchCob } from "../components/underwriting/slip-model"
import type { PlacingSlip } from "../lib/data/types"
import {
  lossRatio,
  lossRatioClaimValue,
  lossRatioTable,
  type LossRatioClaim,
  type LossRatioYear,
} from "../lib/loss-ratio"
import { policyFieldsFromSlip } from "../lib/policy-from-slip"
import { recapRows, type RecapPolicy } from "../lib/production-recap"

/** Contoh perhitungan MoM poin 19. */
const POLICY = {
  premium: 100_000_000,
  discountAmount: 10_000_000,
  brokeragePct: 15,
  additionalFee: 5_000_000,
  currency: "IDR",
}

const claim = (patch: Partial<LossRatioClaim>): LossRatioClaim => ({
  id: "c1",
  status: "Settled",
  estimatedLoss: 0,
  paidAmount: 0,
  adjusterFeeAmount: 0,
  salvageAmount: 0,
  currency: "IDR",
  ...patch,
})

test("Gross dan Nett Premium sesuai contoh MoM poin 19", () => {
  assert.equal(grossPremium(POLICY), 90_000_000)
  assert.equal(nettPremium(POLICY), 70_000_000)
  // Pengembalian premi: diskon ikut negatif.
  assert.equal(grossPremium({ premium: -1_000_000, discountAmount: -100_000 }), -900_000)
})

test("loss ratio contoh MoM: Gross 45,56%, Nett 58,57%", () => {
  const r = lossRatio(
    [POLICY],
    [claim({ paidAmount: 40_000_000, adjusterFeeAmount: 2_000_000, salvageAmount: 1_000_000 })]
  )
  assert.equal(r.grossPremium, 90_000_000)
  assert.equal(r.nettPremium, 70_000_000)
  assert.equal(r.incurred, 41_000_000)
  assert.equal(r.grossRatio?.toFixed(2), "45.56")
  assert.equal(r.nettRatio?.toFixed(2), "58.57")
})

test("nilai klaim per status: dibayar untuk Settled/Closed, estimasi untuk yang berjalan, Rejected 0", () => {
  const base = { estimatedLoss: 50, paidAmount: 30 }
  assert.deepEqual(
    (["Outstanding", "Partial Settle", "Settled", "Closed", "Rejected"] as const).map((status) =>
      lossRatioClaimValue({ ...base, status })
    ),
    [50, 50, 30, 30, 0]
  )
  const r = lossRatio(
    [POLICY],
    [
      claim({ id: "a", status: "Outstanding", estimatedLoss: 9_000_000 }),
      claim({ id: "b", status: "Rejected", estimatedLoss: 50_000_000, adjusterFeeAmount: 1_000_000 }),
    ]
  )
  assert.equal(r.claimCount, 1)
  assert.equal(r.incurred, 9_000_000)
  assert.equal(r.grossRatio, 10)
})

const year = (policyId: string, start: string, patch: Partial<LossRatioYear> = {}): LossRatioYear => ({
  policyId,
  policyNo: `P-${policyId}`,
  inceptionDate: start,
  expiryDate: start,
  policies: [POLICY],
  claims: [],
  ...patch,
})

test("isian form menggantikan klaim tersimpan dan masuk ke tahun polis klaim; premi 0 tidak punya rasio", () => {
  const data = {
    currentPolicyId: "y2",
    years: [
      year("y1", "2025-01-01", { claims: [claim({ id: "old", paidAmount: 9_000_000 })] }),
      year("y2", "2026-01-01", { claims: [claim({ id: "c1", paidAmount: 9_000_000 })] }),
    ],
  }
  const edited = lossRatioTable(data, claim({ id: "c1", paidAmount: 18_000_000 }))
  assert.deepEqual(
    edited.years.map((y) => [y.policyId, y.current, y.incurred, y.grossRatio]),
    [
      ["y1", false, 9_000_000, 10],
      ["y2", true, 18_000_000, 20],
    ]
  )
  assert.equal(edited.total.incurred, 27_000_000)
  assert.equal(edited.total.grossRatio, 15)
  // Klaim baru di form ditambahkan ke tahun polisnya.
  const added = lossRatioTable(data, claim({ id: "draft", paidAmount: 4_500_000 }))
  assert.deepEqual(added.years.map((y) => y.claimCount), [1, 2])
  assert.equal(added.total.incurred, 22_500_000)

  const empty = lossRatio([{ ...POLICY, premium: 0, discountAmount: 0, additionalFee: 0 }], [])
  assert.equal(empty.grossRatio, null)
  assert.equal(empty.nettRatio, null)
})

test("sheet Perhitungan LOSS RATIO Team LCH: per tahun dan total, brokerage 25%", () => {
  // Premi dan klaim 2019–2023 dari sheet, dibulatkan ke sen seperti kolom numeric(18,2).
  const rows: Array<[string, number, number]> = [
    ["2019", 2_093_667.94, 0],
    ["2020", 68_667_680.11, 14_439_840],
    ["2021", 197_266_361.42, 9_177_763],
    ["2022", 190_999_833.46, 33_791_732],
    ["2023", 234_759_259.49, 80_077_975],
  ]
  const data = {
    currentPolicyId: "2023",
    years: rows.map(([y, premium, paid]) =>
      year(y, `${y}-01-01`, {
        policies: [{ premium, discountAmount: 0, brokeragePct: 25, additionalFee: 0, currency: "IDR" }],
        claims: paid ? [claim({ id: `c${y}`, paidAmount: paid })] : [],
      })
    ),
  }
  const t = lossRatioTable(data, null)
  const pct = (v: number | null) => v?.toFixed(2)
  assert.deepEqual(
    t.years.map((y) => [pct(y.nettRatio), pct(y.grossRatio)]),
    [
      ["0.00", "0.00"],
      ["28.04", "21.03"],
      ["6.20", "4.65"],
      ["23.59", "17.69"],
      ["45.48", "34.11"],
    ]
  )
  assert.equal(t.total.incurred, 137_487_310)
  assert.equal(pct(t.total.nettRatio), "26.42")
  assert.equal(pct(t.total.grossRatio), "19.82")
})

/** Slip Liability premi 10.000.000, diskon 10%, brokerage 15%, satu asuransi fee 0. */
function liabilitySlip(): PlacingSlip {
  return {
    ...switchCob(emptySlip(), "Liability"),
    rateLines: [{ id: "r1", label: "Rate (%)", rate: 1, premium: 10_000_000 }],
    discountPct: 10,
    brokeragePct: 15,
    securityPanel: [{ id: "p1", insurer: "PT A", share: 100, role: "As Leader" }],
  }
}

test("diskon slip ikut tercatat di polis dan Ringkasan Penutupan", () => {
  const slip = liabilitySlip()
  assert.equal(slipDiscountAmount(slip), 1_000_000)
  assert.equal(policyFieldsFromSlip(slip, null).discountAmount, 1_000_000)
  const s = closingSummary(slip)
  assert.equal(s.discount, 1_000_000)
  assert.equal(s.gross, 9_000_000)
  // Brokerage dari premi sebelum diskon: 10.000.000 × 15%.
  assert.equal(s.brokerage, 1_500_000)
  assert.equal(s.net, 7_500_000)
})

test("slip PAR + EQVET: diskon per bagian polis", () => {
  const slip = switchCob(emptySlip(), "Property")
  const priced = recalcSlip({
    ...slip,
    sumInsuredSection1: [{ id: "md", description: "Building", amount: 12_000_000_000 }],
    rateLines: slip.rateLines.map((l) => ({
      ...l,
      rate: l.label === "FLEXAS" ? 1 : l.label === "EQVET" ? 0.5 : null,
    })),
    discountPct: 10,
  })
  assert.equal(slipPolicyDiscount(priced, "PAR"), 1_200_000)
  assert.equal(slipPolicyDiscount(priced, "EQVET"), 600_000)
  assert.equal(slipPolicyDiscount(priced, null), 1_800_000)
})

test("Rekap Produksi: Premium_Discount negatif sesuai share", () => {
  const policy: RecapPolicy = {
    policyNo: "P-1",
    parentPolicyNo: null,
    slipNo: "001/LCH-PLCMT/PS/XI/2026",
    type: "Baru",
    endorsementSeq: null,
    insuredName: "PT A",
    clientName: "PT A",
    clientCodes: {},
    clientType: "Korporasi",
    sourceCode: null,
    sourceName: null,
    cobCode: "01",
    cobName: "Liability",
    coverCode: null,
    coverName: null,
    periodStart: "2026-11-01",
    periodEnd: "2027-11-01",
    productionDate: "2026-11-01",
    recordedDate: "2026-11-01",
    paidDate: null,
    currency: "IDR",
    premium: 10_000_000,
    discount: 1_000_000,
    brokeragePct: 15,
    remarks: null,
    groupingInsured: null,
    cobOjkClass: null,
    placementLocation: null,
    insurers: [
      { insurer: "PT X", share: 60, additionalFeePct: 0 },
      { insurer: "PT Y", share: 40, additionalFeePct: 0 },
    ],
  }
  const rows = recapRows([policy])
  assert.deepEqual(
    rows.map((r) => [r.Premium_Gross_OC, r.Premium_Discount_OC, r.Premium_Commission_OC]),
    [
      [6_000_000, -600_000, -900_000],
      [4_000_000, -400_000, -600_000],
    ]
  )
})
