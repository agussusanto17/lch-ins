import assert from "node:assert/strict"
import test from "node:test"
import ExcelJS from "exceljs"

import {
  emptySlip,
  importObjectsPatch,
  importReplacesObjects,
  objectRateLabels,
  recalc,
  switchCob,
} from "../components/underwriting/slip-model"
import type { PlacingSlip } from "../lib/data/types"
import {
  existingSerialKeys,
  fillObjectTemplate,
  objectDescription,
  objectsFromRows,
  percentCellValue,
  supportsObjectUpload,
} from "../lib/object-import"
import { GENERIC_RATE_LABEL, itemGroups } from "../lib/slip-items"

const ctx = (existing: string[] = []) => ({
  rateLabels: [GENERIC_RATE_LABEL],
  existingSerials: new Set(existing),
})

/** Bentuk GI Schedule PT Habco Primatama: judul di baris 3, rate sel persen, baris total. */
const GI_SCHEDULE: unknown[][] = [
  ["PT HABCO PRIMATAMA / PT MULTI GUNA MARITIM"],
  [],
  ["NO", "BRAND", "TYPE", "SERIAL NO.", "YEAR (M)", null, "SUM INSURED", "RATE", "ANNUAL PREMIUM", null, "ASSURED"],
  [null, null, null, null, null, null, null, null, null, null, null],
  [1, "KOMATSU", "WHEEL LOADER WA 200", 30926, 1998, null, 300000000, percentCellValue(0.011, "0.00%"), { formula: "H5*G5", result: 3300000 }, null, "PT MITRA SEJAHTERA RAYA"],
  [2, "CATERPILLAR", "BULLDOZER D5K2 LGP", "CAT00D5KPYT302155", 2016, null, 750000000, percentCellValue(0.0063, "0.00%"), { formula: "H6*G6", result: 4725000 }],
  [3, "KOMATSU ", "BULLDOZER D31P-20", 45946, "1996, \nRECON 2018", null, 500000000, percentCellValue(0.011, "0.00%")],
  [null, null, null, null, null, null, 1550000000, null, { formula: "SUM(I5:I7)", result: 13525000 }],
]

test("upload objek hanya untuk Engineering", () => {
  assert.equal(supportsObjectUpload("Engineering"), true)
  assert.equal(supportsObjectUpload("Liability"), false)
  assert.equal(supportsObjectUpload("Motor Vehicle"), false)
})

test("sel persen Excel dibaca sebagai persen, bukan pecahan", () => {
  assert.equal(percentCellValue(0.011, "0.00%"), "1.1%")
  assert.equal(percentCellValue(0.0063, "0.00%"), "0.63%")
  assert.equal(percentCellValue(1.1, "0.0000"), 1.1)
  assert.equal(percentCellValue("1,1", "@"), "1,1")
})

test("jadwal unit LCH bisa langsung diupload: kolom, tahun, rate persen, baris total", () => {
  const r = objectsFromRows(GI_SCHEDULE, ctx())
  assert.deepEqual(r.errors, [])
  assert.equal(r.objects.length, 3)
  assert.deepEqual(r.skipped, [{ row: 8, reason: "total" }])
  assert.equal(r.read, 4)
  assert.deepEqual(
    r.objects.map((o) => [o.row, o.description, o.sumInsured, o.rates[GENERIC_RATE_LABEL]]),
    [
      [5, "KOMATSU WHEEL LOADER WA 200, S/N 30926, Year 1998", 300000000, 1.1],
      [6, "CATERPILLAR BULLDOZER D5K2 LGP, S/N CAT00D5KPYT302155, Year 2016", 750000000, 0.63],
      [7, "KOMATSU BULLDOZER D31P-20, S/N 45946, Year 1996, RECON 2018", 500000000, 1.1],
    ]
  )
  assert.equal(r.lowRateRows, 0)
})

test("baris gagal dilaporkan per baris, objek lain tetap masuk", () => {
  const rows: unknown[][] = [
    ["Merek", "Tipe / Model", "No. Seri", "Tahun", "Uraian Lain", "Nilai Pertanggungan*", "Rate (%)"],
    ["Komatsu", "PC200", "A1", 2020, null, 1000000, 1],
    ["Komatsu", "PC200", "A-1", 2020, null, 1000000, 1],
    [null, null, null, null, null, 5000, 1],
    ["Hitachi", "ZX200", "B1", "20", null, "satu juta", "150"],
    [null, null, null, null, "Genset 500 kVA", 2000000, 0.011],
    ["Volvo", "EC210", "C1", null, null, 3000000, null],
  ]
  const r = objectsFromRows(rows, ctx())
  assert.equal(r.objects.length, 3)
  assert.equal(r.failed, 3)
  assert.match(r.errors.join("\n"), /Baris 3: No\. Seri sama dengan baris 2/)
  assert.match(r.errors.join("\n"), /Baris 4: Merek, Tipe \/ Model, dan Uraian Lain kosong/)
  assert.match(r.errors.join("\n"), /Baris 5: Nilai Pertanggungan "satu juta"/)
  assert.match(r.errors.join("\n"), /Baris 5: Tahun "20"/)
  assert.match(r.errors.join("\n"), /Baris 5: Rate "150"/)
  // 0,011 tanpa format persen: kemungkinan pecahan, jadi diberi peringatan.
  assert.equal(r.lowRateRows, 1)
  assert.equal(r.noRateRows, 1)
  assert.equal(r.objects[1].description, "Genset 500 kVA")
})

test("objek yang nomor serinya sudah ada dilewati, jadi file bisa diupload ulang", () => {
  const existing = existingSerialKeys([
    { description: "KOMATSU WHEEL LOADER WA 200, S/N 30926, Year 1998" },
  ])
  assert.deepEqual([...existing], ["30926"])
  const r = objectsFromRows(GI_SCHEDULE, ctx([...existing]))
  assert.equal(r.objects.length, 2)
  assert.deepEqual(
    r.skipped.map((s) => [s.row, s.reason]),
    [
      [5, "existing"],
      [8, "total"],
    ]
  )
})

test("uraian objek: merek tipe, S/N, tahun, lalu uraian lain di baris baru", () => {
  assert.equal(
    objectDescription({ brand: "LIU GONG", type: "WHEEL LOADER CLG835H-E", serial: "X1", year: "2022", description: "Mortgagee: Bank X" }),
    "LIU GONG WHEEL LOADER CLG835H-E, S/N X1, Year 2022\nMortgagee: Bank X"
  )
})

function engineeringSlip(patch: Partial<PlacingSlip> = {}): PlacingSlip {
  return recalc({ ...switchCob(emptySlip(), "Engineering"), ...patch })
}

const ROWS = objectsFromRows(GI_SCHEDULE, ctx()).objects

test("slip baru: objek kosong awal diganti isi file", () => {
  const slip = engineeringSlip()
  assert.equal(importReplacesObjects(slip, false), true)
  const next = recalc({ ...slip, ...importObjectsPatch(slip, ROWS, { replace: false }) })
  const groups = itemGroups(next)
  assert.equal(groups.length, 3)
  assert.deepEqual(
    groups.map((g) => [g.item.amount, g.rateLines.map((l) => [l.label, l.rate, l.premium])]),
    [
      [300000000, [[GENERIC_RATE_LABEL, 1.1, 3300000]]],
      [750000000, [[GENERIC_RATE_LABEL, 0.63, 4725000]]],
      [500000000, [[GENERIC_RATE_LABEL, 1.1, 5500000]]],
    ]
  )
})

test("tambah di akhir: cover dan deductible mengikuti objek pertama", () => {
  const slip = engineeringSlip({
    interestItems: [{ id: "a", description: "Unit lama", amount: 100 }],
    rateLines: [
      { id: "a-r1", label: "Material Damage", rate: 1, premium: 0, vehicleId: "a", deductibles: ["10% of claim"] },
      { id: "a-r2", label: "SRCC", rate: 0.05, premium: 0, vehicleId: "a" },
    ],
  })
  assert.deepEqual(objectRateLabels(slip), ["Material Damage", "SRCC"])
  const rows = objectsFromRows(
    [
      ["Merek", "Tipe / Model", "Nilai Pertanggungan", "Rate Material Damage (%)", "Rate SRCC (%)"],
      ["Komatsu", "PC200", 1000, 2, 0.1],
    ],
    { rateLabels: objectRateLabels(slip), existingSerials: new Set() }
  ).objects
  const next = recalc({ ...slip, ...importObjectsPatch(slip, rows, { replace: false }) })
  const groups = itemGroups(next)
  assert.equal(groups.length, 2)
  assert.deepEqual(
    groups[1].rateLines.map((l) => [l.label, l.rate, l.premium, l.deductibles ?? []]),
    [
      ["Material Damage", 2, 20, ["10% of claim"]],
      ["SRCC", 0.1, 1, []],
    ]
  )
})

test("slip ber-section: objek diganti di Section 1, limit Section 2 tetap, deductible pindah", () => {
  const slip = engineeringSlip({
    usesSections: true,
    interestItems: [
      { id: "a", description: "Contract Works", amount: 1000 },
      { id: "b", description: "TPL any one occurrence", amount: 500, section: 2, limitOnly: true },
    ],
    rateLines: [
      { id: "a-r1", label: GENERIC_RATE_LABEL, rate: 1, premium: 0, vehicleId: "a", deductibles: ["MD 10% of claim"] },
      { id: "b-r1", label: GENERIC_RATE_LABEL, rate: null, premium: 0, vehicleId: "b", deductibles: ["TPL IDR 5,000,000"] },
    ],
  })
  const next = recalc({ ...slip, ...importObjectsPatch(slip, ROWS.slice(0, 2), { replace: true }) })
  const groups = itemGroups(next)
  assert.deepEqual(
    groups.map((g) => [g.item.section ?? 1, g.item.description.split(",")[0], g.rateLines[0].deductibles ?? []]),
    [
      [2, "TPL any one occurrence", ["TPL IDR 5,000,000"]],
      [1, "KOMATSU WHEEL LOADER WA 200", ["MD 10% of claim"]],
      [1, "CATERPILLAR BULLDOZER D5K2 LGP", []],
    ]
  )
})

test("template: judul kolom terbaca ulang oleh upload", async () => {
  const wb = new ExcelJS.Workbook()
  fillObjectTemplate(wb, {
    insuredName: "PT Habco Primatama",
    currency: "IDR",
    typeOfCover: "Contractors' Plant and Machinery",
    rateLabels: [GENERIC_RATE_LABEL],
  })
  const read = new ExcelJS.Workbook()
  await read.xlsx.load(await wb.xlsx.writeBuffer())
  assert.deepEqual(
    read.worksheets.map((ws) => ws.name),
    ["Objek", "Petunjuk"]
  )
  const ws = read.getWorksheet("Objek")!
  ws.getCell("B3").value = "Komatsu"
  ws.getCell("C3").value = "WA 200"
  ws.getCell("D3").value = "30926"
  ws.getCell("E3").value = "1998"
  ws.getCell("G3").value = 300000000
  ws.getCell("H3").value = 1.1
  const rows: unknown[][] = []
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    rows[n - 1] = (row.values as unknown[]).slice(1)
  })
  const r = objectsFromRows(Array.from(rows, (x) => x ?? []), ctx())
  assert.deepEqual(r.errors, [])
  assert.deepEqual(
    r.objects.map((o) => [o.description, o.sumInsured, o.rates[GENERIC_RATE_LABEL]]),
    [["Komatsu WA 200, S/N 30926, Year 1998", 300000000, 1.1]]
  )
})
