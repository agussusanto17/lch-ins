import assert from "node:assert/strict"
import test from "node:test"

import { recalcSlip, totalPayable, totalPremium } from "../lib/calc"
import {
  addLocationPatch,
  emptySlip,
  itemRowsPatch,
  switchCob,
} from "../components/underwriting/slip-model"
import type { PlacingSlip } from "../lib/data/types"
import { itemGroups } from "../lib/slip-items"
import {
  AS_ATTACHED,
  extensionShort,
  printsUnitsAsAttached,
  sameOrAttached,
  vehicleDetail,
  vehicleSchedule,
} from "../lib/slip-schedule"

/** Dua truk CI LCH Truckindo (20.1.2025): total premi 25.680.000, Total Payable 23.157.000. */
function truckindoSlip(): PlacingSlip {
  let slip = switchCob(emptySlip(), "Motor Vehicle")
  const truck = (id: string, plate: string, chassis: string, engine: string) => ({
    id,
    description: "",
    amount: 450_000_000,
    vehicleBrandName: "Isuzu",
    vehicleTypeName: "Giga",
    vehicleModel: "GVR 34 H",
    year: 2018,
    licensePlate: plate,
    chassisNumber: chassis,
    engineNumber: engine,
    color: "Putih",
  })
  slip = recalcSlip({
    ...slip,
    discountPct: 10,
    adminCost: 35_000,
    stampDuty: 10_000,
    interestItems: [
      truck("v1", "BP 8274 DU", "MHCGVR34HJJ001293", "6HK1218142"),
      truck("v2", "BP 8257 DU", "MHCGVR34HJJ001294", "6HK1218141"),
    ],
  })
  const rates: Record<string, number> = {
    "Comprehensive Casco": 2.42,
    "Flood, Windstorm, Tempest & Water Damage": 0.075,
    "Earthquake, Volcanic Eruption & Tsunami": 0.12,
    "Strike, Riot, Civil Commotion": 0.05,
    "Terrorism & Sabotage": 0.05,
  }
  for (const id of ["v1", "v2"]) {
    const g = itemGroups(slip).find((x) => x.item.id === id)!
    slip = recalcSlip({
      ...slip,
      ...itemRowsPatch(slip, "rateLines", id, g.rateLines.map((l) => ({ ...l, rate: rates[l.label] ?? null }))),
    })
    slip = recalcSlip({
      ...slip,
      ...itemRowsPatch(slip, "tplLines", id, [
        { id: `${id}-tpl`, label: "Third Party Liability", basis: "50000000", rate: 1.125, premium: 0 },
      ]),
    })
    slip = recalcSlip({
      ...slip,
      ...itemRowsPatch(slip, "paLines", id, g.paLines.map((l) => ({ ...l, basis: "10000000", rate: /passenger/i.test(l.label) ? 0.1 : 0.5 }))),
    })
  }
  return slip
}

test("lampiran As Attached hanya untuk banyak kendaraan atau banyak lokasi", () => {
  const mv = truckindoSlip()
  assert.equal(printsUnitsAsAttached(mv), true)
  assert.equal(printsUnitsAsAttached({ ...mv, interestItems: mv.interestItems.slice(0, 1) }), false)

  const property = switchCob(emptySlip(), "Property")
  assert.equal(printsUnitsAsAttached(property), false)
  assert.equal(printsUnitsAsAttached({ ...property, ...addLocationPatch(property) }), true)

  // Liability dengan tiga objek tetap dicetak di badan dokumen: isinya daftar limit.
  const liability = switchCob(emptySlip(), "Liability")
  assert.equal(
    printsUnitsAsAttached({
      ...liability,
      interestItems: [
        { id: "a", description: "TPL any one occurrence", amount: 1 },
        { id: "b", description: "Product liability", amount: 1 },
        { id: "c", description: "Limit any one person", amount: 1 },
      ],
    }),
    false
  )
})

test("nilai yang sama dicetak sekali, nilai berbeda menjadi As Attached", () => {
  assert.equal(sameOrAttached(["Class I", "Class I"]), "Class I")
  assert.equal(sameOrAttached(["Class I", "Class II"]), AS_ATTACHED)
  assert.equal(sameOrAttached(["Class I", ""]), AS_ATTACHED)
  assert.equal(sameOrAttached(["", null, undefined]), "")
})

test("tabel DAFTAR UNIT KENDARAAN sama dengan CI Truckindo", () => {
  const slip = truckindoSlip()
  const { extensionLabels, rows } = vehicleSchedule(slip)
  assert.deepEqual(extensionLabels.map(extensionShort), ["FWTWD", "EQVET", "SRCC", "TS"])
  assert.equal(rows.length, 2)
  const [one] = rows
  assert.deepEqual(one.vehicle, {
    name: "Isuzu Giga GVR 34 H",
    year: "2018",
    plate: "BP 8274 DU",
    chassis: "MHCGVR34HJJ001293",
    engine: "6HK1218142",
    color: "Putih",
  })
  assert.equal(one.sumInsured, 450_000_000)
  assert.deepEqual(one.coverage, { label: "Comprehensive Casco", rate: 2.42, premium: 10_890_000 })
  assert.deepEqual(one.extensions["Flood, Windstorm, Tempest & Water Damage"], { rate: 0.075, premium: 337_500 })
  assert.equal(one.tplLimit, 50_000_000)
  assert.equal(one.tplPremium, 562_500)
  assert.equal(one.paDriverLimit, 10_000_000)
  assert.equal(one.paDriverPremium, 50_000)
  assert.equal(one.paPassengerLimit, 10_000_000)
  assert.equal(one.paPassengerPremium, 10_000)
  assert.equal(one.total, 12_840_000)
  assert.equal(rows[1].total, 12_840_000)
  assert.equal(totalPremium(slip), 25_680_000)
  assert.equal(totalPayable(slip), 23_157_000)
})

test("rincian kendaraan lama dibaca dari uraiannya", () => {
  const detail = vehicleDetail({
    id: "x",
    description: "Model: Avanza 1.5 G · Thn: 2022 · Plat: b 1234 cd · Rangka: MHK123 · Mesin: 1NR456 · Warna: Hitam",
    amount: 1,
    vehicleBrandName: "Toyota",
  })
  assert.equal(detail.name, "Toyota Avanza 1.5 G")
  assert.equal(detail.year, "2022")
  assert.equal(detail.plate, "B 1234 CD")
  assert.equal(detail.chassis, "MHK123")
  assert.equal(detail.engine, "1NR456")
  assert.equal(detail.color, "Hitam")
})
