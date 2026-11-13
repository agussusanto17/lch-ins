import assert from "node:assert/strict"
import test from "node:test"

import {
  policyFamilyFiles,
  policyFileLinkText,
  type PolicyFamilyRow,
} from "../lib/claim-policy-files"

const pdf = (name: string, version = 1) => ({ url: `/api/files/${name}`, fileName: `${name}.pdf`, version })

const rows: PolicyFamilyRow[] = [
  { id: "c1", policyNo: "45020125022398-CN", type: "Cancellation", endorsementSeq: null, inceptionDate: "2026-12-01", file: null },
  { id: "e2", policyNo: "45020125022398-END2", type: "Endorsement", endorsementSeq: 2, inceptionDate: "2026-11-20", file: null },
  { id: "p", policyNo: "45020125022398", type: "Renewal", endorsementSeq: null, inceptionDate: "2025-11-24", file: pdf("polis", 2) },
  { id: "e1", policyNo: "45020125022398-END1", type: "Endorsement", endorsementSeq: 1, inceptionDate: "2026-11-10", file: pdf("end1") },
  // Renewal tahun berikutnya juga menunjuk polis ini, tetapi berdiri sendiri.
  { id: "r", policyNo: "45020126000001", type: "Renewal", endorsementSeq: null, inceptionDate: "2026-11-24", file: pdf("renewal") },
]

test("berkas polis: polis induk dulu, lalu endorsement berurutan, lalu pembatalan", () => {
  const files = policyFamilyFiles(rows, "p", "e1")
  assert.deepEqual(
    files.map((f) => [f.label, f.policyNo, f.selected, f.file?.fileName ?? null]),
    [
      ["Polis", "45020125022398", false, "polis.pdf"],
      ["Endorsement ke-1", "45020125022398-END1", true, "end1.pdf"],
      ["Endorsement ke-2", "45020125022398-END2", false, null],
      ["Pembatalan", "45020125022398-CN", false, null],
    ]
  )
})

test("polis tanpa endorsement hanya menampilkan polisnya sendiri", () => {
  const files = policyFamilyFiles([rows[2]], "p", "p")
  assert.deepEqual(files.map((f) => [f.label, f.selected]), [["Polis", true]])
})

test("teks tautan: PDF atau berkas lain, dengan versi bila lebih dari satu", () => {
  assert.equal(policyFileLinkText(pdf("polis")), "Lihat PDF")
  assert.equal(policyFileLinkText(pdf("polis", 2)), "Lihat PDF (versi 2)")
  assert.equal(policyFileLinkText({ url: "/x", fileName: "scan.jpg", version: 1 }), "Lihat berkas")
})
