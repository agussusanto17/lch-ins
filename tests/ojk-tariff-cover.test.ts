import assert from "node:assert/strict"
import test from "node:test"

import {
  emptySlip,
  itemRowsPatch,
  rateLinesWithBounds,
  releaseIssues,
  slipFromSppa,
  switchCob,
} from "../components/underwriting/slip-model"
import {
  brokerageCapFor,
  brokerageLimitIssue,
  brokerageLimitText,
  maxBrokeragePct,
  recalcSlip,
  usesOjkTariff,
} from "../lib/calc"
import type { PlacingSlip, Sppa } from "../lib/data/types"
import { itemGroups } from "../lib/slip-items"

/**
 * Slip Motor Vehicle satu unit dengan rate casco jauh di bawah tarif OJK,
 * brokerage 30%, dan batas TPL yang pernah tersimpan.
 */
function motorSlip(typeOfCover: string, ojkTariff?: boolean): PlacingSlip {
  let slip = switchCob(emptySlip(), "Motor Vehicle")
  slip = recalcSlip({
    ...slip,
    typeOfCover,
    ojkTariff,
    brokeragePct: 30,
    interestItems: [
      { id: "u1", description: "Excavator Komatsu PC200-8", amount: 1_500_000_000 },
    ],
  })
  const g = itemGroups(slip)[0]
  slip = recalcSlip({
    ...slip,
    ...itemRowsPatch(
      slip,
      "rateLines",
      "u1",
      g.rateLines.map((l) => ({
        ...l,
        rate: l.label === "Comprehensive Casco" ? 0.05 : null,
      }))
    ),
  })
  return recalcSlip({
    ...slip,
    tplLines: slip.tplLines.map((l, i) =>
      i === 0 ? { ...l, rate: 5, min: 1, max: 1, boundSource: "TPL OJK" } : l
    ),
  })
}

const ojkIssues = (slip: PlacingSlip) =>
  releaseIssues(slip).filter((m) => m.includes("OJK"))

test("slip Motor Vehicle biasa tetap memakai batas rate dan brokerage OJK", () => {
  const slip = motorSlip("PSKBI")
  assert.equal(usesOjkTariff(slip), true)
  const casco = rateLinesWithBounds(slip).find((l) => l.label === "Comprehensive Casco")
  assert.ok(casco?.min != null)
  assert.equal(maxBrokeragePct(slip), 25)
  assert.equal(brokerageLimitText(slip), "maksimal 25%")
  assert.ok(brokerageLimitIssue(slip))
  // Casco di bawah batas, TPL di luar batas tersimpan, dan brokerage di atas 25%.
  assert.equal(ojkIssues(slip).length, 3)
})

test("Heavy Equipment tanpa batas rate dan brokerage OJK", () => {
  const slip = motorSlip("Heavy Equipment", false)
  assert.equal(usesOjkTariff(slip), false)
  // Batas yang pernah tersimpan ikut dibuang, misalnya setelah ganti type of cover.
  const withStored = {
    ...slip,
    rateLines: slip.rateLines.map((l) => ({ ...l, min: 2, max: 3, boundSource: "OJK" })),
  }
  assert.ok(
    rateLinesWithBounds(withStored).every(
      (l) => l.min == null && l.max == null && !l.boundSource
    )
  )
  assert.equal(maxBrokeragePct(slip), null)
  assert.equal(brokerageLimitText(slip), null)
  assert.equal(brokerageLimitIssue(slip), null)
  assert.deepEqual(ojkIssues(withStored), [])
})

test("batas biaya akuisisi mengikuti flag tarif OJK type of cover", () => {
  assert.equal(brokerageCapFor("Motor Vehicle"), 25)
  assert.equal(brokerageCapFor("Motor Vehicle", true), 25)
  assert.equal(brokerageCapFor("Motor Vehicle", false), null)
  assert.equal(brokerageCapFor("Property"), 15)
  assert.equal(brokerageCapFor("Marine Cargo"), null)
})

test("slip dari SPPA membawa flag tarif OJK type of cover", () => {
  const sppa = {
    id: "sp1",
    clientId: "c1",
    insuredName: "PT Alat Berat",
    cob: "Motor Vehicle",
    typeOfCover: "Heavy Equipment",
    currency: "IDR",
    sumInsured: 1_500_000_000,
    periodStart: "2026-12-01",
    periodEnd: "2027-12-01",
    riskLocation: "Balikpapan",
  } as unknown as Sppa
  const covers = [
    { name: "PSKBI", abbreviation: "MV", ojkTariff: true },
    { name: "Heavy Equipment", abbreviation: "HE", ojkTariff: false },
  ]
  assert.equal(slipFromSppa(sppa, null, covers).ojkTariff, false)
  assert.equal(
    slipFromSppa({ ...sppa, typeOfCover: "PSKBI" }, null, covers).ojkTariff,
    undefined
  )
})
