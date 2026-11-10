import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip, switchCob } from "../components/underwriting/slip-model"
import type { PlacingSlip } from "../lib/data/types"
import { deductibleGroups } from "../lib/slip-deductibles"

/** Slip Property PAR + EQVET dengan deductible per cover, pola CI LCH. */
function propertySlip(): PlacingSlip {
  const slip = switchCob(emptySlip(), "Property")
  const deductibles: Record<string, string[]> = {
    FLEXAS: ["FLEXAS: Nil"],
    FWTWD: ["FWTWD: 10% of claim, minimum IDR 10.000.000"],
    "Other Losses": ["Others: IDR 5.000.000 any one accident"],
    "BI PAR (FLEXAS + FWTWD + RSMDCC + Others)": ["BI: 7 days waiting period"],
    EQVET: ["EQVET: 2.5% of TSI"],
    "BI EQVET": ["BI EQVET: 14 days waiting period"],
  }
  return {
    ...slip,
    rateLines: slip.rateLines.map((l) => ({ ...l, deductibles: deductibles[l.label] ?? [] })),
  }
}

test("property deductibles group by section, BI in Section 2", () => {
  assert.deepEqual(deductibleGroups(propertySlip()), [
    {
      heading: "Section 1 — Material Damage",
      texts: [
        "FLEXAS: Nil",
        "FWTWD: 10% of claim, minimum IDR 10.000.000",
        "Others: IDR 5.000.000 any one accident",
        "EQVET: 2.5% of TSI",
      ],
    },
    {
      heading: "Section 2 — Business Interruption",
      texts: ["BI: 7 days waiting period", "BI EQVET: 14 days waiting period"],
    },
  ])
})

test("a PAR + EQVET policy shows only its own part", () => {
  const slip = propertySlip()
  assert.deepEqual(deductibleGroups(slip, "PAR"), [
    {
      heading: "Section 1 — Material Damage",
      texts: [
        "FLEXAS: Nil",
        "FWTWD: 10% of claim, minimum IDR 10.000.000",
        "Others: IDR 5.000.000 any one accident",
      ],
    },
    { heading: "Section 2 — Business Interruption", texts: ["BI: 7 days waiting period"] },
  ])
  assert.deepEqual(deductibleGroups(slip, "EQVET"), [
    { heading: "Section 1 — Material Damage", texts: ["EQVET: 2.5% of TSI"] },
    { heading: "Section 2 — Business Interruption", texts: ["BI EQVET: 14 days waiting period"] },
  ])
})

test("other COBs list deductibles once, without a heading", () => {
  const slip = switchCob(emptySlip(), "Liability")
  const withDeductibles: PlacingSlip = {
    ...slip,
    rateLines: slip.rateLines.map((l) => ({
      ...l,
      deductibles: ["IDR 25.000.000 each and every loss", " IDR 25.000.000 each and every loss "],
    })),
  }
  assert.deepEqual(deductibleGroups(withDeductibles), [
    { heading: null, texts: ["IDR 25.000.000 each and every loss"] },
  ])
  assert.deepEqual(deductibleGroups(slip), [])
})
