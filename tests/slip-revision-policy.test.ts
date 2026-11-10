import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip, switchCob } from "../components/underwriting/slip-model"
import { additionalFeeVatAmount } from "../lib/calc"
import type { PlacingSlip } from "../lib/data/types"
import { changedSlipFields, policyFieldsFromSlip } from "../lib/policy-from-slip"

const client = { id: "client-1", name: "MANESH NANIK MIRPURI" }

function closedMvSlip(): PlacingSlip {
  const slip = switchCob(emptySlip(), "Motor Vehicle")
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
    additionalFee: 0,
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

test("an additional fee filled after the CI reaches the policy", () => {
  // Kasus demo 10 November 2026: CI 007 terbit dengan fee 0, lalu fee diisi.
  const before = closedMvSlip()
  const after = { ...before, additionalFee: 150_000 }
  assert.deepEqual(changedSlipFields(fields(before), fields(after)), {
    additionalFee: 150_000,
  })
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

test("the EQVET policy ignores the additional fee, which stays on PAR", () => {
  const before = { ...closedMvSlip(), additionalFee: 0 }
  const after = { ...before, additionalFee: 50_000 }
  assert.deepEqual(changedSlipFields(fields(before, "EQVET"), fields(after, "EQVET")), {})
  assert.deepEqual(changedSlipFields(fields(before, "PAR"), fields(after, "PAR")), {
    additionalFee: 50_000,
  })
})

test("additional fee VAT uses the brokerage rate of 2.2% when included", () => {
  assert.equal(additionalFeeVatAmount({ additionalFee: 102_200, additionalFeeIncludeVat: false }), 0)
  assert.equal(additionalFeeVatAmount({ additionalFee: 102_200, additionalFeeIncludeVat: true }), 2_200)
  assert.equal(additionalFeeVatAmount({ additionalFee: 0, additionalFeeIncludeVat: true }), 0)
  assert.equal(additionalFeeVatAmount({ additionalFeeIncludeVat: true }), 0)
})
