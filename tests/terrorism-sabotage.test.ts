import assert from "node:assert/strict"
import test from "node:test"

import {
  addLocationPatch,
  emptySlip,
  propertyRateLinesPatch,
  recalc,
  releaseIssues,
  slipFromSppa,
} from "../components/underwriting/slip-model"
import { isParEqvetSlip, totalPayable, totalPremium } from "../lib/calc"
import { PROPERTY_RATE_LINES, propertyRateLabels } from "../lib/data/reference"
import type { PlacingSlip } from "../lib/data/types"

test("PSATSI memakai satu baris rate Terrorism & Sabotage, type of cover lain PAR + EQVET", () => {
  assert.deepEqual(propertyRateLabels("0116"), ["Terrorism & Sabotage"])
  assert.deepEqual(propertyRateLabels("0109"), PROPERTY_RATE_LINES)
  assert.deepEqual(propertyRateLabels(undefined), PROPERTY_RATE_LINES)
})

test("ganti type of cover mengganti baris rate Property, dan tidak berubah bila labelnya sama", () => {
  const slip = emptySlip()
  const toTs = propertyRateLinesPatch(slip, "0116")
  assert.deepEqual(toTs.rateLines?.map((l) => l.label), ["Terrorism & Sabotage"])
  const ts = { ...slip, ...toTs } as PlacingSlip
  assert.deepEqual(propertyRateLinesPatch(ts, "0116"), {})
  const back = propertyRateLinesPatch(ts, "0109")
  assert.deepEqual(back.rateLines?.map((l) => l.label), PROPERTY_RATE_LINES)
  // COB lain tidak disentuh.
  assert.deepEqual(propertyRateLinesPatch({ ...slip, cob: "Liability" }, "0116"), {})
})

test("slip multi lokasi mendapat baris Terrorism & Sabotage per lokasi", () => {
  const one = emptySlip()
  const two = { ...one, ...addLocationPatch(one) } as PlacingSlip
  const patch = propertyRateLinesPatch(two, "0116")
  assert.equal(patch.rateLines?.length, 2)
  const locations = new Set(patch.rateLines?.map((l) => l.locationId))
  assert.equal(locations.size, 2)
})

test("premi Terrorism & Sabotage Wisma Habco: 130 M × 0,105‰ + biaya 50.000", () => {
  const base = emptySlip()
  const slip = recalc({
    ...base,
    ...propertyRateLinesPatch(base, "0116"),
    typeOfCover: "PSATSI",
    sumInsuredSection1: [{ id: "m1", description: "Material Damage", amount: 130_000_000_000 }],
    sumInsuredSection2: [],
    adminCost: 40_000,
    stampDuty: 10_000,
  } as PlacingSlip)
  const ts = { ...slip, rateLines: slip.rateLines.map((l) => ({ ...l, rate: 0.105 })) }
  const calculated = recalc(ts)
  assert.equal(isParEqvetSlip(calculated), false)
  assert.equal(totalPremium(calculated), 13_650_000)
  assert.equal(totalPayable(calculated), 13_700_000)
  // Tanpa FLEXAS/EQVET, kelas konstruksi tidak diminta saat release.
  const issues = releaseIssues({
    ...calculated,
    insuredName: "WISMA HABCO",
    inceptionDate: "2026-06-30",
    expiryDate: "2027-06-30",
    riskLocation: "Tower Prima dan Tower Tama",
    occupation: "2976 - Kantor",
  })
  assert.equal(issues.some((i) => /kelas konstruksi/i.test(i)), false)
  assert.equal(issues.some((i) => /rate/i.test(i)), false)
})

test("slip dari SPPA PSATSI langsung memakai baris Terrorism & Sabotage", () => {
  const sppa = {
    id: "sppa-1",
    clientId: "c-1",
    insuredName: "WISMA HABCO",
    cob: "Property",
    typeOfCover: "PSATSI",
    currency: "IDR",
    periodStart: "2026-06-30",
    periodEnd: "2027-06-30",
    sumInsured: 130_000_000_000,
    occupation: "",
    riskLocation: "Tower Prima dan Tower Tama",
  } as unknown as Parameters<typeof slipFromSppa>[0]
  const covers = [
    { code: "0109", name: "Property All Risk", abbreviation: "PAR" },
    { code: "0116", name: "PSATSI", abbreviation: "TS" },
  ]
  const slip = slipFromSppa(sppa, null, covers)
  assert.deepEqual(slip.rateLines.map((l) => l.label), ["Terrorism & Sabotage"])
  const par = slipFromSppa({ ...sppa, typeOfCover: "Property All Risk" }, null, covers)
  assert.deepEqual(par.rateLines.map((l) => l.label), PROPERTY_RATE_LINES)
})
