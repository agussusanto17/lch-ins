import assert from "node:assert/strict"
import test from "node:test"

import {
  calculateParEqvet,
  recalcSlip,
  totalPayable,
  totalPremium,
} from "../lib/calc"
import { emptySlip } from "../components/underwriting/slip-model"
import type { PlacingSlip } from "../lib/data/types"

/** Slip Property dengan rate FLEXAS 0,5‰ dan Section 1 IDR 1 miliar. */
function propertySlip(section2: number): PlacingSlip {
  const base = emptySlip()
  return recalcSlip({
    ...base,
    indemnityPeriod: "12 months",
    sumInsuredSection1: [
      { id: "m1", description: "Building", amount: 1_000_000_000 },
    ],
    sumInsuredSection2: section2
      ? [{ id: "b1", description: "Gross Profit", amount: section2 }]
      : [],
    rateLines: base.rateLines.map((l) =>
      l.label === "FLEXAS" ? { ...l, rate: 0.5 } : l
    ),
  })
}

const biPar = (slip: PlacingSlip) =>
  slip.rateLines.find((l) => l.label.startsWith("BI PAR"))

test("slip tanpa Section 2 tidak punya rate dan premi BI", () => {
  const slip = propertySlip(0)
  assert.equal(biPar(slip)?.rate, null)
  assert.equal(totalPremium(slip), 500_000)

  // Dokumen dan Total Payable dulu memakai Section 1 untuk baris BI, sehingga
  // premi PAR menjadi dua kali lipat.
  const calc = calculateParEqvet(slip)
  assert.equal(calc.par.subtotal, 500_000)
  assert.equal(totalPayable(slip), 500_000)
})

test("rate BI dihitung dari Section 2 bila ada", () => {
  const slip = propertySlip(200_000_000)
  assert.equal(biPar(slip)?.rate, 0.5)
  assert.equal(biPar(slip)?.premium, 100_000)
  assert.equal(calculateParEqvet(slip).par.subtotal, 600_000)
  assert.equal(totalPayable(slip), 600_000)
})

test("rate BI lama tanpa Section 2 tidak dicetak", () => {
  // Rate BI yang tersimpan sebelum perbaikan, dari slip tanpa Section 2.
  const saved = propertySlip(0)
  const stale: PlacingSlip = {
    ...saved,
    rateLines: saved.rateLines.map((l) =>
      l.label.startsWith("BI PAR") ? { ...l, rate: 0.5, premium: 0 } : l
    ),
  }
  const line = calculateParEqvet(stale).par.lines.find((l) =>
    l.label.startsWith("BI PAR")
  )
  assert.equal(line?.ratePercent, null)
  assert.equal(line?.premium, 0)
  assert.equal(totalPayable(stale), 500_000)
})
