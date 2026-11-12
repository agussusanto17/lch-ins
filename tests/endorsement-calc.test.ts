import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip, switchCob } from "../components/underwriting/slip-model"
import type { EndorsementCalc, PlacingSlip } from "../lib/data/types"
import {
  endorsementAdjustment,
  endorsementProrata,
  slipCalc,
  slipEndorsementAdjustment,
} from "../lib/endorsement-calc"

// Contoh EDM 01 (Multi Artha Guna): efektif per awal periode, UP 223,5 jt → 200 jt
// dan rate TPL 0,75% → 1,125%, biaya endorsement 10.000, total (387.650).
const edmBefore: EndorsementCalc = {
  lines: [
    { label: "Comprehensive", basis: 223_500_000, rate: 2.39, unit: "%", premium: 5_341_650 },
    { label: "Gempa Bumi", basis: 223_500_000, rate: 0.1, unit: "%", premium: 223_500 },
    { label: "TPL", basis: 50_000_000, rate: 0.75, unit: "%", premium: 375_000 },
  ],
  sumInsured: 223_500_000,
  premium: 5_940_150,
}
const edmAfter: EndorsementCalc = {
  lines: [
    { label: "Comprehensive", basis: 200_000_000, rate: 2.39, unit: "%", premium: 4_780_000 },
    { label: "Gempa Bumi", basis: 200_000_000, rate: 0.1, unit: "%", premium: 200_000 },
    { label: "TPL", basis: 50_000_000, rate: 1.125, unit: "%", premium: 562_500 },
  ],
  sumInsured: 200_000_000,
  premium: 5_542_500,
}
const period = { inceptionDate: "2026-08-18", expiryDate: "2027-08-18" }

test("an endorsement from the policy start uses the full premium, matching EDM 01", () => {
  const adj = endorsementAdjustment({
    before: edmBefore,
    after: edmAfter,
    effectiveDate: "2026-08-18",
    ...period,
    adminCost: 10_000,
  })
  assert.equal(adj.fromStart, true)
  assert.equal(adj.factor, 1)
  assert.deepEqual(adj.before.map((l) => l.prorated), [-5_341_650, -223_500, -375_000])
  assert.deepEqual(adj.after.map((l) => l.prorated), [4_780_000, 200_000, 562_500])
  assert.equal(adj.premium, -397_650)
  assert.equal(adj.total, -387_650)
  assert.equal(adj.sumInsuredChange, -23_500_000)
})

test("a mid-term endorsement is prorated over the remaining days / 365", () => {
  // Contoh Harry: 525 jt, sisa 14 hari (10 → 24 November 2026).
  const before: EndorsementCalc = {
    lines: [{ label: "Comprehensive", basis: 525_000_000, rate: 2.39, unit: "%", premium: 12_547_500 }],
    sumInsured: 525_000_000,
    premium: 12_547_500,
  }
  const after: EndorsementCalc = {
    lines: [{ label: "Comprehensive", basis: 625_000_000, rate: 2.39, unit: "%", premium: 14_937_500 }],
    sumInsured: 625_000_000,
    premium: 14_937_500,
  }
  const adj = endorsementAdjustment({
    before,
    after,
    effectiveDate: "2026-11-10",
    inceptionDate: "2025-11-24",
    expiryDate: "2026-11-24",
  })
  assert.equal(adj.days, 14)
  assert.equal(adj.fromStart, false)
  assert.equal(adj.beforeTotal, -481_273.97)
  assert.equal(adj.afterTotal, 572_945.21)
  assert.equal(adj.premium, 91_671.24)
  assert.equal(adj.sumInsuredChange, 100_000_000)
})

test("a cancellation refunds every line, prorata or from the policy start", () => {
  const prorata = endorsementAdjustment({ before: edmBefore, after: null, effectiveDate: "2027-02-18", ...period })
  assert.equal(prorata.days, 181)
  assert.equal(prorata.after.length, 0)
  assert.equal(prorata.premium, -2_945_663.42)
  assert.equal(prorata.sumInsuredAfter, 0)
  assert.equal(prorata.sumInsuredChange, -223_500_000)
  const flat = endorsementAdjustment({ before: edmBefore, after: null, effectiveDate: "2026-08-18", ...period })
  assert.equal(flat.premium, -5_940_150)
})

test("the slip discount applies to the premium difference", () => {
  const adj = endorsementAdjustment({
    before: edmBefore,
    after: edmAfter,
    effectiveDate: "2026-08-18",
    ...period,
    discountPct: 15,
    stampDuty: 10_000,
  })
  assert.equal(adj.discount, 59_647.5)
  assert.equal(adj.total, -397_650 + 59_647.5 + 10_000)
})

test("without an effective date nothing is prorated", () => {
  assert.deepEqual(endorsementProrata({ effectiveDate: null, ...period }), { days: 0, factor: 0, fromStart: false })
})

function mvSlip(amount: number, rate: number): PlacingSlip {
  const s = switchCob(emptySlip(), "Motor Vehicle")
  return {
    ...s,
    inceptionDate: "2026-08-18",
    expiryDate: "2027-08-18",
    interestItems: s.interestItems.map((i, n) => (n === 0 ? { ...i, amount } : i)),
    rateLines: s.rateLines.map((l) => (l.label === "Comprehensive Casco" ? { ...l, rate } : l)),
  }
}

test("slip lines carry the value, rate and annual premium of each cover", () => {
  const calc = slipCalc(mvSlip(223_500_000, 2.39))
  assert.deepEqual(calc.lines, [
    { label: "Comprehensive Casco", basis: 223_500_000, rate: 2.39, unit: "%", premium: 5_341_650 },
  ])
  assert.equal(calc.sumInsured, 223_500_000)
})

test("an endorsement slip compares its lines with the stored before calculation", () => {
  const base = mvSlip(223_500_000, 2.39)
  const endorsement: PlacingSlip = {
    ...mvSlip(200_000_000, 2.39),
    kind: "Endorsement",
    effectiveDate: "2026-08-18",
    beforeCalc: slipCalc(base),
  }
  assert.equal(slipEndorsementAdjustment(endorsement)?.premium, -561_650)
  const cancellation: PlacingSlip = { ...endorsement, kind: "Cancellation" }
  assert.equal(slipEndorsementAdjustment(cancellation)?.premium, -5_341_650)
  assert.equal(slipEndorsementAdjustment(base), null)
})
