import assert from "node:assert/strict"
import test from "node:test"

import { endorsementSuggestion, participantActiveOn, rosterPolicy } from "../lib/policy-participants"

test("peserta dijamin dari tanggal mulai sampai sebelum tanggal berhenti", () => {
  const p = { startDate: "2026-03-01", endDate: "2026-09-01" }
  assert.equal(participantActiveOn(p, "2026-03-01"), true)
  assert.equal(participantActiveOn(p, "2026-08-31"), true)
  assert.equal(participantActiveOn(p, "2026-09-01"), false)
  assert.equal(participantActiveOn(p, "2026-02-28"), false)
  assert.equal(participantActiveOn({ startDate: "2026-03-01", endDate: null }, "2027-01-01"), true)
})

test("usulan endorsement: perubahan UP × rate polis induk × sisa periode", () => {
  // PA Salam Pacific: UP 125.625.000.000, premi 100.500.000 (rate 0,08%), 1 Mar 2026 – 1 Mar 2027 (365 hari).
  const parent = { inceptionDate: "2026-03-01", expiryDate: "2027-03-01", sumInsured: 125_625_000_000, premium: 100_500_000 }
  // Tambah 2 peserta 75 jt, kurangi 1 peserta 100 jt, berlaku 1 Sep 2026 (181 hari tersisa).
  const s = endorsementSuggestion({ parent, effectiveDate: "2026-09-01", addedTotal: 150_000_000, removedTotal: 100_000_000 })
  assert.equal(s.netSumInsured, 50_000_000)
  assert.equal(s.rate, 0.0008)
  assert.equal(s.periodDays, 365)
  assert.equal(s.remainingDays, 181)
  assert.equal(s.premium, Math.round(50_000_000 * 0.0008 * (181 / 365) * 100) / 100)
  // Hanya pengurangan: premi negatif (pengembalian).
  assert.ok(endorsementSuggestion({ parent, effectiveDate: "2026-09-01", addedTotal: 0, removedTotal: 75_000_000 }).premium < 0)
  // Berlaku sejak awal polis: premi penuh setahun.
  assert.equal(endorsementSuggestion({ parent, effectiveDate: "2026-03-01", addedTotal: 75_000_000, removedTotal: 0 }).premium, 60_000)
})

test("daftar peserta milik polis asal walau induk endorsement adalah endorsement lain", () => {
  const policies = [
    { id: "p", type: "Baru", parentPolicyId: null },
    { id: "e1", type: "Endorsement", parentPolicyId: "p" },
    { id: "e2", type: "Endorsement", parentPolicyId: "e1" },
    { id: "r", type: "Renewal", parentPolicyId: "p" },
    { id: "e3", type: "Endorsement", parentPolicyId: "r" },
    { id: "lepas", type: "Endorsement", parentPolicyId: "hilang" },
  ]
  const owner = (id: string) => rosterPolicy(policies.find((p) => p.id === id)!, policies).id
  assert.equal(owner("p"), "p")
  assert.equal(owner("e1"), "p")
  assert.equal(owner("e2"), "p")
  // Renewal punya daftar sendiri.
  assert.equal(owner("e3"), "r")
  // Induk yang tidak termuat: berhenti di polis itu sendiri.
  assert.equal(owner("lepas"), "lepas")
})
