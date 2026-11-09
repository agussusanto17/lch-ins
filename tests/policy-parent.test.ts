import assert from "node:assert/strict"
import test from "node:test"

import {
  parentPolicyIssue,
  parentPolicyLabel,
  parentPolicyNote,
  storedPreviousPolicyNo,
} from "../lib/policy-parent"

test("label polis rujukan sesuai tipe polis", () => {
  assert.equal(parentPolicyLabel("Renewal"), "Polis Sebelumnya")
  assert.equal(parentPolicyLabel("Endorsement"), "Polis yang Di-endorse")
  assert.equal(parentPolicyLabel("Cancellation"), "Polis yang Dibatalkan")
})

test("renewal cukup dengan nomor polis sebelumnya bila polisnya belum ada di sistem", () => {
  assert.equal(parentPolicyIssue({ type: "Baru", parentPolicyId: null }), null)
  assert.equal(parentPolicyIssue({ type: "Renewal", parentPolicyId: "p1" }), null)
  assert.equal(parentPolicyIssue({ type: "Renewal", parentPolicyId: null, previousPolicyNo: "PAR/2025/JKT/0871" }), null)
  assert.match(parentPolicyIssue({ type: "Renewal", parentPolicyId: null, previousPolicyNo: "  " }) ?? "", /isi nomornya/)
  // Endorsement dan pembatalan tetap harus memilih polisnya.
  assert.equal(
    parentPolicyIssue({ type: "Endorsement", parentPolicyId: null, previousPolicyNo: "X" }),
    "Polis yang Di-endorse wajib dipilih"
  )
  assert.equal(parentPolicyIssue({ type: "Cancellation", parentPolicyId: null }), "Polis yang Dibatalkan wajib dipilih")
})

test("nomor polis sebelumnya hanya disimpan untuk renewal tanpa polis di sistem", () => {
  assert.equal(storedPreviousPolicyNo({ type: "Renewal", parentPolicyId: null, previousPolicyNo: " PAR/2025/1 " }), "PAR/2025/1")
  assert.equal(storedPreviousPolicyNo({ type: "Renewal", parentPolicyId: "p1", previousPolicyNo: "PAR/2025/1" }), null)
  assert.equal(storedPreviousPolicyNo({ type: "Endorsement", parentPolicyId: null, previousPolicyNo: "PAR/2025/1" }), null)
  assert.equal(storedPreviousPolicyNo({ type: "Renewal", parentPolicyId: null, previousPolicyNo: "" }), null)
})

test("keterangan polis rujukan di daftar polis", () => {
  assert.equal(parentPolicyNote({ type: "Renewal", parentPolicyNo: null, previousPolicyNo: "PAR/2025/1" }), "renewal dari PAR/2025/1")
  assert.equal(parentPolicyNote({ type: "Renewal", parentPolicyNo: "PAR/2025/2", previousPolicyNo: null }), "renewal dari PAR/2025/2")
  assert.equal(parentPolicyNote({ type: "Endorsement", parentPolicyNo: "PAR/2026/3" }), "endorsement PAR/2026/3")
  assert.equal(parentPolicyNote({ type: "Cancellation", parentPolicyNo: "PAR/2026/3" }), "pembatalan PAR/2026/3")
  assert.equal(parentPolicyNote({ type: "Baru", parentPolicyNo: null }), null)
})
