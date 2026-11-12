import assert from "node:assert/strict"
import test from "node:test"

import { computeTotals, inForcePolicies } from "../lib/data/analytics"
import { cancelledPolicies, policyStatus } from "../lib/data/policy-status"
import type { Policy } from "../lib/data/types"

const TODAY = "2026-11-12"

const policy = (p: Partial<Policy> & Pick<Policy, "id" | "expiryDate">): Policy => ({
  policyNo: p.id,
  clientId: null,
  placingSlipId: null,
  parentPolicyId: null,
  insuredName: "PT Contoh",
  insurer: "PT Asuransi Contoh",
  insurers: [],
  cob: "Property",
  inceptionDate: "2026-01-01",
  currency: "IDR",
  sumInsured: 1_000_000,
  premium: 1_000,
  brokeragePct: 15,
  type: "Baru",
  riskLocation: "Jakarta",
  files: [],
  ...p,
})

test("status dari tanggal berakhir (PRD A-17)", () => {
  assert.equal(policyStatus({ expiryDate: "2027-01-12" }, TODAY), "Active")
  // 60 hari lagi masih masuk jendela renewal notice.
  assert.equal(policyStatus({ expiryDate: "2027-01-11" }, TODAY), "Expiring")
  assert.equal(policyStatus({ expiryDate: TODAY }, TODAY), "Expiring")
  assert.equal(policyStatus({ expiryDate: "2026-11-11" }, TODAY), "Expired")
})

test("polis yang dibatalkan berstatus Cancelled apa pun tanggal berakhirnya", () => {
  assert.equal(policyStatus({ expiryDate: "2027-06-01", cancelled: true }, TODAY), "Cancelled")
  assert.equal(policyStatus({ expiryDate: "2026-12-01", cancelled: true }, TODAY), "Cancelled")
  assert.equal(policyStatus({ expiryDate: "2026-01-01", cancelled: true }, TODAY), "Cancelled")
  assert.equal(policyStatus({ expiryDate: "2027-06-01", cancelled: false }, TODAY), "Active")
})

test("pembatalan menandai polis induk beserta endorsement dan record pembatalannya", () => {
  const cancelled = cancelledPolicies([
    { id: "a", policyNo: "PAR/2026/001", type: "Baru", parentPolicyId: null },
    { id: "a-end", policyNo: "PAR/2026/001-END1", type: "Endorsement", parentPolicyId: "a" },
    { id: "a-cs", policyNo: "019/LCH-PLCMT/CS-MC/XI/2026", type: "Cancellation", parentPolicyId: "a" },
    // Renewal polis yang dibatalkan adalah polis tersendiri.
    { id: "a-next", policyNo: "PAR/2027/001", type: "Renewal", parentPolicyId: "a" },
    { id: "b", policyNo: "MV/2026/002", type: "Baru", parentPolicyId: null },
    { id: "b-end", policyNo: "MV/2026/002-END1", type: "Endorsement", parentPolicyId: "b" },
  ])
  assert.deepEqual([...cancelled.keys()].sort(), ["a", "a-cs", "a-end"])
  assert.equal(cancelled.get("a"), "019/LCH-PLCMT/CS-MC/XI/2026")
})

test("pembatalan yang menunjuk endorsement membatalkan polis asalnya", () => {
  // Form Policy Database boleh memilih endorsement sebagai polis yang dibatalkan.
  const cancelled = cancelledPolicies([
    { id: "old", policyNo: "PAR/2025/001", type: "Baru", parentPolicyId: null },
    { id: "a", policyNo: "PAR/2026/001", type: "Renewal", parentPolicyId: "old" },
    { id: "e1", policyNo: "PAR/2026/001-END1", type: "Endorsement", parentPolicyId: "a" },
    { id: "e2", policyNo: "PAR/2026/001-END2", type: "Endorsement", parentPolicyId: "e1" },
    { id: "cs", policyNo: "PAR/2026/001-CANCEL", type: "Cancellation", parentPolicyId: "e2" },
  ])
  assert.deepEqual([...cancelled.keys()].sort(), ["a", "cs", "e1", "e2"])
  assert.equal(cancelled.get("a"), "PAR/2026/001-CANCEL")
})

test("polis asal di luar daftar dikenali dari record endorsement dan pembatalan", () => {
  // Server hanya memuat record Endorsement dan Cancellation.
  const cancelled = cancelledPolicies([
    { id: "e1", policyNo: "END1", type: "Endorsement", parentPolicyId: "root" },
    { id: "cs", policyNo: "CS-1", type: "Cancellation", parentPolicyId: "e1" },
    { id: "x-end", policyNo: "X-END1", type: "Endorsement", parentPolicyId: "x" },
  ])
  assert.deepEqual([...cancelled.keys()].sort(), ["cs", "e1", "root"])
  assert.equal(cancelled.get("root"), "CS-1")
})

test("tanpa record Cancellation tidak ada polis yang dibatalkan", () => {
  const cancelled = cancelledPolicies([
    { id: "a", policyNo: "A", type: "Baru" },
    { id: "e", policyNo: "A-END1", type: "Endorsement", parentPolicyId: "a" },
  ])
  assert.equal(cancelled.size, 0)
})

test("polis yang dibatalkan tidak dihitung sebagai polis aktif di Dashboard", () => {
  const policies = [
    policy({ id: "aktif", expiryDate: "2027-06-01", premium: 1_000 }),
    policy({ id: "segera", expiryDate: "2026-12-01", premium: 500 }),
    policy({ id: "lewat", expiryDate: "2026-10-01", premium: 700 }),
    policy({ id: "batal", expiryDate: "2027-06-01", premium: 2_000, cancelled: true }),
    policy({
      id: "batal-cs",
      type: "Cancellation",
      parentPolicyId: "batal",
      expiryDate: "2027-06-01",
      premium: -1_200,
      cancelled: true,
    }),
  ]
  assert.deepEqual(inForcePolicies(policies, TODAY).map((p) => p.id), ["aktif", "segera"])
  const totals = computeTotals({ clients: [], policies, claims: [], slips: [] }, TODAY)
  assert.equal(totals.activePolicies, 2)
  assert.equal(totals.totalPremium, 1_500)
})
