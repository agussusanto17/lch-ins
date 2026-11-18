import assert from "node:assert/strict"
import test from "node:test"

import { recalcSlip } from "../lib/calc"
import {
  emptySlip,
  isOutOfBounds,
  rateLinesWithBounds,
  releaseIssues,
  switchCob,
  vehicleBoundsPatch,
} from "../components/underwriting/slip-model"
import { buildVehicleDescription } from "../lib/data/ojk-motor"
import type { LineItem, PlacingSlip, RateLine } from "../lib/data/types"

// Batas casco OJK Comprehensive: Kategori 2 (TSI 125–200 juta) Wilayah 2 2,47–2,72 dan Wilayah 1
// 2,67–2,94; Kategori 3 (200–400 juta) Wilayah 2 2,08–2,29; Kategori 6 (truk) Wilayah 2 2,39–2,63.
// Banjir Comprehensive Wilayah 2 0,1–0,125, Wilayah 1 0,075–0,1. SRCC 0,05 di semua wilayah.
const CASCO = "Comprehensive Casco"
const FLOOD = "Flood, Windstorm, Tempest & Water Damage"
const SRCC = "Strike, Riot, Civil Commotion"
const COMPREHENSIVE = "Comprehensive Casco + Perluasan"

// Pilihan panel Referensi Tarif OJK (MotorPanel): kendaraan sebenarnya truk boks, Kategori 6.
const TRUCK_PICK = {
  min: 2.39,
  max: 2.63,
  boundSource: "Comprehensive Kategori 6, Wilayah 2: DKI Jakarta, Jawa Barat, Banten",
}

/** Kendaraan dari Interest Insured: uraian disusun ulang dari isian terstruktur (LineItemList). */
function vehicle(item: LineItem): LineItem {
  return { ...item, description: buildVehicleDescription({ ...item, description: undefined }) }
}

const avanza = (id: string, patch: Partial<LineItem> = {}) =>
  vehicle({
    id,
    description: "",
    amount: 150_000_000,
    vehicleBrandName: "Toyota",
    vehicleTypeName: "Avanza",
    vehicleModel: "1.3 G",
    year: 2022,
    licensePlate: "B 1234 KJT",
    ...patch,
  })

/** `set` di form slip: setiap perubahan isian lewat vehicleBoundsPatch lalu dihitung ulang. */
const set = (slip: PlacingSlip, patch: Partial<PlacingSlip>) =>
  recalcSlip({ ...slip, ...vehicleBoundsPatch(slip, patch) })

/** Ubah satu kendaraan di Interest Insured. */
const editVehicle = (slip: PlacingSlip, id: string, patch: Partial<LineItem>) =>
  set(slip, {
    interestItems: slip.interestItems.map((v) => (v.id === id ? vehicle({ ...v, ...patch }) : v)),
  })

/** Isi rate di tabel rate kendaraan. */
const withRates = (slip: PlacingSlip, id: string, rates: Record<string, number>) =>
  set(slip, {
    rateLines: slip.rateLines.map((l) =>
      l.vehicleId === id && rates[l.label] != null ? { ...l, rate: rates[l.label] } : l
    ),
  })

/** Rate dari panel Referensi Tarif OJK (applyOjkRate): rate dan batasnya tersimpan. */
const pick = (
  slip: PlacingSlip,
  id: string,
  label: string,
  rate: number,
  bounds: Pick<RateLine, "min" | "max" | "boundSource">
) =>
  recalcSlip({
    ...slip,
    rateLines: slip.rateLines.map((l) =>
      l.vehicleId === id && l.label === label ? { ...l, rate, ...bounds } : l
    ),
  })

/** Simpan lalu muat ulang: form mengirim rateLinesWithBounds dan server menyimpan batasnya. */
const saved = (slip: PlacingSlip): PlacingSlip => ({
  ...slip,
  rateLines: rateLinesWithBounds(slip),
})

/** Baris rate di state form, termasuk batas tersimpan. */
const stored = (slip: PlacingSlip, label: string, id = "v1") =>
  slip.rateLines.find((l) => l.vehicleId === id && l.label === label)!

/** Baris rate yang dipakai tabel rate dan releaseIssues. */
const bounded = (slip: PlacingSlip, label: string, id = "v1") => {
  const lineId = stored(slip, label, id).id
  return rateLinesWithBounds(slip).find((l) => l.id === lineId)!
}

const bounds = (l: RateLine) => [l.min ?? null, l.max ?? null, l.boundSource ?? null]

const outOfBoundsIssue = (name: string) =>
  `Rate ${name} di luar batas OJK dan belum ada alasannya.`

/** Slip Motor tanpa domisili, kendaraan dengan plat B dan TSI 150 juta, rate terisi. Sudah disimpan. */
function plateB(ids = ["v1"]): PlacingSlip {
  let slip = switchCob(emptySlip(), "Motor Vehicle")
  slip = set(slip, {
    typeOfCover: COMPREHENSIVE,
    interestItems: ids.map((id) => avanza(id)),
  })
  for (const id of ids) {
    slip = withRates(slip, id, { [CASCO]: 2.5, [FLOOD]: 0.11, [SRCC]: 0.05 })
  }
  return saved(slip)
}

test("reproduksi: plat B diganti BK, batas casco ikut Wilayah 1 dan rate butuh alasan", () => {
  let slip = plateB()
  assert.deepEqual(bounds(stored(slip, CASCO)), [2.47, 2.72, "Kategori 2 Wilayah 2 Comprehensive"])
  assert.equal(isOutOfBounds(bounded(slip, CASCO)), false)

  slip = editVehicle(slip, "v1", { licensePlate: "BK 1234 KJT" })

  const casco = bounded(slip, CASCO)
  assert.deepEqual(bounds(casco), [2.67, 2.94, "Kategori 2 Wilayah 1 Comprehensive"])
  assert.equal(isOutOfBounds(casco), true)
  assert.ok(releaseIssues(slip).includes(outOfBoundsIssue(CASCO)))
  // Disimpan lagi: batas dan asalnya yang baru ikut tersimpan.
  assert.deepEqual(bounds(stored(saved(slip), CASCO)), [
    2.67,
    2.94,
    "Kategori 2 Wilayah 1 Comprehensive",
  ])
})

test("plat diganti: perluasan yang bergantung wilayah dihitung ulang, SRCC tetap", () => {
  let slip = plateB()
  assert.deepEqual(bounds(stored(slip, FLOOD)), [
    0.1,
    0.125,
    "Perluasan Banjir KBM Comprehensive Wilayah 2",
  ])
  slip = editVehicle(slip, "v1", { licensePlate: "BK 1234 KJT" })

  const flood = bounded(slip, FLOOD)
  assert.deepEqual(bounds(flood), [0.075, 0.1, "Perluasan Banjir KBM Comprehensive Wilayah 1"])
  assert.equal(isOutOfBounds(flood), true)
  assert.ok(releaseIssues(slip).includes(outOfBoundsIssue(FLOOD)))
  // Batas SRCC sama di semua wilayah, jadi batas tersimpannya tidak dikosongkan.
  assert.deepEqual(bounds(stored(slip, SRCC)), [0.05, 0.05, "Perluasan SRCC KBM Comprehensive"])
})

test("TSI pindah kategori: batas casco dihitung ulang", () => {
  let slip = plateB()
  slip = editVehicle(slip, "v1", { amount: 300_000_000 })
  const casco = bounded(slip, CASCO)
  assert.deepEqual(bounds(casco), [2.08, 2.29, "Kategori 3 Wilayah 2 Comprehensive"])
  assert.equal(isOutOfBounds(casco), true)
  // Banjir tidak bergantung TSI.
  assert.deepEqual(bounds(stored(slip, FLOOD)), [
    0.1,
    0.125,
    "Perluasan Banjir KBM Comprehensive Wilayah 2",
  ])
})

test("merek dan tipe diganti truk boks: kategori casco ikut", () => {
  let slip = plateB()
  slip = editVehicle(slip, "v1", { vehicleBrandName: "Hino", vehicleTypeName: "Dutro 130 HD Box" })
  assert.deepEqual(bounds(bounded(slip, CASCO)), [2.39, 2.63, "Kategori 6 Wilayah 2 Comprehensive"])
})

test("pilihan panel OJK tetap tersimpan sampai kategori atau wilayah kendaraan berubah", () => {
  let slip = saved(pick(plateB(), "v1", CASCO, 2.4, TRUCK_PICK))
  const panel = [TRUCK_PICK.min, TRUCK_PICK.max, TRUCK_PICK.boundSource]
  assert.deepEqual(bounds(stored(slip, CASCO)), panel)

  // Nomor rangka, mesin, dan warna mengubah uraian kendaraan, bukan kategori atau wilayahnya.
  slip = editVehicle(slip, "v1", {
    chassisNumber: "MHKA1BA1JKK123456",
    engineNumber: "1NRX123456",
    color: "Hitam",
  })
  assert.deepEqual(bounds(stored(slip, CASCO)), panel)
  // TSI masih Kategori 2 dan plat D masih Wilayah 2.
  slip = editVehicle(slip, "v1", { amount: 175_000_000 })
  slip = editVehicle(slip, "v1", { licensePlate: "D 1234 KJT" })
  assert.deepEqual(bounds(stored(slip, CASCO)), panel)
  assert.equal(isOutOfBounds(bounded(slip, CASCO)), false)

  // TSI pindah Kategori 3: pilihan panel dibuang, batas dihitung ulang.
  slip = editVehicle(slip, "v1", { amount: 300_000_000 })
  assert.deepEqual(bounds(bounded(slip, CASCO)), [2.08, 2.29, "Kategori 3 Wilayah 2 Comprehensive"])
  assert.equal(isOutOfBounds(bounded(slip, CASCO)), true)
})

test("domisili diisi: batas semua kendaraan dihitung ulang", () => {
  let slip = plateB(["v1", "v2"])
  slip = set(slip, { riskLocation: "Jl. Gatot Subroto No. 10, Medan" })
  for (const id of ["v1", "v2"]) {
    assert.deepEqual(bounds(bounded(slip, CASCO, id)), [
      2.67,
      2.94,
      "Kategori 2 Wilayah 1 Comprehensive",
    ])
  }
  // Domisili mengalahkan plat: plat diganti tidak mengubah wilayah, batas tetap tersimpan.
  slip = saved(slip)
  const patch = vehicleBoundsPatch(slip, {
    interestItems: slip.interestItems.map((v) => vehicle({ ...v, licensePlate: "D 1234 KJT" })),
  })
  assert.equal(patch.rateLines, undefined)
})

test("type of cover diganti TLO: batas casco dan perluasan dihitung ulang", () => {
  let slip = plateB()
  slip = set(slip, { typeOfCover: "Total Loss Only (TLO)" })
  assert.deepEqual(bounds(bounded(slip, CASCO)), [0.44, 0.53, "Kategori 2 Wilayah 2 Total Loss Only"])
  assert.deepEqual(bounds(bounded(slip, FLOOD)), [
    0.075,
    0.1,
    "Perluasan Banjir KBM Total Loss Only Wilayah 2",
  ])
  assert.deepEqual(bounds(bounded(slip, SRCC)), [0.035, 0.035, "Perluasan SRCC KBM Total Loss Only"])
})

test("coverage hanya mengubah batas bila type of cover kosong", () => {
  const slip = plateB()
  assert.equal(vehicleBoundsPatch(slip, { coverage: "Total Loss Only" }).rateLines, undefined)

  let noCover = saved(set(slip, { typeOfCover: "" }))
  noCover = set(noCover, { coverage: "Total Loss Only" })
  assert.deepEqual(bounds(bounded(noCover, CASCO)), [
    0.44,
    0.53,
    "Kategori 2 Wilayah 2 Total Loss Only",
  ])
})

test("multi kendaraan: hanya baris kendaraan yang diganti yang dihitung ulang", () => {
  let slip = plateB(["v1", "v2"])
  slip = editVehicle(slip, "v2", { licensePlate: "BK 5678 KJT" })
  assert.deepEqual(bounds(bounded(slip, CASCO, "v2")), [
    2.67,
    2.94,
    "Kategori 2 Wilayah 1 Comprehensive",
  ])
  assert.ok(releaseIssues(slip).includes(outOfBoundsIssue(`${CASCO} kendaraan 2`)))
  assert.deepEqual(bounds(stored(slip, CASCO, "v1")), [
    2.47,
    2.72,
    "Kategori 2 Wilayah 2 Comprehensive",
  ])
  assert.ok(!releaseIssues(slip).includes(outOfBoundsIssue(`${CASCO} kendaraan 1`)))
})

test("alasan rate, TPL, dan PA dibiarkan saat batas dikosongkan", () => {
  let slip = plateB()
  const casco = stored(slip, CASCO)
  const exception = { reason: "Perluasan jaminan" as const, note: "Perluasan banjir" }
  // Batas TPL dari data lama: TPL dan PA hanya memakai batas dari labelnya.
  slip = {
    ...slip,
    rateExceptions: { [casco.id]: exception },
    tplLines: slip.tplLines.map((l, i) =>
      i === 0 ? { ...l, rate: 1, min: 0.25, max: 1, boundSource: "TJH Pihak Ketiga OJK" } : l
    ),
  }
  const patch = vehicleBoundsPatch(slip, {
    interestItems: slip.interestItems.map((v) => vehicle({ ...v, licensePlate: "BK 1234 KJT" })),
  })
  assert.ok(patch.rateLines)
  assert.equal(patch.rateExceptions, undefined)
  assert.equal(patch.tplLines, undefined)
  assert.equal(patch.paLines, undefined)
  const next = recalcSlip({ ...slip, ...patch })
  assert.deepEqual(next.rateExceptions, { [casco.id]: exception })
  assert.deepEqual(bounds(next.tplLines[0]), [0.25, 1, "TJH Pihak Ketiga OJK"])
})

test("isian yang sama dan COB lain tidak mengubah batas", () => {
  const slip = plateB()
  for (const patch of [
    { interestItems: slip.interestItems.map((v) => vehicle({ ...v })) },
    { riskLocation: "", typeOfCover: COMPREHENSIVE },
    { rateLines: slip.rateLines.map((l) => (l.label === CASCO ? { ...l, rate: 2.6 } : l)) },
  ]) {
    const next = vehicleBoundsPatch(slip, patch)
    assert.equal(next, patch)
  }
  const property = switchCob(emptySlip(), "Property")
  const patch = { riskLocation: "Medan" }
  assert.equal(vehicleBoundsPatch(property, patch), patch)
})

test("slip lama tanpa kendaraan: baris yang ikut kendaraan pertama dihitung ulang", () => {
  // Data lama: baris rate tanpa kendaraan, batasnya dari domisili dan TSI slip (0).
  const base = switchCob(emptySlip(), "Motor Vehicle")
  let slip: PlacingSlip = {
    ...base,
    typeOfCover: COMPREHENSIVE,
    riskLocation: "Jakarta Selatan",
    interestItems: [],
    rateLines: base.rateLines.map((l) => ({
      ...l,
      vehicleId: undefined,
      rate: l.label === CASCO ? 2.5 : null,
    })),
  }
  slip = saved(recalcSlip(slip))
  assert.deepEqual(bounds(slip.rateLines[0]), [3.26, 3.59, "Kategori 1 Wilayah 2 Comprehensive"])

  slip = set(slip, { interestItems: [avanza("v1")] })
  const casco = bounded(slip, CASCO)
  assert.equal(casco.rate, 2.5)
  assert.deepEqual(bounds(casco), [2.47, 2.72, "Kategori 2 Wilayah 2 Comprehensive"])
})
