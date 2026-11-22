import assert from "node:assert/strict"
import test from "node:test"

import { recalcSlip } from "../lib/calc"
import type { PlacingSlip } from "../lib/data/types"
import {
  cleanYearValues,
  isMultiYearMotor,
  policyYears,
  withYearValue,
  yearlySumInsured,
} from "../lib/multi-year"
import { multiYearSchedule } from "../lib/multi-year-schedule"
import { itemGroups } from "../lib/slip-items"
import { emptySlip, switchCob } from "../components/underwriting/slip-model"

/**
 * Polis MAG 45020124010723 PT KB Finansia Multi Finance QQ PT Diraja Traillindo: 5 dump truck
 * Isuzu FVZ-34, 10 Juni 2024 s/d 10 Juni 2028, Comprehensive 2,39%, TPL 50 juta × 1,125%,
 * nilai turun 10% per tahun. Total premi polis 650.293.577,50.
 */
function dirajaSlip(units = 1, patch: Partial<PlacingSlip> = {}): PlacingSlip {
  const base = switchCob(emptySlip(), "Motor Vehicle")
  const first = itemGroups(recalcSlip(base))[0]
  const ids = Array.from({ length: units }, (_, i) => `v${i + 1}`)
  return recalcSlip({
    ...base,
    inceptionDate: "2024-06-10",
    expiryDate: "2028-06-10",
    multiYearDepreciationPct: 10,
    interestItems: ids.map((id) => ({ ...first.item, id, description: "ISUZU FVZ-34 NHP DUMP TRUCK", amount: 1_555_000_000 })),
    rateLines: ids.flatMap((id) =>
      first.rateLines.map((l, i) => ({
        ...l,
        id: `${id}-r${i + 1}`,
        vehicleId: id,
        rate: i === 0 ? 2.39 : null,
      }))
    ),
    tplLines: ids.flatMap((id) =>
      first.tplLines.map((l, i) => ({
        ...l,
        id: `${id}-t${i + 1}`,
        vehicleId: id,
        basis: i === 0 ? "50000000" : "0",
        rate: i === 0 ? 1.125 : null,
      }))
    ),
    paLines: ids.flatMap((id) =>
      first.paLines.map((l, i) => ({ ...l, id: `${id}-p${i + 1}`, vehicleId: id }))
    ),
    ...patch,
  })
}

const total = (slip: PlacingSlip) =>
  [...slip.rateLines, ...slip.tplLines, ...slip.paLines].reduce((sum, l) => sum + l.premium, 0)

test("tahun polis dari periode: hanya periode lebih dari satu tahun yang dibagi", () => {
  assert.deepEqual(
    policyYears({ inceptionDate: "2024-06-10", expiryDate: "2028-06-10" }).map((y) => [y.start, y.end, y.factor]),
    [
      ["2024-06-10", "2025-06-10", 1],
      ["2025-06-10", "2026-06-10", 1],
      ["2026-06-10", "2027-06-10", 1],
      ["2027-06-10", "2028-06-10", 1],
    ]
  )
  assert.deepEqual(policyYears({ inceptionDate: "2024-06-10", expiryDate: "2025-06-10" }), [])
  assert.deepEqual(policyYears({ inceptionDate: "2024-06-10", expiryDate: "2025-01-10" }), [])
  assert.deepEqual(policyYears({ inceptionDate: "2024-06-10", expiryDate: "2028-06-10", periodTba: true }), [])
  assert.deepEqual(policyYears({ inceptionDate: null, expiryDate: "2028-06-10" }), [])
  // Tahun terakhir tidak penuh: prorata hari.
  const partial = policyYears({ inceptionDate: "2024-06-10", expiryDate: "2025-12-10" })
  assert.deepEqual(partial.map((y) => [y.end, y.factor]), [
    ["2025-06-10", 1],
    ["2025-12-10", 183 / 365],
  ])
})

test("nilai kendaraan turun 10% dari tahun sebelumnya, seperti polis DIRAJA", () => {
  assert.deepEqual(yearlySumInsured(1_555_000_000, 10, 4), [
    1_555_000_000, 1_399_500_000, 1_259_550_000, 1_133_595_000,
  ])
  assert.deepEqual(yearlySumInsured(1_000, null, 3), [1_000, 1_000, 1_000])
})

test("premi polis DIRAJA: 130.058.715,50 per unit, 650.293.577,50 untuk 5 unit", () => {
  const one = dirajaSlip()
  assert.equal(isMultiYearMotor(one), true)
  assert.equal(one.rateLines[0].premium, 127_808_715.5)
  assert.equal(one.tplLines[0].premium, 2_250_000)
  assert.equal(total(one), 130_058_715.5)
  assert.equal(total(dirajaSlip(5)), 650_293_577.5)
})

test("rincian per tahun sama dengan lampiran polis", () => {
  const [vehicle] = multiYearSchedule(dirajaSlip())
  assert.deepEqual(
    vehicle.years.map((y) => [y.sumInsured, y.rows.map((r) => [r.kind, r.basis, r.rate, r.premium])]),
    [
      [1_555_000_000, [["casco", 1_555_000_000, 2.39, 37_164_500], ["tpl", 50_000_000, 1.125, 562_500]]],
      [1_399_500_000, [["casco", 1_399_500_000, 2.39, 33_448_050], ["tpl", 50_000_000, 1.125, 562_500]]],
      [1_259_550_000, [["casco", 1_259_550_000, 2.39, 30_103_245], ["tpl", 50_000_000, 1.125, 562_500]]],
      [1_133_595_000, [["casco", 1_133_595_000, 2.39, 27_092_920.5], ["tpl", 50_000_000, 1.125, 562_500]]],
    ]
  )
  assert.equal(vehicle.total, 130_058_715.5)
})

test("periode satu tahun, periode TBA, dan COB lain tetap dihitung setahun", () => {
  const oneYear = dirajaSlip(1, { expiryDate: "2025-06-10" })
  assert.equal(isMultiYearMotor(oneYear), false)
  assert.equal(oneYear.rateLines[0].premium, 37_164_500)
  assert.deepEqual(multiYearSchedule(oneYear), [])
  const tba = dirajaSlip(1, { periodTba: true })
  assert.equal(tba.rateLines[0].premium, 37_164_500)

  const liability = recalcSlip({
    ...switchCob(emptySlip(), "Liability"),
    inceptionDate: "2024-06-10",
    expiryDate: "2028-06-10",
    interestItems: [{ id: "o1", description: "Limit", amount: 1_000_000 }],
    rateLines: [{ id: "o1-r1", label: "Rate (%)", rate: 1, premium: 0, vehicleId: "o1" }],
  })
  assert.equal(liability.rateLines[0].premium, 10_000)
})

test("tahun terakhir yang tidak penuh dihitung prorata hari", () => {
  const slip = dirajaSlip(1, { expiryDate: "2025-12-10", multiYearDepreciationPct: undefined })
  // 37.164.500 setahun, lalu 183/365 hari: 18.633.160,27.
  assert.equal(slip.rateLines[0].premium, 55_797_660.27)
})

test("nilai casco per tahun bisa diisi manual; tahun berikutnya turun dari nilai manual", () => {
  // Harry (22 November 2026): harga kendaraan tidak selalu turun dengan persen yang sama.
  assert.deepEqual(yearlySumInsured(1_555_000_000, 10, 4, [null, 1_450_000_000]), [
    1_555_000_000, 1_450_000_000, 1_305_000_000, 1_174_500_000,
  ])
  assert.deepEqual(yearlySumInsured(1_555_000_000, 10, 4, [null, null, 1_300_000_000, 1_250_000_000]), [
    1_555_000_000, 1_399_500_000, 1_300_000_000, 1_250_000_000,
  ])
  // Tahun pertama selalu nilai kendaraan (TSI di Interest Insured).
  assert.deepEqual(yearlySumInsured(1_000, 10, 2, [5_000]), [1_000, 900])

  // Mengisi lalu mengosongkan nilai kembali ke penyusutan.
  const set = withYearValue(undefined, 2, 1_300_000_000)
  assert.deepEqual(set, [null, null, 1_300_000_000])
  assert.equal(withYearValue(set, 2, null), undefined)
  assert.deepEqual(cleanYearValues([999, -1, "x", 10.005]), [null, null, null, 10.01])
})

test("premi slip dan rincian per tahun memakai nilai casco manual", () => {
  const manual = [null, 1_450_000_000, null, null]
  const slip = dirajaSlip(1)
  const edited = recalcSlip({
    ...slip,
    interestItems: slip.interestItems.map((it) => ({ ...it, yearValues: manual })),
  })
  const [vehicle] = multiYearSchedule(edited)
  assert.deepEqual(vehicle.years.map((y) => y.sumInsured), [
    1_555_000_000, 1_450_000_000, 1_305_000_000, 1_174_500_000,
  ])
  // Premi baris casco = jumlah casco semua tahun di rincian, sama dengan sebelumnya.
  const cascoRows = vehicle.years.flatMap((y) => y.rows.filter((r) => r.kind === "casco"))
  assert.equal(edited.rateLines[0].premium, Math.round(cascoRows.reduce((a, r) => a + r.premium, 0) * 100) / 100)
  assert.equal(total(edited), vehicle.total)
  assert.notEqual(total(edited), total(slip))
})
