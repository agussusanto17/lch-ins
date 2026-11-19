import assert from "node:assert/strict"
import test from "node:test"
import ExcelJS from "exceljs"

import { recalcSlip } from "../lib/calc"
import { findMotorExtensionBounds } from "../lib/data/ojk-motor"
import type { PlacingSlip, VehicleBrandOption } from "../lib/data/types"
import { itemGroups, itemOwner } from "../lib/slip-items"
import { vehicleSchedule } from "../lib/slip-schedule"
import {
  cascoSwitchPatch,
  hasMixedCasco,
  motorRateLinesWithBounds,
  TOTAL_LOSS_LINE,
  vehicleTariff,
  withTotalLossLines,
} from "../lib/slip-vehicles"
import {
  emptySlip,
  importVehiclesPatch,
  makeRateLines,
  rateLinesWithBounds,
  slipForForm,
  switchCob,
  vehicleIssues,
  vehicleRateLabels,
} from "../components/underwriting/slip-model"
import { fillVehicleTemplate, vehicleColumns, vehiclesFromRows } from "../lib/vehicle-import"

/** Dua kendaraan di Jakarta; kendaraan 1 Comprehensive, kendaraan 2 TLO. */
function fleet(): PlacingSlip {
  let slip = switchCob(emptySlip(), "Motor Vehicle")
  slip = recalcSlip({
    ...slip,
    typeOfCover: "Comprehensive Casco + Perluasan",
    riskLocation: "Jakarta Selatan",
    interestItems: [
      { id: "v1", description: "Toyota Avanza 1.5 G MPV", amount: 250_000_000, licensePlate: "B 1234 AB" },
      { id: "v2", description: "Toyota Avanza 1.3 E MPV", amount: 150_000_000, licensePlate: "B 5678 CD" },
    ],
  })
  const owner = itemOwner(slip)
  const rates: Record<string, Record<string, number>> = {
    v1: { "Comprehensive Casco": 2.5, "Flood, Windstorm, Tempest & Water Damage": 0.075 },
    v2: { "Total Loss Only": 0.5, "Flood, Windstorm, Tempest & Water Damage": 0.075 },
  }
  return recalcSlip({
    ...slip,
    rateLines: slip.rateLines.map((l) => ({
      ...l,
      rate: rates[owner(l.vehicleId) ?? ""]?.[l.label] ?? null,
    })),
  })
}

/** Slip sebelum 19 November 2026: kendaraannya belum punya baris Total Loss Only. */
const withoutTotalLoss = (slip: PlacingSlip) => ({
  ...slip,
  rateLines: slip.rateLines.filter((l) => l.label !== TOTAL_LOSS_LINE),
})

test("cover standar Motor Vehicle: Total Loss Only tepat setelah Comprehensive Casco", () => {
  assert.deepEqual(
    makeRateLines("Motor Vehicle").slice(0, 3).map((l) => l.label),
    ["Comprehensive Casco", "Total Loss Only", "Loading Rate Comprehensive"]
  )
  const [one, two] = itemGroups(fleet())
  assert.equal(one.rateLines[1].label, TOTAL_LOSS_LINE)
  assert.equal(two.rateLines[1].label, TOTAL_LOSS_LINE)
})

test("slip lama di form: tiap kendaraan mendapat baris TLO kosong, hasilnya tetap", () => {
  const old = withoutTotalLoss(fleet())
  const fixed = withTotalLossLines(old)
  for (const g of itemGroups(fixed)) {
    const labels = g.rateLines.map((l) => l.label)
    assert.equal(labels[1], TOTAL_LOSS_LINE)
    assert.equal(labels.filter((l) => l === TOTAL_LOSS_LINE).length, 1)
    assert.equal(g.rateLines[1].id, `${g.rateLines[0].id}-tlo`)
    assert.equal(g.rateLines[1].rate, null)
  }
  // Dipanggil ulang tidak berubah, jadi form tidak dianggap berubah saat dibuka.
  assert.equal(withTotalLossLines(fixed), fixed)
  assert.equal(JSON.stringify(slipForForm(old)), JSON.stringify(slipForForm(old)))
  // Slip Closed dan COB lain dibiarkan.
  assert.equal(slipForForm({ ...old, status: "Closed" }).rateLines.length, old.rateLines.length)
  const property = switchCob(emptySlip(), "Property")
  assert.equal(withTotalLossLines(property), property)
})

test("batas OJK: baris TLO memakai tarif casco TLO, perluasan kendaraan TLO memakai tarif TLO", () => {
  const slip = fleet()
  const lines = rateLinesWithBounds(slip)
  // Form dan release memakai fungsi yang sama.
  assert.deepEqual(lines, motorRateLinesWithBounds(slip))
  const owner = itemOwner(slip)
  const line = (vehicleId: string, label: string) =>
    lines.find((l) => owner(l.vehicleId) === vehicleId && l.label === label)!
  const [v1, v2] = slip.interestItems

  const comprehensive = vehicleTariff(slip, v1).casco!
  const tlo = vehicleTariff(slip, v2, TOTAL_LOSS_LINE).casco!
  assert.deepEqual([line("v1", "Comprehensive Casco").min, line("v1", "Comprehensive Casco").max], [comprehensive.min, comprehensive.max])
  assert.deepEqual([line("v2", TOTAL_LOSS_LINE).min, line("v2", TOTAL_LOSS_LINE).max], [tlo.min, tlo.max])
  assert.ok(tlo.max < comprehensive.min, "tarif TLO lebih rendah dari Comprehensive")

  const flood = "Flood, Windstorm, Tempest & Water Damage"
  const region = vehicleTariff(slip, v2).region
  const floodTlo = findMotorExtensionBounds(flood, TOTAL_LOSS_LINE, region)!
  const floodComp = findMotorExtensionBounds(flood, "Comprehensive", region)!
  assert.deepEqual([line("v2", flood).min, line("v2", flood).max], [floodTlo.min, floodTlo.max])
  assert.deepEqual([line("v1", flood).min, line("v1", flood).max], [floodComp.min, floodComp.max])
  // Rate TLO 0,5% di dalam batas TLO; kalau dicek dengan batas Comprehensive akan tertolak.
  assert.ok(0.5 >= tlo.min && 0.5 <= tlo.max)
})

test("kendaraan tersimpan pindah ke TLO: batas perluasan tersimpan dihitung ulang", () => {
  // Slip tersimpan: batas OJK ikut tersimpan di setiap baris.
  const fleetSlip = fleet()
  const saved = { ...fleetSlip, rateLines: rateLinesWithBounds(fleetSlip) }
  const owner = itemOwner(saved)
  const flood = "Flood, Windstorm, Tempest & Water Damage"
  const floodOf = (s: PlacingSlip, vehicleId: string) =>
    rateLinesWithBounds(s).find((l) => owner(l.vehicleId) === vehicleId && l.label === flood)!
  const before = floodOf(saved, "v1")

  // Rate kendaraan 1 tidak pindah cover: patch dikembalikan apa adanya.
  const sameCover = { rateLines: saved.rateLines.map((l) => (l.label === flood ? { ...l, rate: 0.08 } : l)) }
  assert.equal(cascoSwitchPatch(saved, sameCover), sameCover)

  // Kendaraan 1 pindah ke TLO: batas perluasannya dikosongkan lalu dihitung dengan tarif TLO.
  const rates = saved.rateLines.map((l) =>
    owner(l.vehicleId) !== "v1"
      ? l
      : l.label === "Comprehensive Casco"
        ? { ...l, rate: null }
        : l.label === TOTAL_LOSS_LINE
          ? { ...l, rate: 0.5 }
          : l
  )
  const next = { ...saved, ...cascoSwitchPatch(saved, { rateLines: rates }) }
  const after = floodOf(next, "v1")
  assert.notDeepEqual([after.min, after.max], [before.min, before.max])
  assert.match(after.boundSource ?? "", /Total Loss Only/)
  // Batas casco dan kendaraan lain tidak disentuh.
  const casco = next.rateLines.find((l) => owner(l.vehicleId) === "v1" && l.label === TOTAL_LOSS_LINE)!
  assert.notEqual(casco.min, null)
  assert.deepEqual(
    next.rateLines.filter((l) => owner(l.vehicleId) === "v2"),
    saved.rateLines.filter((l) => owner(l.vehicleId) === "v2")
  )
})

test("kendaraan tidak boleh berisi rate Comprehensive Casco dan TLO sekaligus", () => {
  const slip = fleet()
  assert.deepEqual(vehicleIssues(slip), [])
  const owner = itemOwner(slip)
  const both = recalcSlip({
    ...slip,
    rateLines: slip.rateLines.map((l) =>
      owner(l.vehicleId) === "v2" && l.label === "Comprehensive Casco" ? { ...l, rate: 2 } : l
    ),
  })
  assert.equal(hasMixedCasco(itemGroups(both)[1].rateLines), true)
  assert.deepEqual(vehicleIssues(both), [
    "Isi salah satu rate casco kendaraan 2: Comprehensive Casco atau Total Loss Only.",
  ])
  // Slip satu kendaraan juga dicek, tanpa nomor kendaraan.
  const single = recalcSlip({
    ...both,
    interestItems: both.interestItems.slice(1),
  })
  assert.deepEqual(vehicleIssues(single), [
    "Isi salah satu rate casco: Comprehensive Casco atau Total Loss Only.",
  ])
})

test("cetak DAFTAR UNIT KENDARAAN: cover utama kendaraan TLO tertulis Total Loss Only", () => {
  const { rows } = vehicleSchedule(fleet())
  assert.deepEqual(
    rows.map((r) => [r.coverage?.label, r.coverage?.rate]),
    [
      ["Comprehensive Casco", 2.5],
      ["Total Loss Only", 0.5],
    ]
  )
})

const BRANDS: VehicleBrandOption[] = [
  { id: "b-toyota", name: "Toyota", isActive: true, types: [{ id: "t-avanza", name: "Avanza", isActive: true }] },
]

test("upload: kolom Rate Total Loss Only juga untuk slip lama, dan baris yang mengisi keduanya gagal", async () => {
  const old = withoutTotalLoss(fleet())
  const labels = vehicleRateLabels(old)
  assert.deepEqual(labels.slice(0, 3), ["Comprehensive Casco", "Total Loss Only", "Loading Rate Comprehensive"])
  const columns = vehicleColumns(labels)
  const titles = columns.map((c) => (c.required ? `${c.title}*` : c.title))
  const at = titles.indexOf("Rate Comprehensive Casco (%)")
  assert.equal(titles[at + 1], "Rate Total Loss Only (%)")

  const row = (chassis: string, rates: Record<string, number>) =>
    columns.map((c) =>
      ({
        Merek: "Toyota",
        Tipe: "Avanza",
        "No. Rangka": chassis,
        "Sum Insured": 150_000_000,
        ...rates,
      })[c.title] ?? null
    )
  const result = vehiclesFromRows(
    [
      ["Data Kendaraan"],
      titles,
      row("TLO1", { "Rate Total Loss Only (%)": 0.5 }),
      row("BOTH1", { "Rate Comprehensive Casco (%)": 2.5, "Rate Total Loss Only (%)": 0.5 }),
    ],
    { rateLabels: labels, brands: BRANDS, existingChassis: new Set() }
  )
  assert.deepEqual(result.errors, [
    "Baris 4: Rate Comprehensive Casco dan Rate Total Loss Only terisi bersamaan. Isi salah satu saja.",
  ])
  assert.deepEqual(result.vehicles.map((v) => [v.chassis, v.rates]), [["TLO1", { "Total Loss Only": 0.5 }]])

  // Kendaraan TLO masuk ke slip lama dengan rate di baris Total Loss Only.
  const next = recalcSlip({
    ...old,
    ...importVehiclesPatch(old, result.vehicles, { replace: false, fileDeductibles: false }),
  })
  const added = itemGroups(next)[2]
  const tloLine = added.rateLines.find((l) => l.label === TOTAL_LOSS_LINE)!
  assert.equal(tloLine.rate, 0.5)
  assert.equal(tloLine.premium, 750_000)

  // Template menjelaskan pilihan casco di judul kolom dan sheet Petunjuk.
  const wb = new ExcelJS.Workbook()
  fillVehicleTemplate(wb, { insuredName: "", currency: "IDR", rateLabels: labels, brands: BRANDS })
  const ws = wb.getWorksheet("Kendaraan")!
  assert.equal(ws.getCell(2, at + 2).value, "Rate Total Loss Only (%)")
  assert.match(String(ws.getCell(2, at + 2).note), /kendaraan TLO/)
  const help = wb.getWorksheet("Petunjuk")!
  const texts: string[] = []
  help.eachRow((r) => texts.push(String(r.getCell(1).value ?? "")))
  assert.ok(texts.some((t) => t.includes("Casco diisi salah satu")))
})
