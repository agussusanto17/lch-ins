import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip, switchCob } from "../components/underwriting/slip-model"
import type { PlacingSlip } from "../lib/data/types"
import {
  isProvisionalPolicyNo,
  policyFieldsFromSlip,
  provisionalPolicyNo,
  slipExistingPolicyNo,
} from "../lib/policy-from-slip"

function closedSlip(): PlacingSlip {
  const slip = switchCob(emptySlip(), "Liability")
  return {
    ...slip,
    id: "slip-1",
    slipNo: "015/LCH-PLCMT/PS-PL/XI/2026",
    clientId: "client-1",
    insuredName: "PT Contoh and/or Subsidiaries",
    currency: "IDR",
    inceptionDate: "2026-12-01",
    expiryDate: "2027-12-01",
    brokeragePct: 15,
    riskLocation: "Jakarta",
    securityPanel: [
      { id: "a", insurer: "PT Asuransi Satu", share: 60, role: "As Leader" },
      { id: "b", insurer: "PT Asuransi Dua", share: 40, role: "As Member" },
      { id: "c", insurer: "", share: 0, role: "As Member" },
    ],
  }
}

test("policy fields follow the slip and its insurer panel", () => {
  const fields = policyFieldsFromSlip(closedSlip(), null, { id: "client-1", name: "PT Contoh" })
  assert.equal(fields.placingSlipId, "slip-1")
  assert.equal(fields.slipPart, null)
  // Nama tertanggung dari isian slip, bukan nama klien (13 November 2026).
  assert.equal(fields.insuredName, "PT Contoh and/or Subsidiaries")
  assert.equal(fields.clientId, "client-1")
  assert.equal(fields.inceptionDate, "2026-12-01")
  assert.equal(fields.expiryDate, "2027-12-01")
  assert.equal(fields.brokeragePct, 15)
  assert.equal(fields.insurer, "PT Asuransi Satu")
  assert.deepEqual(
    fields.insurers.map((i) => i.insurer),
    ["PT Asuransi Satu", "PT Asuransi Dua"]
  )
})

test("without a known client the slip insured name is kept", () => {
  const fields = policyFieldsFromSlip(closedSlip(), null, null)
  assert.equal(fields.clientId, "client-1")
  assert.equal(fields.insuredName, "PT Contoh and/or Subsidiaries")
})

test("the client name is only a fallback when the slip insured name is empty", () => {
  const blank = { ...closedSlip(), insuredName: "  " }
  assert.equal(policyFieldsFromSlip(blank, null, { id: "client-1", name: "PT Contoh" }).insuredName, "PT Contoh")
  assert.equal(policyFieldsFromSlip(blank, null, null).insuredName, "")
})

test("Existing Policy No. marks a renewal", () => {
  const slip = closedSlip()
  assert.equal(slipExistingPolicyNo(slip), null)
  const renewal = {
    ...slip,
    detailRows: [
      { label: "Existing Policy No.", value: " PL/2025/001 " },
      { label: "Jurisdiction", value: "Indonesia" },
    ],
  }
  assert.equal(slipExistingPolicyNo(renewal), "PL/2025/001")
})

test("provisional policy numbers come from the Closing Instruction number", () => {
  const ci = "015/LCH-PLCMT/CI-PAREQ/XI/2026"
  assert.equal(provisionalPolicyNo(ci, null), ci)
  assert.equal(provisionalPolicyNo(ci, "EQVET"), `${ci} (EQVET)`)
  assert.equal(isProvisionalPolicyNo(ci), true)
  assert.equal(isProvisionalPolicyNo(`${ci} (PAR)`), true)
  assert.equal(isProvisionalPolicyNo("PAR/2025/JKT/0871"), false)
})
