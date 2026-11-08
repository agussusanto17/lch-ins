import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip, recalc, releaseIssues, switchCob } from "../components/underwriting/slip-model"
import { totalPayable, totalPremium } from "../lib/calc"
import type { PlacingSlip } from "../lib/data/types"
import {
  cleanOpenCoverRates,
  openCoverIssues,
  openCoverPremium,
  openCoverRateText,
  usesOpenCover,
} from "../lib/open-cover"

const MOP_RATES = [
  { id: "a", label: "DRY SHIPMENT", basis: "percent" as const, rate: 0.075 },
  { id: "b", label: "REEFER SHIPMENT (WITHIN INDONESIA)", basis: "percent" as const, rate: 0.0975 },
]

test("rate open cover dibersihkan, dicetak, dan dihitung per deklarasi", () => {
  assert.deepEqual(
    cleanOpenCoverRates([
      { id: "x", label: " 20 FT - Others ", basis: "per_unit", rate: 100_000, unit: "container" },
      { label: "", rate: null },
      { label: "Rusak", basis: "percent", rate: -1 },
      "bukan objek",
    ]),
    [
      { id: "x", label: "20 FT - Others", basis: "per_unit", rate: 100_000, unit: "container" },
      { id: "oc2", label: "Rusak", basis: "percent", rate: null },
    ]
  )
  assert.equal(openCoverRateText(MOP_RATES[0], "IDR"), "0,075%")
  assert.equal(
    openCoverRateText({ id: "c", label: "40 FT - Iron/Scrap", basis: "per_unit", rate: 250_000, unit: "container" }, "IDR"),
    "IDR 250.000 per container"
  )
  // Contoh analisa: kiriman dry IDR 1 M = 750.000; 10 container 20 FT Others = 1.000.000.
  assert.equal(openCoverPremium(MOP_RATES[0], 1_000_000_000), 750_000)
  assert.equal(openCoverPremium({ basis: "per_unit", rate: 100_000 }, 10), 1_000_000)
  assert.equal(openCoverPremium(MOP_RATES[0], 0), 0)
})

test("open cover hanya untuk COB selain Property dan Motor Vehicle", () => {
  assert.equal(usesOpenCover({ cob: "Marine Cargo", openCover: true }), true)
  assert.equal(usesOpenCover({ cob: "Property", openCover: true }), false)
  assert.equal(usesOpenCover({ cob: "Marine Cargo", openCover: false }), false)
})

test("release open cover tanpa TSI dan premi, cukup rate berkategori", () => {
  const base = switchCob(emptySlip(), "Marine Cargo")
  const slip = {
    ...base,
    clientId: "c-1",
    typeOfCover: "Marine Cargo Open Cover",
    correspondenceAddress: "Jakarta",
    inceptionDate: "2026-07-28",
    expiryDate: "2027-07-28",
    openCover: true,
    openCoverRates: [],
  } as PlacingSlip
  const without = releaseIssues(slip)
  assert.ok(without.includes("Isi minimal satu rate open cover."))
  assert.equal(without.some((i) => /sum insured/i.test(i)), false)
  assert.deepEqual(openCoverIssues({ openCoverRates: [{ id: "a", label: "", basis: "percent", rate: 0.1 }] }), [
    "Isi kategori rate open cover nomor 1.",
    "Isi minimal satu rate open cover.",
  ])
  const ready = releaseIssues({ ...slip, openCoverRates: MOP_RATES })
  assert.equal(ready.some((i) => /open cover|sum insured|rate/i.test(i)), false)
})

test("slip open cover tidak punya premi walau objeknya bernilai dan ber-rate", () => {
  const base = switchCob(emptySlip(), "Marine Cargo")
  const slip = recalc({
    ...base,
    openCover: true,
    openCoverRates: MOP_RATES,
    interestItems: [{ id: "i1", description: "Limit any one conveyance", amount: 75_000_000_000 }],
    rateLines: base.rateLines.map((l) => ({ ...l, rate: 0.075, vehicleId: "i1" })),
    adminCost: 0,
    stampDuty: 0,
  } as PlacingSlip)
  assert.equal(totalPremium(slip), 0)
  assert.equal(totalPayable(slip), 0)
})
