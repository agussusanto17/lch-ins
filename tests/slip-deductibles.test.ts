import assert from "node:assert/strict"
import test from "node:test"

import {
  addLocationPatch,
  deductibleRows,
  deductibleUnits,
  emptySlip,
  setDeductiblesAllUnits,
  shareDeductiblesPatch,
  switchCob,
  unitsShareDeductibles,
} from "../components/underwriting/slip-model"
import { recalcSlip } from "../lib/calc"
import type { PlacingSlip } from "../lib/data/types"
import { deductibleGroups, deductiblesByUnit } from "../lib/slip-deductibles"

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

/** Slip Property dua lokasi: lokasi 2 ditambah setelah deductible lokasi 1 diisi. */
function twoLocations(): PlacingSlip {
  const slip = recalcSlip(propertySlip())
  return recalcSlip({ ...slip, ...addLocationPatch(slip) })
}

/** Ganti deductible satu cover milik satu unit. */
function setUnitDeductible(
  slip: PlacingSlip,
  unitNo: number,
  cover: string,
  deductibles: string[]
): PlacingSlip {
  const unit = deductibleUnits(slip)[unitNo - 1]
  const row = deductibleRows(slip, [], unit).find((r) => r.cover === cover)!
  return recalcSlip({
    ...slip,
    [row.group]: slip[row.group].map((l) =>
      l.id === row.lineId ? { ...l, deductibles } : l
    ),
  })
}

test("lokasi baru menyalin deductible lokasi 1, dan dokumen mencetaknya sekali", () => {
  const slip = twoLocations()
  assert.equal(deductibleUnits(slip).length, 2)
  assert.ok(unitsShareDeductibles(slip))
  assert.deepEqual(deductibleGroups(slip), deductibleGroups(propertySlip()))
})

test("deductible yang berbeda per lokasi dicetak per lokasi", () => {
  const slip = setUnitDeductible(twoLocations(), 2, "FLEXAS", ["FLEXAS: IDR 10.000.000 (gudang)"])
  assert.equal(unitsShareDeductibles(slip), false)
  const groups = deductibleGroups(slip)
  assert.deepEqual(
    groups.map((g) => [g.unit, g.heading]),
    [
      ["Location 1", "Section 1 — Material Damage"],
      ["Location 1", "Section 2 — Business Interruption"],
      ["Location 2", "Section 1 — Material Damage"],
      ["Location 2", "Section 2 — Business Interruption"],
    ]
  )
  assert.equal(groups[0].texts[0], "FLEXAS: Nil")
  assert.equal(groups[2].texts[0], "FLEXAS: IDR 10.000.000 (gudang)")
  assert.deepEqual(
    deductiblesByUnit(groups).map((b) => [b.unit, b.groups.length]),
    [
      ["Location 1", 2],
      ["Location 2", 2],
    ]
  )
  // EQVET kedua lokasi sama: polis EQVET tetap mencetak satu daftar.
  assert.deepEqual(
    deductibleGroups(slip, "EQVET").map((g) => g.unit ?? null),
    [null, null]
  )
})

test("isian bersama mengubah cover yang sama di semua lokasi; samakan menyalin lokasi 1", () => {
  let slip = twoLocations()
  const row = deductibleRows(slip).find((r) => r.cover === "FWTWD")!
  slip = recalcSlip({ ...slip, ...setDeductiblesAllUnits(slip, row, ["FWTWD: 5% of claim"]) })
  const fwtwd = (s: PlacingSlip, no: number) =>
    deductibleRows(s, [], deductibleUnits(s)[no - 1]).find((r) => r.cover === "FWTWD")!
      .deductibles
  assert.deepEqual(fwtwd(slip, 1), ["FWTWD: 5% of claim"])
  assert.deepEqual(fwtwd(slip, 2), ["FWTWD: 5% of claim"])

  slip = setUnitDeductible(slip, 2, "FWTWD", ["Nil"])
  assert.equal(unitsShareDeductibles(slip), false)
  slip = recalcSlip({ ...slip, ...shareDeductiblesPatch(slip) })
  assert.ok(unitsShareDeductibles(slip))
  assert.deepEqual(fwtwd(slip, 2), ["FWTWD: 5% of claim"])
})

test("deductible per kendaraan dicetak per kendaraan, termasuk PA", () => {
  let slip = recalcSlip({
    ...switchCob(emptySlip(), "Motor Vehicle"),
    interestItems: [
      { id: "v1", description: "Toyota Avanza", amount: 250_000_000 },
      { id: "v2", description: "Hino Dutro", amount: 600_000_000 },
    ],
  })
  slip = setUnitDeductible(slip, 1, "Comprehensive Casco", ["IDR 300.000 any one accident"])
  slip = setUnitDeductible(slip, 2, "Comprehensive Casco", ["IDR 1.000.000 any one accident"])
  const pa = deductibleUnits(slip)[1].lines.paLines[0]
  slip = recalcSlip({
    ...slip,
    paLines: slip.paLines.map((l) => (l.id === pa.id ? { ...l, deductibles: ["PA: Nil"] } : l)),
  })
  assert.deepEqual(deductibleGroups(slip), [
    { unit: "Vehicle 1", heading: null, texts: ["IDR 300.000 any one accident"] },
    { unit: "Vehicle 2", heading: null, texts: ["IDR 1.000.000 any one accident", "PA: Nil"] },
  ])
})

test("objek limit saja bukan unit deductible, slip ber-section tetap per section", () => {
  const liability = recalcSlip({
    ...switchCob(emptySlip(), "Liability"),
    interestItems: [
      { id: "o1", description: "Public Liability", amount: 1_000_000_000 },
      { id: "o2", description: "Limit any one occurrence", amount: 500_000_000, limitOnly: true },
    ],
  })
  assert.deepEqual(deductibleUnits(liability).map((u) => u.id), ["o1"])

  const car = recalcSlip({
    ...switchCob(emptySlip(), "Engineering"),
    usesSections: true,
    interestItems: [
      { id: "c1", description: "Contract Works", amount: 1_000_000_000 },
      { id: "c2", description: "Plant & Equipment", amount: 200_000_000 },
    ],
  })
  assert.deepEqual(deductibleUnits(car).map((u) => u.id), ["slip"])
})
