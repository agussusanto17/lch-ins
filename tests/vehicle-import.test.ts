import assert from "node:assert/strict"
import test from "node:test"
import ExcelJS from "exceljs"

import { recalcSlip } from "../lib/calc"
import { MOTOR_RATE_LINES } from "../lib/data/reference"
import type { VehicleBrandOption } from "../lib/data/types"
import { itemGroups } from "../lib/slip-items"
import {
  emptySlip,
  importReplacesVehicles,
  importVehiclesPatch,
  switchCob,
  vehicleRateLabels,
} from "../components/underwriting/slip-model"
import {
  fillVehicleTemplate,
  vehicleColumns,
  vehiclesFromRows,
  type VehicleImportContext,
} from "../lib/vehicle-import"

const BRANDS: VehicleBrandOption[] = [
  {
    id: "b-toyota",
    name: "Toyota",
    isActive: true,
    types: [
      { id: "t-avanza", name: "Avanza", isActive: true },
      { id: "t-old", name: "Kijang", isActive: false },
    ],
  },
  { id: "b-hino", name: "Hino", isActive: true, types: [{ id: "t-dutro", name: "Dutro", isActive: true }] },
]

const LABELS = [...MOTOR_RATE_LINES]
const COLUMNS = vehicleColumns(LABELS)
const ctx = (existing: string[] = []): VehicleImportContext => ({
  rateLabels: LABELS,
  brands: BRANDS,
  existingChassis: new Set(existing),
})

/** Baris file seperti sheet Kendaraan: baris kelompok, judul, lalu data per judul kolom. */
function sheet(rows: Array<Record<string, unknown>>) {
  const titles = COLUMNS.map((c) => (c.required ? `${c.title}*` : c.title))
  return [
    ["Data Kendaraan"],
    titles,
    ...rows.map((r) => COLUMNS.map((c) => r[c.title] ?? null)),
  ]
}

const AVANZA = {
  Merek: "toyota",
  Tipe: "AVANZA",
  "Model / Seri": "1.5 G AT",
  Tahun: 2022,
  Warna: "Hitam",
  "No. Polisi": "b 1234 xyz",
  "No. Rangka": "mhka1234",
  "No. Mesin": "1nr5678",
  "Sum Insured": 250_000_000,
  "Rate Comprehensive Casco (%)": 2.5,
  "Rate Flood, Windstorm, Tempest & Water Damage (%)": "0,075",
  "TPL 1 Limit": 25_000_000,
  "TPL 1 Rate (%)": 1,
  "PA Driver Limit": 10_000_000,
  "PA Driver Rate (%)": 0.5,
}

test("template: kolom rate dan deductible mengikuti cover slip, dibaca ulang tanpa isian", async () => {
  const wb = new ExcelJS.Workbook()
  fillVehicleTemplate(wb, { insuredName: "PT A", currency: "IDR", rateLabels: LABELS, brands: BRANDS })
  const read = new ExcelJS.Workbook()
  await read.xlsx.load(await wb.xlsx.writeBuffer())
  assert.deepEqual(
    read.worksheets.map((w) => w.name),
    ["Kendaraan", "Petunjuk", "Merek & Tipe"]
  )
  const ws = read.getWorksheet("Kendaraan")!
  assert.equal(ws.getCell("B2").value, "Merek*")
  assert.equal(ws.getCell(2, COLUMNS.length).value, "Cek Premi (otomatis)")
  // Merek dari Master Data; tipe nonaktif tidak ditawarkan.
  const list = read.getWorksheet("Merek & Tipe")!
  assert.deepEqual(
    [list.getCell("A2").value, list.getCell("B2").value, list.getCell("D2").value, list.getCell("D3").value],
    ["Hino", "Dutro", "Hino", "Toyota"]
  )
  assert.equal(list.getCell("B4").value, null)
  // Template kosong (baris berisi rumus Cek Premi saja) tidak menghasilkan kendaraan.
  const rows: unknown[][] = []
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    rows[n - 1] = (row.values as unknown[]).slice(1)
  })
  const result = vehiclesFromRows(Array.from(rows, (r) => r ?? []), ctx())
  assert.equal(result.read, 0)
  assert.deepEqual(result.fileErrors, ["Tidak ada kendaraan di file."])
})

test("baris benar: merek dan tipe dicocokkan tanpa beda huruf, rate persen, TPL dan PA", () => {
  const result = vehiclesFromRows(
    sheet([{ ...AVANZA, "Deductible Comprehensive Casco": "Own risk IDR 300.000\nper kejadian" }]),
    ctx()
  )
  assert.deepEqual(result.errors, [])
  const [v] = result.vehicles
  assert.deepEqual(
    [v.row, v.brandId, v.typeId, v.year, v.plate, v.chassis, v.engine, v.sumInsured],
    [3, "b-toyota", "t-avanza", "2022", "B 1234 XYZ", "MHKA1234", "1NR5678", 250_000_000]
  )
  assert.deepEqual(v.rates, {
    "Comprehensive Casco": 2.5,
    "Flood, Windstorm, Tempest & Water Damage": 0.075,
  })
  assert.deepEqual(v.limits, {
    tpl1: { limit: 25_000_000, rate: 1 },
    paDriver: { limit: 10_000_000, rate: 0.5 },
  })
  assert.deepEqual(v.deductibles, { "Comprehensive Casco": ["Own risk IDR 300.000", "per kejadian"] })
  assert.equal(result.hasDeductibles, true)
})

test("baris salah tidak ikut ditambahkan; pesan memakai nomor baris Excel", () => {
  const result = vehiclesFromRows(
    sheet([
      { ...AVANZA, Merek: "Suzuki" },
      { ...AVANZA, Tipe: "Dutro", "No. Rangka": "X2" },
      { ...AVANZA, Tipe: "Kijang", "No. Rangka": "X3" },
      { ...AVANZA, "No. Rangka": "", "Sum Insured": 0 },
      { ...AVANZA, "No. Rangka": "X5", "Rate Comprehensive Casco (%)": 150, "TPL 2 Rate (%)": 0.5 },
      { ...AVANZA, "No. Rangka": "X6", Tahun: "22" },
    ]),
    ctx()
  )
  assert.equal(result.vehicles.length, 0)
  assert.equal(result.failed, 6)
  assert.deepEqual(result.errors, [
    'Baris 3: Merek "Suzuki" tidak ada di Master Data (sheet Merek & Tipe). Tambahkan dulu di Master Data.',
    'Baris 4: Tipe "Dutro" tidak ada di bawah merek Toyota di Master Data.',
    'Baris 5: Tipe "Kijang" nonaktif di Master Data.',
    "Baris 6: No. Rangka kosong.",
    'Baris 6: Sum Insured "0" harus angka lebih dari 0, tanpa mata uang.',
    'Baris 7: Rate Comprehensive Casco "150" harus angka persen antara 0 dan 100, misalnya 1,5.',
    "Baris 7: TPL 2 Rate diisi, tetapi TPL 2 Limit kosong.",
    'Baris 8: Tahun "22" harus tahun 4 angka, misalnya 2022.',
  ])
})

test("nomor rangka: yang sudah ada di slip dilewati, kembar di file gagal", () => {
  const result = vehiclesFromRows(
    sheet([
      { ...AVANZA, "No. Rangka": "MHK-A 1234" },
      { ...AVANZA, "No. Rangka": "NEW1" },
      { ...AVANZA, "No. Rangka": "new1" },
      { ...AVANZA, "No. Rangka": "NEW2", "Rate Comprehensive Casco (%)": null, "Rate Flood, Windstorm, Tempest & Water Damage (%)": null },
    ]),
    ctx(["MHKA1234"])
  )
  assert.deepEqual(result.skipped, [{ row: 3, chassis: "MHK-A 1234" }])
  assert.deepEqual(result.errors, ["Baris 5: No. Rangka sama dengan baris 4."])
  assert.deepEqual(result.vehicles.map((v) => v.chassis), ["NEW1", "NEW2"])
  assert.equal(result.noRateRows, 1)
})

test("kolom rate yang bukan cover slip dicatat, bukan diam-diam dibuang", () => {
  const rows = sheet([AVANZA])
  rows[1] = [...rows[1], "Rate Total Loss Only (%)"]
  const result = vehiclesFromRows(rows, ctx())
  assert.deepEqual(result.ignoredColumns, ["rate total loss only (%)"])
})

test("kendaraan masuk ke slip: cover kendaraan pertama, premi seperti form, deductible disalin", () => {
  const base = recalcSlip(switchCob(emptySlip(), "Motor Vehicle"))
  // Slip baru berisi satu kendaraan kosong: upload menggantikannya.
  assert.equal(importReplacesVehicles(base, false), true)
  const rows = vehiclesFromRows(sheet([AVANZA]), ctx()).vehicles
  const first = recalcSlip({ ...base, ...importVehiclesPatch(base, rows, { replace: false, fileDeductibles: false }) })
  assert.equal(first.interestItems.length, 1)
  const [g] = itemGroups(first)
  assert.equal(g.item.vehicleBrandName, "Toyota")
  assert.equal(g.item.licensePlate, "B 1234 XYZ")
  assert.deepEqual(g.rateLines.map((l) => l.label), vehicleRateLabels(base))
  // 250 jt × 2,5% + 250 jt × 0,075% + TPL 25 jt × 1% + PA 10 jt × 0,5%.
  const premium = [...g.rateLines, ...g.tplLines, ...g.paLines].reduce((a, l) => a + l.premium, 0)
  assert.equal(premium, 6_250_000 + 187_500 + 250_000 + 50_000)

  // Kendaraan berikutnya ditambahkan di akhir dan memakai deductible kendaraan pertama.
  const withDeductible = {
    ...first,
    rateLines: first.rateLines.map((l, i) => (i === 0 ? { ...l, deductibles: ["Own risk IDR 300.000"] } : l)),
  }
  const more = vehiclesFromRows(sheet([{ ...AVANZA, "No. Rangka": "B2" }]), ctx(["MHKA1234"])).vehicles
  const next = recalcSlip({
    ...withDeductible,
    ...importVehiclesPatch(withDeductible, more, { replace: false, fileDeductibles: false }),
  })
  const groups = itemGroups(next)
  assert.equal(groups.length, 2)
  assert.deepEqual(groups[1].rateLines[0].deductibles, ["Own risk IDR 300.000"])
  assert.equal(groups[1].tplLines.length, 2)
  assert.equal(groups[1].paLines.map((l) => l.label).join(","), "Driver,Passenger")
})
