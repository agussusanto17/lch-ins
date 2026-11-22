import assert from "node:assert/strict"
import test from "node:test"

import {
  additionalFeeVatAddedFor,
  brokerageAmount,
  brokerageVatAdded,
  nettPremium,
  recalcSlip,
  vatAdded,
} from "../lib/calc"
import { closingSummary } from "../lib/closing-summary"
import type { PlacingSlip } from "../lib/data/types"
import { itemGroups } from "../lib/slip-items"
import { emptySlip, switchCob } from "../components/underwriting/slip-model"

/**
 * PPN 2,2% brokerage dan additional fee (Agus, 20 November 2026). Contoh slip LCH menulis
 * "Brokerage 15% excl. VAT": PPN ditambahkan di atas komisi dan ikut dipotong dari premi ke
 * asuransi. Incl. VAT: PPN sudah di dalam nominalnya.
 */
function mvSlip(patch: Partial<PlacingSlip> = {}): PlacingSlip {
  const base = switchCob(emptySlip(), "Motor Vehicle")
  const first = itemGroups(recalcSlip(base))[0]
  return recalcSlip({
    ...base,
    inceptionDate: "2026-11-20",
    expiryDate: "2027-11-20",
    interestItems: [{ ...first.item, id: "v1", amount: 1_000_000_000 }],
    rateLines: first.rateLines.map((l, i) => ({
      ...l,
      id: `v1-r${i + 1}`,
      vehicleId: "v1",
      rate: i === 0 ? 1 : null,
    })),
    tplLines: first.tplLines.map((l, i) => ({
      ...l,
      id: `v1-t${i + 1}`,
      vehicleId: "v1",
      basis: "0",
      rate: null,
    })),
    paLines: first.paLines.map((l, i) => ({ ...l, id: `v1-p${i + 1}`, vehicleId: "v1" })),
    brokeragePct: 15,
    includeVat: false,
    securityPanel: [
      {
        id: "a",
        insurer: "PT A",
        share: 60,
        role: "As Leader",
        additionalFeePct: 10,
        additionalFeeIncludeVat: true,
      },
      {
        id: "b",
        insurer: "PT B",
        share: 40,
        role: "As Member",
        additionalFeePct: 12.5,
        additionalFeeIncludeVat: false,
      },
    ],
    ...patch,
  })
}

test("PPN excl. VAT = 2,2% di atas nominal; incl. VAT tidak menambah", () => {
  assert.equal(vatAdded(1_500_000, false), 33_000)
  assert.equal(vatAdded(1_500_000, undefined), 33_000)
  assert.equal(vatAdded(1_500_000, true), 0)
  assert.equal(vatAdded(132_001_920, false), 2_904_042.24)
})

test("ringkasan penutupan: PPN excl. VAT ikut dipotong dari premi ke asuransi", () => {
  const slip = mvSlip()
  const s = closingSummary(slip)
  assert.equal(s.premium, 10_000_000)
  // Brokerage 15% excl. VAT: 1.500.000 + PPN 33.000.
  assert.equal(s.brokerage, 1_500_000)
  assert.equal(s.brokerageVat, 33_000)
  assert.equal(brokerageVatAdded(slip), 33_000)
  // Fee A 10% incl. VAT (600.000 = 587.084,15 + PPN 12.915,85), fee B 12,5% excl. VAT
  // (500.000 + PPN 11.000). Fee ditulis sebelum PPN (Agus, 22 November 2026).
  assert.equal(s.fee, 1_087_084.15)
  assert.equal(s.feeVat, 23_915.85)
  assert.equal(s.net, 10_000_000 - 1_500_000 - 1_100_000 - 44_000)
  // Diterima LCH: brokerage + fee + PPN ditambahkan; PPN total = di dalam fee A + ditambahkan.
  assert.equal(s.income, 2_644_000)
  assert.equal(s.incomeVat, 12_915.85 + 44_000)

  assert.deepEqual(
    s.insurers.map((r) => [r.insurer, r.premium, r.brokerage, r.fee, r.vat, r.net]),
    [
      ["PT A", 6_000_000, 900_000, 587_084.15, 32_715.85, 4_480_200],
      ["PT B", 4_000_000, 600_000, 500_000, 24_200, 2_875_800],
    ]
  )
  assert.equal(
    s.insurers.reduce((sum, r) => sum + r.net, 0),
    s.net
  )
})

test("semua incl. VAT: PPN diambil dari dalam nominal, net sama dengan sebelumnya", () => {
  const slip = mvSlip({
    includeVat: true,
    securityPanel: mvSlip().securityPanel!.map((r) => ({ ...r, additionalFeeIncludeVat: true })),
  })
  const s = closingSummary(slip)
  // Brokerage 15% incl. VAT = 14,6771%: 1.500.000 ÷ 1,022 = 1.467.710,37 + PPN 32.289,63
  // (Agus, 22 November 2026).
  assert.equal(brokerageAmount(slip), 1_467_710.37)
  assert.equal(s.brokerage, 1_467_710.37)
  assert.equal(s.brokerageVat, 32_289.63)
  assert.equal(brokerageVatAdded(slip), 0)
  assert.equal(s.fee, 1_076_320.94)
  assert.equal(s.feeVat, 23_679.06)
  assert.equal(s.net, 10_000_000 - 1_500_000 - 1_100_000)
  assert.equal(s.income, 2_600_000)
  assert.deepEqual(s.insurers.map((r) => r.vat), [32_289.63, 23_679.06])
})

test("Nett Premium polis ikut dikurangi PPN excl. VAT", () => {
  const rows = [
    { share: 60, additionalFeePct: 10, additionalFeeIncludeVat: true },
    { share: 40, additionalFeePct: 12.5, additionalFeeIncludeVat: false },
  ]
  assert.equal(additionalFeeVatAddedFor(10_000_000, rows), 11_000)
  const policy = { premium: 10_000_000, discountAmount: 0, brokeragePct: 15, additionalFee: 1_100_000 }
  assert.equal(nettPremium(policy), 7_400_000)
  assert.equal(nettPremium({ ...policy, vatAdded: 33_000 + 11_000 }), 7_356_000)
})
