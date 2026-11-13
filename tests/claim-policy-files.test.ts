import assert from "node:assert/strict"
import test from "node:test"

import {
  claimPolicyChoices,
  claimPolicyLabel,
  deductiblesOn,
  policyFamilies,
  policyFamilyFiles,
  policyFileLinkText,
  type PolicyChangeTerms,
  type PolicyFamilyRow,
  type PolicyLink,
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

test("polis tanpa endorsement hanya menampilkan polisnya sendiri, tanpa tanda Dipilih", () => {
  const files = policyFamilyFiles([rows[2]], "p", "p")
  assert.deepEqual(files.map((f) => [f.label, f.selected]), [["Polis", false]])
})

test("teks tautan: PDF atau berkas lain, dengan versi bila lebih dari satu", () => {
  assert.equal(policyFileLinkText(pdf("polis")), "Lihat PDF")
  assert.equal(policyFileLinkText(pdf("polis", 2)), "Lihat PDF (versi 2)")
  assert.equal(policyFileLinkText({ url: "/x", fileName: "scan.jpg", version: 1 }), "Lihat berkas")
})

const links: PolicyLink[] = [
  { id: "p", type: "Renewal", parentPolicyId: null },
  { id: "e1", type: "Endorsement", parentPolicyId: "p" },
  // Endorsement atas endorsement dari Policy Database tetap milik polis p.
  { id: "e2", type: "Endorsement", parentPolicyId: "e1" },
  { id: "c1", type: "Cancellation", parentPolicyId: "p" },
  // Renewal menunjuk polis lama, tetapi berdiri sendiri.
  { id: "r", type: "Renewal", parentPolicyId: "p" },
  { id: "q", type: "Baru", parentPolicyId: null },
  // Polis induknya sudah dihapus: tampil sebagai polis sendiri.
  { id: "x", type: "Endorsement", parentPolicyId: "hilang" },
]

test("keluarga polis: endorsement dan pembatalan naik ke polis induk", () => {
  const families = policyFamilies(links)
  assert.deepEqual(
    links.map((l) => [l.id, families.get(l.id)?.rootId]),
    [["p", "p"], ["e1", "p"], ["e2", "p"], ["c1", "p"], ["r", "r"], ["q", "q"], ["x", "x"]]
  )
  assert.deepEqual(families.get("p"), { rootId: "p", endorsements: 2, cancelled: true })
  assert.deepEqual(families.get("e2"), { rootId: "p", endorsements: 2, cancelled: true })
  assert.deepEqual(families.get("q"), { rootId: "q", endorsements: 0, cancelled: false })
})

test("pilihan polis klaim: satu baris per polis, klaim lama di endorsement tetap tampil", () => {
  const families = policyFamilies(links)
  const choices = links.map((l) => ({
    id: l.id,
    policyNo: l.id.toUpperCase(),
    insuredName: "PT Margamas",
    ...families.get(l.id)!,
  }))
  assert.deepEqual(claimPolicyChoices(choices, null).map((c) => c.id), ["p", "r", "q", "x"])
  assert.deepEqual(claimPolicyChoices(choices, "e1").map((c) => c.id), ["p", "e1", "r", "q", "x"])
  assert.equal(claimPolicyLabel(choices[0]), "P — PT Margamas (2 endorsement, dibatalkan)")
  assert.equal(claimPolicyLabel(choices[1]), "E1 — PT Margamas")
  assert.equal(claimPolicyLabel(choices[5]), "Q — PT Margamas")
})

const group = (text: string) => [{ heading: null, texts: [text] }]
const change = (label: string, effectiveDate: string, text: string): PolicyChangeTerms => ({
  policyId: label,
  label,
  policyNo: `ES ${label}`,
  effectiveDate,
  deductibleIntro: null,
  deductibles: group(text),
})

test("deductible mengikuti endorsement yang berlaku pada tanggal kejadian", () => {
  const base = { deductibleIntro: "Each and every loss", deductibles: group("10% min IDR 5 jt") }
  const changes = [
    change("Endorsement ke-1", "2026-11-12", "10% min IDR 10 jt"),
    change("Endorsement ke-2", "2026-12-15", "15% min IDR 10 jt"),
  ]
  const before = deductiblesOn(base, changes, "2026-11-01")
  assert.equal(before.applied, null)
  assert.equal(before.intro, "Each and every loss")
  assert.deepEqual(before.deductibles, base.deductibles)
  assert.equal(before.next?.label, "Endorsement ke-1")

  const onDay = deductiblesOn(base, changes, "2026-11-12")
  assert.equal(onDay.applied?.label, "Endorsement ke-1")
  assert.equal(onDay.intro, null)
  assert.deepEqual(onDay.deductibles, group("10% min IDR 10 jt"))
  assert.equal(onDay.next?.label, "Endorsement ke-2")

  const after = deductiblesOn(base, changes, "2027-01-05")
  assert.equal(after.applied?.label, "Endorsement ke-2")
  assert.equal(after.next, null)

  assert.equal(deductiblesOn(base, [], "2027-01-05").applied, null)
})

test("dua endorsement di tanggal efektif sama: urutan server, yang terakhir berlaku", () => {
  const base = { deductibleIntro: null, deductibles: [] }
  const changes = [
    change("Endorsement ke-1", "2026-11-12", "A"),
    change("Endorsement ke-2", "2026-11-12", "B"),
  ]
  assert.equal(deductiblesOn(base, changes, "2026-11-20").applied?.label, "Endorsement ke-2")
})
