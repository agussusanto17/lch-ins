import assert from "node:assert/strict"
import test from "node:test"

import type { PolicyFile } from "../lib/data/types"
import {
  MAIN_POLICY_FILE_KINDS,
  POLICY_FILE_KINDS,
  latestPolicyFile,
  policyFileKindLabel,
  policyFileKindsFor,
  policyFilesOfKind,
} from "../lib/policy-files"
import {
  MAX_POLICY_FILE_BYTES,
  MAX_UPLOAD_BYTES,
  UPLOAD_PART_BYTES,
  joinUploadParts,
  maxUploadBytes,
  uploadProblem,
} from "../lib/uploads"

const bytes = (n: number, fill: number) => new Uint8Array(n).fill(fill)

test("potongan unggahan digabung berurutan walau datang acak", () => {
  const joined = joinUploadParts(
    [
      { partNo: 1, data: bytes(2, 2) },
      { partNo: 0, data: bytes(3, 1) },
      { partNo: 2, data: bytes(1, 3) },
    ],
    3,
    10
  )
  assert.deepEqual([...joined], [1, 1, 1, 2, 2, 3])
})

test("potongan yang hilang, berlebih, atau melewati batas ditolak", () => {
  const two = [
    { partNo: 0, data: bytes(2, 1) },
    { partNo: 2, data: bytes(2, 1) },
  ]
  assert.throws(() => joinUploadParts(two, 2, 10), /tidak lengkap/)
  assert.throws(() => joinUploadParts([{ partNo: 0, data: bytes(2, 1) }], 2, 10), /tidak lengkap/)
  assert.throws(() => joinUploadParts([], 0, 10), /tidak lengkap/)
  assert.throws(
    () => joinUploadParts([{ partNo: 0, data: bytes(11, 1) }], 1, 10),
    /maksimal/
  )
})

test("berkas polis boleh 25 MB, berkas lain tetap 4 MB", () => {
  assert.equal(maxUploadBytes("policy_file"), 25 * 1024 * 1024)
  assert.equal(maxUploadBytes("client_document"), MAX_UPLOAD_BYTES)
  assert.equal(maxUploadBytes("slip_attachment"), MAX_UPLOAD_BYTES)
  const pdf = (size: number) => ({ size, type: "application/pdf" })
  assert.equal(uploadProblem(pdf(10 * 1024 * 1024), MAX_POLICY_FILE_BYTES), null)
  assert.equal(uploadProblem(pdf(26 * 1024 * 1024), MAX_POLICY_FILE_BYTES), "Ukuran file maksimal 25 MB.")
  assert.equal(uploadProblem(pdf(5 * 1024 * 1024)), "Ukuran file maksimal 4 MB.")
  // Satu potongan harus muat dalam satu request Vercel (4,5 MB).
  assert.ok(UPLOAD_PART_BYTES < 4.5 * 1024 * 1024)
})

const file = (kind: PolicyFile["kind"], version: number): PolicyFile => ({
  id: `${kind}-${version}`,
  kind,
  version,
  fileName: `${kind}-v${version}.pdf`,
  uploadedAt: "2026-11-09T00:00:00.000Z",
})

test("berkas polis dikelompokkan per jenis dengan versinya sendiri", () => {
  assert.deepEqual(
    POLICY_FILE_KINDS.map((k) => k.label),
    ["Polis", "Premium Note", "Commission Note", "Slip"]
  )
  // Kelengkapan berkas (x/3) tetap dihitung dari tiga jenis utama.
  assert.deepEqual(
    MAIN_POLICY_FILE_KINDS.map((k) => k.kind),
    ["Policy", "PremiumNote", "CommissionNote"]
  )
  assert.equal(policyFileKindLabel("CommissionNote"), "Commission Note")
  const files = [file("Policy", 1), file("PremiumNote", 1), file("Policy", 2)]
  assert.equal(latestPolicyFile(files, "Policy")?.version, 2)
  assert.equal(latestPolicyFile(files, "PremiumNote")?.version, 1)
  assert.equal(latestPolicyFile(files, "CommissionNote"), undefined)
  assert.deepEqual(
    policyFilesOfKind(files, "Policy").map((f) => f.version),
    [2, 1]
  )
})

test("berkas Slip hanya untuk polis yang slipnya di luar sistem", () => {
  const kinds = (policy: Parameters<typeof policyFileKindsFor>[0]) =>
    policyFileKindsFor(policy).map((k) => k.kind)
  // Polis tanpa placing slip di sistem: slip dari luar sistem bisa diunggah.
  assert.deepEqual(kinds({ placingSlipId: null, files: [] }), [
    "Policy",
    "PremiumNote",
    "CommissionNote",
    "Slip",
  ])
  // Polis dari placing slip di sistem: slipnya sudah bisa dicetak.
  assert.deepEqual(kinds({ placingSlipId: "slip-1", files: [] }), [
    "Policy",
    "PremiumNote",
    "CommissionNote",
  ])
  // File Slip yang sudah terunggah tetap tampil.
  assert.ok(kinds({ placingSlipId: "slip-1", files: [file("Slip", 1)] }).includes("Slip"))
})
