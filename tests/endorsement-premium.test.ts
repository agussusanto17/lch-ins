import assert from "node:assert/strict"
import test from "node:test"

import {
  endorsementPremium,
  premiumBasis,
  prorataDays,
  prorataPremium,
  totalPremium,
} from "../lib/endorsement-premium"

test("prorata days run from the effective date to the expiry date, as DATEDIF does", () => {
  // Contoh Harry dan sheet MASTER: 10 Nov 2026 s/d 24 Nov 2026 = 14 hari.
  assert.equal(prorataDays("2026-11-10", "2026-11-24"), 14)
  assert.equal(prorataDays("2025-07-18", "2026-07-18"), 365)
  assert.equal(prorataDays("2026-11-24", "2026-11-10"), 0)
  assert.equal(prorataDays("", "2026-11-24"), 0)
})

test("premium is sum insured × rate × days / 365, matching the MASTER sheet", () => {
  // HM: 16.800.000.000 × 0,4015% × 299/365 = 55.255.200
  assert.equal(prorataPremium(16_800_000_000, 0.4015, 299), 55_255_200)
  // IV: 4.200.000.000 × 0,1026% × 299/365 = 3.530.002,19
  assert.equal(prorataPremium(4_200_000_000, 0.1026, 299), 3_530_002.19)
  // WAR: 21.000.000.000 × 0,0103% × 299/365 = 1.771.882,19
  assert.equal(prorataPremium(21_000_000_000, 0.0103, 299), 1_771_882.19)
})

test("a negative sum insured gives a return premium", () => {
  assert.equal(prorataPremium(-525_000_000, 2.39, 14), -481_273.97)
})

test("total premium adds admin cost and stamp duty", () => {
  // MASTER: additional premium 60.557.084,38 + administration cost 50.000.
  assert.equal(totalPremium({ premium: 60_557_084.38, adminCost: 50_000 }), 60_607_084.38)
  assert.equal(totalPremium({ premium: 481_273.97, adminCost: 50_000, stampDuty: 10_000 }), 541_273.97)
  assert.equal(totalPremium({ premium: 1_000 }), 1_000)
})

test("only an endorsement with a rate computes its premium", () => {
  const base = { sumInsured: 525_000_000, inceptionDate: "2026-11-10", expiryDate: "2026-11-24" }
  assert.equal(endorsementPremium({ ...base, type: "Endorsement", rate: 2.39 }), 481_273.97)
  assert.equal(endorsementPremium({ ...base, type: "Endorsement", rate: null }), null)
  assert.equal(endorsementPremium({ ...base, type: "Baru", rate: 2.39 }), null)
  assert.equal(endorsementPremium({ ...base, type: "Cancellation", rate: 2.39 }), null)
})

test("the premium basis can be the full sum insured while the UP change stays zero", () => {
  // Contoh Harry: rate berubah pada UP penuh 525 jt, UP polis tidak berubah.
  const rateChange = {
    type: "Endorsement" as const,
    sumInsured: 0,
    premiumBasis: 525_000_000,
    rate: 2.39,
    inceptionDate: "2026-11-10",
    expiryDate: "2026-11-24",
  }
  assert.equal(endorsementPremium(rateChange), 481_273.97)
  assert.equal(premiumBasis({ sumInsured: 150_000_000, premiumBasis: null }), 150_000_000)
  assert.equal(premiumBasis({ sumInsured: 0, premiumBasis: 525_000_000 }), 525_000_000)
})
