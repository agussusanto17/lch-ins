import assert from "node:assert/strict"
import test from "node:test"

import { cancellationSuggestion } from "../lib/policy-cancellation"

/**
 * Contoh pembatalan dari Harry (polis 45020126008633), premi tahunan sembilan cover.
 * Setelah biaya pembatalan IDR 10.000, pengembaliannya IDR 6.399.865,75.
 */
test("cancellation returns premium pro rata like the insurer sample", () => {
  const s = cancellationSuggestion({
    policy: {
      inceptionDate: "2026-04-28",
      expiryDate: "2027-04-28",
      sumInsured: 401_000_000,
      premium: 6_861_000,
    },
    effectiveDate: "2026-05-22",
  })
  assert.equal(s.periodDays, 365)
  assert.equal(s.remainingDays, 341)
  assert.equal(s.premium, -6_409_865.75)
  assert.equal(s.sumInsured, -401_000_000)
})

test("endorsement premiums and sums insured are part of what is cancelled", () => {
  const s = cancellationSuggestion({
    policy: { inceptionDate: "2026-01-01", expiryDate: "2027-01-01", sumInsured: 100, premium: 1000 },
    endorsements: [
      { premium: 200, sumInsured: 20 },
      { premium: -100, sumInsured: -10 },
    ],
    effectiveDate: "2026-07-02",
  })
  assert.equal(s.basePremium, 1100)
  assert.equal(s.baseSumInsured, 110)
  assert.equal(s.remainingDays, 183)
  assert.equal(s.premium, -551.51)
  assert.equal(s.sumInsured, -110)
})

test("effective dates outside the period are clamped", () => {
  const base = { inceptionDate: "2026-01-01", expiryDate: "2027-01-01", sumInsured: 100, premium: 365 }
  assert.equal(cancellationSuggestion({ policy: base, effectiveDate: "2025-12-01" }).premium, -365)
  assert.equal(cancellationSuggestion({ policy: base, effectiveDate: "2027-02-01" }).premium, -0)
})
