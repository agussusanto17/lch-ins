import assert from "node:assert/strict"
import test from "node:test"

import { calculateParEqvet, recalcSlip, totalPremium, totalSumInsured } from "../lib/calc"
import {
  addLocationPatch,
  deductibleUnits,
  emptySlip,
  floatingDropsLocationData,
  floatingSumInsuredPatch,
  locationIssues,
  locationRowsPatch,
  propertyRateLinesPatch,
  rateLinesWithBounds,
  removeLocationPatch,
  switchCob,
  updateLocationPatch,
} from "../components/underwriting/slip-model"
import { propertyRateLabels } from "../lib/data/reference"
import type { PlacingSlip } from "../lib/data/types"
import {
  isFloatingSumInsured,
  isMultiLocation,
  locationGroups,
  strictestBounds,
} from "../lib/slip-locations"

const WAREHOUSE = "29371 - Private Warehouses"
const RATES: Record<string, number> = {
  FLEXAS: 1.127,
  FWTWD: 0.5,
  RSMDCC: 0.01,
  "Other Losses": 0.01,
}

const apply = (slip: PlacingSlip, patch: Partial<PlacingSlip>) =>
  recalcSlip({ ...slip, ...patch })

/** Dua ruko Sunter dengan okupasi dan kelas yang sama, belum floating. */
function twoLocations(): PlacingSlip {
  let slip = switchCob(emptySlip(), "Property")
  slip = apply(slip, addLocationPatch(slip))
  const [a, b] = locationGroups(slip).map((g) => g.location.id)
  slip = apply(
    slip,
    updateLocationPatch(slip, a, {
      riskLocation: "Ruko Nirwana Asri Tahap 2 blok A No 31, Sunter Agung, Jakarta Utara",
      occupation: WAREHOUSE,
      constructionClass: "K1",
    })
  )
  slip = apply(
    slip,
    updateLocationPatch(slip, b, {
      riskLocation: "Ruko Nirwana Asri Tahap 2 blok A No 36, Sunter Agung, Jakarta Utara",
      occupation: WAREHOUSE,
      constructionClass: "K1",
    })
  )
  return slip
}

/** Placing slip 015/LCH-PLCMT/PS-PAR/X/2026: On Floating Stock IDR 12.000.000.000, dua lokasi. */
function slip015(): PlacingSlip {
  let slip = twoLocations()
  slip = apply(slip, floatingSumInsuredPatch(slip, true))
  slip = apply(slip, {
    floatingSumInsuredText: "On Floating Stock",
    adminCost: 40_000,
    stampDuty: 10_000,
    sumInsuredSection1: [{ id: "stock", description: "Stock", amount: 12_000_000_000 }],
    rateLines: slip.rateLines.map((l) => ({ ...l, rate: RATES[l.label] ?? null })),
  })
  return slip
}

test("slip 015: premi floating dihitung sekali dari total sum insured", () => {
  const slip = slip015()
  assert.equal(isFloatingSumInsured(slip), true)
  // Dokumen floating dicetak seperti satu lokasi, tanpa lampiran DAFTAR LOKASI.
  assert.equal(isMultiLocation(slip), false)
  assert.equal(totalSumInsured(slip), 12_000_000_000)

  const calc = calculateParEqvet(slip)
  const premium = Object.fromEntries(calc.par.lines.map((l) => [l.label, l.premium]))
  assert.deepEqual(premium, {
    FLEXAS: 13_524_000,
    FWTWD: 6_000_000,
    RSMDCC: 120_000,
    "Other Losses": 120_000,
    "BI PAR (FLEXAS + FWTWD + RSMDCC + Others)": 0,
  })
  assert.ok(calc.par.lines.every((l) => l.locationNo === 1))
  assert.equal(calc.par.subtotal, 19_764_000)
  assert.equal(calc.par.total, 19_814_000)
  assert.equal(calc.eqvet.subtotal, 0)
  assert.equal(totalPremium(slip), 19_764_000)
})

test("slip floating punya satu daftar deductible dan satu pemeriksaan sum insured", () => {
  const slip = slip015()
  assert.equal(deductibleUnits(slip).length, 1)
  assert.deepEqual(locationIssues(slip), [])

  const [, second] = locationGroups(slip).map((g) => g.location.id)
  const incomplete = apply(
    slip,
    updateLocationPatch(slip, second, { riskLocation: " ", occupation: undefined })
  )
  // Lokasi 2 tanpa sum insured sendiri tidak dianggap kurang.
  assert.deepEqual(locationIssues(incomplete), [
    "Isi alamat lokasi 2.",
    "Pilih okupasi OJK untuk lokasi 2.",
  ])
})

test("nyalakan floating: sum insured digabung, rate lokasi lain dibuang", () => {
  let slip = twoLocations()
  const [a, b] = locationGroups(slip)
  slip = apply(slip, locationRowsPatch(slip, "sumInsuredSection1", a.location.id, [
    { id: "s1", description: "Stock Gudang 31", amount: 5_000_000_000 },
  ]))
  slip = apply(slip, locationRowsPatch(slip, "sumInsuredSection1", b.location.id, [
    { id: "s2", description: "Stock Gudang 36", amount: 7_000_000_000 },
  ]))
  slip = apply(slip, {
    rateLines: slip.rateLines.map((l) => ({
      ...l,
      rate: RATES[l.label] ?? null,
      deductibles: l.label === "FLEXAS" ? ["5% of claim"] : l.deductibles,
    })),
  })
  assert.equal(floatingDropsLocationData(slip), true)

  const lines = slip.rateLines.length
  slip = apply(slip, floatingSumInsuredPatch(slip, true))
  const first = locationGroups(slip)[0].location.id
  assert.deepEqual(
    slip.sumInsuredSection1.map((i) => [i.id, i.locationId]),
    [
      ["s1", first],
      ["s2", first],
    ]
  )
  // Baris sum insured kosong lokasi 2 tidak ikut digabung.
  assert.equal(slip.sumInsuredSection2.length, 1)
  assert.equal(slip.rateLines.length, lines / 2)
  assert.equal(totalSumInsured(slip), 12_000_000_000)
  assert.equal(calculateParEqvet(slip).par.subtotal, 19_764_000)
  assert.equal(floatingDropsLocationData(slip), false)
})

test("matikan floating: lokasi lain mendapat salinan rate dan deductible", () => {
  let slip = slip015()
  slip = apply(slip, {
    rateLines: slip.rateLines.map((l) =>
      l.label === "FLEXAS" ? { ...l, deductibles: ["5% of claim"] } : l
    ),
  })
  slip = apply(slip, floatingSumInsuredPatch(slip, false))
  assert.equal(isMultiLocation(slip), true)

  const [first, second] = locationGroups(slip)
  assert.equal(totalSumInsured(slip), 12_000_000_000)
  assert.equal(sumOf(first.section1), 12_000_000_000)
  assert.deepEqual(
    second.section1.map((i) => [i.description, i.amount]),
    [["", 0]]
  )
  const flexas = second.rateLines.find((l) => l.label === "FLEXAS")
  assert.equal(flexas?.rate, 1.127)
  assert.deepEqual(flexas?.deductibles, ["5% of claim"])
  // Premi tetap dari lokasi 1 sampai sum insured lokasi 2 diisi.
  assert.equal(calculateParEqvet(slip).par.subtotal, 19_764_000)
})

test("tambah dan hapus lokasi slip floating", () => {
  let slip = slip015()
  const rateLines = slip.rateLines.length
  slip = apply(slip, addLocationPatch(slip))
  assert.equal(locationGroups(slip).length, 3)
  assert.equal(slip.rateLines.length, rateLines)
  assert.equal(slip.sumInsuredSection1.length, 1)

  // Lokasi 1 dihapus: sum insured dan rate bersama pindah ke lokasi berikutnya.
  const firstId = locationGroups(slip)[0].location.id
  slip = apply(slip, removeLocationPatch(slip, firstId))
  const groups = locationGroups(slip)
  assert.equal(groups.length, 2)
  assert.equal(groups[0].rateLines.length, rateLines)
  assert.equal(sumOf(groups[0].section1), 12_000_000_000)
  assert.equal(calculateParEqvet(slip).par.subtotal, 19_764_000)
})

test("type of cover baru tidak menambah baris rate untuk lokasi 2 slip floating", () => {
  const slip = slip015()
  // 0116 Terrorism & Sabotage: satu baris rate.
  const next = apply(slip, propertyRateLinesPatch(slip, "0116"))
  const [first, second] = locationGroups(next)
  assert.deepEqual(
    first.rateLines.map((l) => l.label),
    propertyRateLabels("0116")
  )
  assert.equal(next.rateLines.length, 1)
  assert.equal(second.rateLines.length, 0)
})

test("batas FLEXAS floating mengikuti lokasi paling berisiko", () => {
  let slip = slip015()
  const [, second] = locationGroups(slip).map((g) => g.location.id)
  slip = apply(
    slip,
    updateLocationPatch(slip, second, { occupation: "29378 - Public Warehouses" })
  )
  const flexas = rateLinesWithBounds(slip).find((l) => l.label === "FLEXAS")
  assert.equal(flexas?.min, 2.255)
  assert.equal(flexas?.max, 2.52)
  assert.equal(flexas?.boundSource, "FLEXAS okupasi 29378 K1, lokasi 2")
})

test("strictestBounds memilih batas bawah tertinggi", () => {
  assert.equal(strictestBounds([]), null)
  assert.deepEqual(strictestBounds([{ min: 1, max: 2, source: "A" }]), {
    min: 1,
    max: 2,
    source: "A",
  })
  assert.deepEqual(
    strictestBounds([
      { min: 1, max: 2, source: "A" },
      null,
      { min: 3, max: 4, source: "C" },
    ]),
    { min: 3, max: 4, source: "C, lokasi 3" }
  )
})

test("ganti COB mematikan floating sum insured", () => {
  const slip = switchCob(slip015(), "Motor Vehicle")
  assert.equal(slip.floatingSumInsured, false)
  assert.equal(slip.floatingSumInsuredText, undefined)
})

function sumOf(items: { amount: number }[]) {
  return items.reduce((a, i) => a + i.amount, 0)
}
