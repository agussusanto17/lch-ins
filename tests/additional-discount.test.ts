import assert from "node:assert/strict"
import test from "node:test"

import {
  additionalDiscountFor,
  calculateParEqvet,
  internalTotalPayable,
  recalcSlip,
  totalPayable,
} from "../lib/calc"
import { emptySlip, switchCob } from "../components/underwriting/slip-model"
import type { PlacingSlip } from "../lib/data/types"

/** Slip COB selain Property: premi 10.000.000, diskon 10%, admin 50.000, meterai 10.000. */
function liabilitySlip(additionalDiscountPct?: number): PlacingSlip {
  const slip = switchCob(emptySlip(), "Liability")
  return {
    ...slip,
    rateLines: [{ id: "r1", label: "Rate (%)", rate: 1, premium: 10_000_000 }],
    discountPct: 10,
    adminCost: 50_000,
    stampDuty: 10_000,
    additionalDiscountPct,
  }
}

/** Slip 015 (FLEXAS, FWTWD, RSMDCC, Others atas 12 M) ditambah EQVET dan diskon 10%. */
function propertySlip(additionalDiscountPct?: number): PlacingSlip {
  const slip = switchCob(emptySlip(), "Property")
  const rates: Record<string, number> = {
    FLEXAS: 1.127,
    FWTWD: 0.5,
    RSMDCC: 0.01,
    "Other Losses": 0.01,
    EQVET: 0.5,
  }
  return recalcSlip({
    ...slip,
    sumInsuredSection1: [{ id: "stock", description: "Stock", amount: 12_000_000_000 }],
    rateLines: slip.rateLines.map((l) => ({ ...l, rate: rates[l.label] ?? null })),
    discountPct: 10,
    adminCost: 40_000,
    stampDuty: 10_000,
    additionalDiscountPct,
  })
}

test("additional discount dihitung dari premi setelah discount utama", () => {
  assert.equal(additionalDiscountFor(9_000_000, 5), 450_000)
  assert.equal(additionalDiscountFor(9_000_000, undefined), 0)
  assert.equal(additionalDiscountFor(1_000_000.55, 15), 150_000.08)
})

test("slip biasa: Total Payable internal = premi − discount − additional + biaya", () => {
  const slip = liabilitySlip(5)
  // Total Payable resmi tetap memakai discount utama saja.
  assert.equal(totalPayable(slip), 9_060_000)
  // 10.000.000 − 1.000.000 = 9.000.000; − 5% = 8.550.000; + 60.000.
  assert.equal(internalTotalPayable(slip), 8_610_000)
  assert.equal(internalTotalPayable(liabilitySlip()), totalPayable(liabilitySlip()))
})

test("slip PAR + EQVET: additional discount per kelompok polis", () => {
  const slip = propertySlip(5)
  const { par, eqvet, grandTotal } = calculateParEqvet(slip)
  assert.equal(par.subtotal, 19_764_000)
  assert.equal(par.afterDiscount, 17_787_600)
  assert.equal(eqvet.subtotal, 6_000_000)
  assert.equal(eqvet.afterDiscount, 5_400_000)
  assert.equal(grandTotal, totalPayable(slip))
  // PAR: 17.787.600 − 889.380 + 50.000; EQVET: 5.400.000 − 270.000 + 50.000.
  assert.equal(internalTotalPayable(slip), 16_948_220 + 5_180_000)
  assert.equal(internalTotalPayable(propertySlip()), grandTotal)
})
