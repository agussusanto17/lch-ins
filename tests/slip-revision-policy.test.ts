import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip, recalc, switchCob } from "../components/underwriting/slip-model"
import {
  additionalFeeFor,
  additionalFeePanelText,
  additionalFeeVatFor,
  feeVatInside,
  insurerAdditionalFee,
  weightedFeePct,
} from "../lib/calc"
import type { PlacingSlip } from "../lib/data/types"
import { changedSlipFields, policyFieldsFromSlip } from "../lib/policy-from-slip"

const client = { id: "client-1", name: "MANESH NANIK MIRPURI" }

function closedMvSlip(): PlacingSlip {
  const base = switchCob(emptySlip(), "Motor Vehicle")
  // Premi 1.000.000: kendaraan 100 jt × Comprehensive 1%.
  const slip = recalc({
    ...base,
    interestItems: base.interestItems.map((i) => ({ ...i, amount: 100_000_000 })),
    rateLines: base.rateLines.map((l) => (l.label === "Comprehensive Casco" ? { ...l, rate: 1 } : l)),
  })
  return {
    ...slip,
    id: "slip-7",
    slipNo: "007/LCH-PLCMT/PS-MV/XI/2026",
    status: "Closed",
    clientId: "client-1",
    insuredName: "MANESH NANIK MIRPURI",
    currency: "IDR",
    inceptionDate: "2025-11-24",
    expiryDate: "2026-11-24",
    brokeragePct: 10,
    securityPanel: [
      { id: "a", insurer: "PT Asuransi Multi Artha Guna Tbk", share: 100, role: "As Leader" },
    ],
  }
}

const fields = (slip: PlacingSlip, part: "PAR" | "EQVET" | null = null) =>
  policyFieldsFromSlip(slip, part, client)

test("a revision without slip changes changes nothing on the policy", () => {
  const slip = closedMvSlip()
  assert.deepEqual(changedSlipFields(fields(slip), fields({ ...slip })), {})
})

test("an additional fee percent filled after the CI reaches the policy", () => {
  // Kasus demo: CI 007 terbit tanpa fee, lalu fee 15% diisi di panel (Harry,
  // 12 November 2026: 15 berarti 15%, bukan Rp 15).
  const before = closedMvSlip()
  const after = {
    ...before,
    securityPanel: before.securityPanel!.map((r) => ({ ...r, additionalFeePct: 15 })),
  }
  const changes = changedSlipFields(fields(before), fields(after))
  assert.deepEqual(Object.keys(changes).sort(), ["additionalFee", "additionalFeePct", "insurers"])
  assert.equal(changes.additionalFee, 150_000)
  assert.equal(changes.additionalFeePct, 15)
  assert.equal(changes.insurers?.[0].additionalFeePct, 15)
})

test("the policy copies the brokerage VAT switch and the fee VAT of each insurer", () => {
  const base = closedMvSlip()
  const slip = {
    ...base,
    includeVat: true,
    securityPanel: base.securityPanel!.map((r) => ({
      ...r,
      additionalFeePct: 15,
      additionalFeeIncludeVat: true,
    })),
  }
  const f = fields(slip)
  assert.equal(f.includeVat, true)
  assert.equal(f.insurers[0].additionalFeeIncludeVat, true)
  // Polis satu asuransi: isian form ikut status PPN asuransinya.
  assert.equal(f.additionalFeeIncludeVat, true)
  assert.equal(fields(base).additionalFeeIncludeVat, false)
})

// Status PPN fee bisa berbeda per asuransi (Harry, 12 November 2026).
test("the fee VAT is counted only for insurers whose fee includes VAT", () => {
  const rows = [
    { insurer: "PT A", share: 60, additionalFeePct: 12.5, additionalFeeIncludeVat: true },
    { insurer: "PT B", share: 40, additionalFeePct: 10, additionalFeeIncludeVat: false },
  ]
  const premium = 7_862_500
  // Fee PT A = 7.862.500 × 60% × 12,5% = 589.687,50; PPN di dalamnya 12.693,86.
  assert.equal(insurerAdditionalFee(premium, rows[0]), 589_687.5)
  assert.equal(additionalFeeVatFor(premium, rows), feeVatInside(589_687.5, true))
  assert.equal(additionalFeeVatFor(premium, rows), 12_693.86)
  assert.equal(
    additionalFeeVatFor(premium, rows.map((r) => ({ ...r, additionalFeeIncludeVat: false }))),
    0
  )
  assert.equal(additionalFeePanelText(rows), "PT A 12.5% termasuk PPN · PT B 10%")
})

test("a fee VAT change on one insurer reaches the policy", () => {
  const before = {
    ...closedMvSlip(),
    securityPanel: [
      { id: "a", insurer: "PT A", share: 60, role: "As Leader" as const, additionalFeePct: 12.5 },
      { id: "b", insurer: "PT B", share: 40, role: "As Member" as const, additionalFeePct: 10 },
    ],
  }
  const after = {
    ...before,
    securityPanel: before.securityPanel.map((r) =>
      r.id === "b" ? { ...r, additionalFeeIncludeVat: true } : r
    ),
  }
  const changes = changedSlipFields(fields(before), fields(after))
  assert.deepEqual(Object.keys(changes), ["insurers"])
  assert.equal(changes.insurers?.[1].additionalFeeIncludeVat, true)
})

test("only the slip fields that changed are copied", () => {
  const before = closedMvSlip()
  const after = { ...before, brokeragePct: 12.5, expiryDate: "2026-12-24" }
  assert.deepEqual(changedSlipFields(fields(before), fields(after)), {
    brokeragePct: 12.5,
    expiryDate: "2026-12-24",
  })
})

test("a saved panel with new row ids is not a change", () => {
  const before = closedMvSlip()
  const after = {
    ...before,
    securityPanel: before.securityPanel!.map((r) => ({ ...r, id: `${r.id}-baru` })),
  }
  assert.deepEqual(changedSlipFields(fields(before), fields(after)), {})
})

test("a new co-insurer changes the panel but keeps the leader", () => {
  const before = closedMvSlip()
  const after = {
    ...before,
    securityPanel: [
      { id: "a", insurer: "PT Asuransi Multi Artha Guna Tbk", share: 60, role: "As Leader" as const },
      { id: "b", insurer: "PT Asuransi Sinar Mas", share: 40, role: "As Member" as const },
    ],
  }
  const changes = changedSlipFields(fields(before), fields(after))
  assert.deepEqual(Object.keys(changes), ["insurers"])
  assert.deepEqual(
    changes.insurers?.map((r) => [r.insurer, r.share]),
    [
      ["PT Asuransi Multi Artha Guna Tbk", 60],
      ["PT Asuransi Sinar Mas", 40],
    ]
  )
})

test("co-insurance fee uses each insurer's percent on its share of the premium", () => {
  const rows = [
    { share: 60, additionalFeePct: 15 },
    { share: 40, additionalFeePct: 10 },
  ]
  assert.equal(weightedFeePct(rows), 13)
  assert.equal(additionalFeeFor(1_000_000, rows), 130_000)
  assert.equal(insurerAdditionalFee(1_000_000, rows[0]), 90_000)
  assert.equal(insurerAdditionalFee(1_000_000, rows[1]), 40_000)
  assert.equal(additionalFeeFor(1_000_000, [{ share: 100 }]), 0)
})

test("a refund premium gives a negative fee", () => {
  assert.equal(additionalFeeFor(-200_000, [{ share: 100, additionalFeePct: 15 }]), -30_000)
})

test("additional fee VAT uses the brokerage rate of 2.2% when included", () => {
  assert.equal(feeVatInside(102_200, false), 0)
  assert.equal(feeVatInside(102_200, true), 2_200)
  assert.equal(feeVatInside(0, true), 0)
})
