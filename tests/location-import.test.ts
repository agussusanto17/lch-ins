import assert from "node:assert/strict"
import test from "node:test"

import ExcelJS from "exceljs"

import { recalcSlip, sumPremium, totalSumInsured } from "../lib/calc"
import {
  addLocationPatch,
  emptySlip,
  floatingSumInsuredPatch,
  importLocationsPatch,
  propertyRateLinesPatch,
  switchCob,
  updateLocationPatch,
} from "../components/underwriting/slip-model"
import type { PlacingSlip } from "../lib/data/types"
import {
  LOCATION_COLUMNS,
  fillLocationTemplate,
  locationsFromRows,
  parseConstructionClass,
  parseRate,
  type LocationImportContext,
} from "../lib/location-import"
import {
  locationGroups,
  locationInsuredName,
  locationKey,
  riskLocationItemsText,
  slipLocations,
} from "../lib/slip-locations"

const PAR_LABELS = [
  "FLEXAS",
  "FWTWD",
  "RSMDCC",
  "Other Losses",
  "BI PAR (FLEXAS + FWTWD + RSMDCC + Others)",
  "EQVET",
  "BI EQVET",
]

const ctx = (patch: Partial<LocationImportContext> = {}): LocationImportContext => ({
  rateLabels: PAR_LABELS,
  floating: false,
  existingKeys: new Set(),
  ...patch,
})

const RSMDCC =
  "Riots, Strike, Malicious Damage: 5% of Claim, minimum IDR 5,000,000.00 for any one occurrence\n" +
  "Civil Commotion: 5% of Claim, minimum IDR 5,000,000.00 for any one occurrence"

/** Lokasi 1–4 lampiran polis 50013026001304 PT. SPIL (Fleet Office) PAR, halaman 7–8. */
const SPIL: Record<string, unknown>[] = [
  {
    insured: "PT SALAM PACIFIC INDONESIA LINES QQ SALIK SOETEMO",
    location: "Kalianak No. 51 E, F, G (Belakang), Surabaya",
    occupation: "2221",
    occupationLabel: "Bengkel",
    constructionClass: "Class I",
    mdDesc1: "Bangunan",
    mdValue1: 23096320000,
    mdDesc2: "Aset Mesin, IT, etc",
    mdValue2: 22160000000,
    "rate:FLEXAS": 0.75,
    "rate:FWTWD": 0.45,
    "rate:RSMDCC": 0.0001,
    "rate:Other Losses": 0.0001,
    "ded:FLEXAS": "Nil",
    "ded:RSMDCC": RSMDCC,
  },
  {
    insured: "PT SALAM PACIFIC INDONESIA LINES",
    location: "Kalianak No. 51 E, F, G (Depan), Surabaya",
    occupation: "2971 - Office & Mess",
    occupationLabel: "Office & Mess",
    constructionClass: "Class I",
    mdDesc1: "Bangunan",
    mdValue1: 36361728000,
    mdDesc2: "Asset Mebel Air",
    mdValue2: 11612900000,
    mdDesc3: "Aset Mesin, IT, etc",
    mdValue3: 1947000000,
    "rate:FLEXAS": "0,368",
    "rate:FWTWD": 0.45,
    "rate:RSMDCC": 0.0001,
    "rate:Other Losses": 0.0001,
    "ded:FLEXAS": "Nil",
  },
  {
    insured: "SALIK SOETEMO",
    location: "Kalimalang No. 2, Surabaya",
    occupation: 2971,
    occupationLabel: "Office & Mess",
    constructionClass: "Class I",
    mdDesc1: "Bangunan",
    mdValue1: 894336000,
    mdDesc2: "Asset Mebel Air",
    mdValue2: 156400000,
    mdDesc3: "Aset Mesin, IT, etc",
    mdValue3: 223872800,
    "rate:FLEXAS": 0.368,
    "rate:FWTWD": 0.45,
    "rate:RSMDCC": 0.0001,
    "rate:Other Losses": 0.0001,
  },
  {
    insured: "SALIK SOETEMO",
    location: "Karet No. 100-102, Surabaya",
    occupation: "2971",
    occupationLabel: "Office & Mess",
    constructionClass: "Class I",
    mdDesc1: "Bangunan",
    mdValue1: 4077120000,
    mdDesc2: "Asset Mebel Air",
    mdValue2: 992000000,
    "rate:FLEXAS": 0.368,
    "rate:FWTWD": 0.45,
    "rate:RSMDCC": 0.0001,
    "rate:Other Losses": 0.0001,
  },
]

/** Template sistem diisi lokasi, disimpan, lalu dibaca lagi seperti upload di form. */
async function templateRows(locations: Record<string, unknown>[]) {
  const wb = new ExcelJS.Workbook()
  const ws = fillLocationTemplate(wb, { insuredName: "PT SALAM PACIFIC INDONESIA LINES", currency: "IDR" })
  locations.forEach((loc, i) => {
    for (const [key, value] of Object.entries(loc)) {
      const col = LOCATION_COLUMNS.findIndex((c) => c.key === key) + 1
      assert.ok(col > 0, key)
      ws.getCell(3 + i, col).value = value as ExcelJS.CellValue
    }
  })
  const loaded = new ExcelJS.Workbook()
  await loaded.xlsx.load(await wb.xlsx.writeBuffer())
  const sheet = loaded.getWorksheet("Lokasi")!
  const rows: unknown[][] = []
  sheet.eachRow({ includeEmpty: true }, (row, n) => {
    rows[n - 1] = (row.values as unknown[]).slice(1)
  })
  return Array.from(rows, (r) => r ?? [])
}

function propertySlip(): PlacingSlip {
  const slip = switchCob(emptySlip(), "Property")
  return { ...slip, insuredName: "PT SALAM PACIFIC INDONESIA LINES" }
}

test("template lokasi: 40 kolom, rumus otomatis, dan sheet pendukung", async () => {
  assert.equal(LOCATION_COLUMNS.length, 40)
  const wb = new ExcelJS.Workbook()
  fillLocationTemplate(wb, { insuredName: "PT A", currency: "IDR" })
  assert.deepEqual(
    wb.worksheets.map((w) => w.name),
    ["Lokasi", "Petunjuk", "Okupasi", "Skala BI"]
  )
  const ws = wb.getWorksheet("Lokasi")!
  assert.equal(ws.getCell("C2").value, "Risk Location*")
  assert.equal(ws.getCell("AD2").value, "Rate BI PAR (‰, otomatis)")
  const formula = (ref: string) => (ws.getCell(ref).value as { formula: string }).formula
  assert.match(formula("E3"), /Okupasi!\$C\$2/)
  assert.match(formula("AD3"), /'Skala BI'/)
  assert.match(formula("AG502"), /ROUND\(SUM\(J502,L502,N502,P502,R502\)\*N\(Z502\)\/1000,2\)/)
})

test("upload SPIL lokasi 1–4: premi sama dengan lampiran polis", async () => {
  const rows = await templateRows(SPIL)
  const result = locationsFromRows(rows, ctx())
  assert.deepEqual(result.errors, [])
  assert.equal(result.read, 4)
  assert.equal(result.locations.length, 4)
  assert.equal(result.hasDeductibles, true)

  const [first, second] = result.locations
  assert.equal(first.row, 3)
  assert.equal(first.insuredName, "PT SALAM PACIFIC INDONESIA LINES QQ SALIK SOETEMO")
  assert.match(first.occupation, /^2221 - /)
  assert.equal(first.occupationLabel, "Bengkel")
  assert.equal(first.constructionClass, "K1")
  assert.deepEqual(first.deductibles.RSMDCC, RSMDCC.split("\n"))
  assert.equal(second.rates.FLEXAS, 0.368)

  let slip = propertySlip()
  slip = recalcSlip({
    ...slip,
    ...importLocationsPatch(slip, result.locations, {
      replace: false,
      indemnityMonths: result.indemnityMonths,
      fileDeductibles: result.hasDeductibles,
    }),
  })
  const groups = locationGroups(slip)
  // Lokasi pertama slip baru masih kosong, jadi diganti isi file.
  assert.equal(groups.length, 4)
  assert.deepEqual(
    groups.map((g) => sumPremium(g.rateLines)),
    [54_316_635.26, 40_845_876.02, 1_042_884.92, 4_147_553.98]
  )
  assert.equal(totalSumInsured(slip), 101_521_676_800)
  assert.equal(groups[0].location.insuredName, first.insuredName)
  // Deductible dari file per cover; cover tanpa isian kosong.
  const deductibles = Object.fromEntries(
    groups[0].rateLines.map((l) => [l.label, l.deductibles ?? []])
  )
  assert.deepEqual(deductibles.FLEXAS, ["Nil"])
  assert.deepEqual(deductibles.FWTWD, [])
})

test("baris yang salah dilaporkan per baris dan tidak ikut", async () => {
  const rows = await templateRows([
    { location: "", occupation: "2971", mdDesc1: "Bangunan", mdValue1: 1 },
    { location: "Jl. A, Surabaya", occupation: "9999", mdDesc1: "Bangunan", mdValue1: 1 },
    { location: "Jl. B, Surabaya", occupation: "2971", constructionClass: "Kelas 4", mdDesc1: "Bangunan", mdValue1: 1 },
    { location: "Jl. C, Surabaya", occupation: "2971", mdDesc1: "Bangunan", mdValue1: 1, "rate:FLEXAS": 0.368 },
    { location: "Jl. D, Surabaya", occupation: "2971", mdDesc1: "Bangunan", mdValue1: "satu miliar" },
    { location: "Jl. E, Surabaya", occupation: "2971", mdValue1: 1 },
    { location: "Jl. F, Surabaya", occupation: "2971" },
    { location: "Jl. G, Surabaya", occupation: "2971", mdDesc1: "Bangunan", mdValue1: 1, "ded:FWTWD": "1\n2\n3\n4\n5\n6" },
    { location: "Jl. H, Surabaya", occupation: "2971", mdDesc1: "Bangunan", mdValue1: 1, "rate:FWTWD": "abc" },
    { location: "Jl. I, Surabaya", occupation: "2971", constructionClass: "K2", mdDesc1: "Bangunan", mdValue1: 1, "rate:FLEXAS": 0.5 },
    { location: "Jl. I, Surabaya", occupation: "2971", constructionClass: "K2", mdDesc1: "Stok", mdValue1: 2 },
  ])
  const result = locationsFromRows(rows, ctx())
  assert.deepEqual(result.errors, [
    "Baris 3: Risk Location kosong.",
    'Baris 4: Kode Okupasi OJK "9999" tidak ada di daftar OJK (sheet Okupasi).',
    'Baris 5: Construction Class "Kelas 4" tidak dikenali. Isi Class I, Class II, atau Class III.',
    "Baris 6: Construction Class wajib karena rate FLEXAS atau EQVET diisi.",
    'Baris 7: Sum Insured MD 1 "satu miliar" harus angka 0 atau lebih, tanpa mata uang.',
    "Baris 8: Isi Interest MD 1 untuk Sum Insured MD 1.",
    "Baris 9: Interest MD 1 dan Sum Insured MD 1 wajib diisi.",
    "Baris 10: Deductible FWTWD lebih dari 5 baris.",
    'Baris 11: Rate FWTWD "abc" harus angka per mil antara 0 dan 1000, misalnya 0,75.',
    "Baris 13: Lokasi sama dengan baris 12 (alamat dan tertanggung sama).",
  ])
  assert.equal(result.read, 11)
  assert.equal(result.failed, 10)
  assert.deepEqual(
    result.locations.map((l) => [l.row, l.constructionClass, l.rates.FLEXAS]),
    [[12, "K2", 0.5]]
  )
})

test("rate untuk cover yang tidak ada di type of cover slip ditolak", async () => {
  let slip = propertySlip()
  slip = recalcSlip({ ...slip, ...propertyRateLinesPatch(slip, "0116") })
  const labels = locationGroups(slip)[0].rateLines.map((l) => l.label)
  const rows = await templateRows([
    { location: "Jl. A, Surabaya", occupation: "2971", mdDesc1: "Bangunan", mdValue1: 1, "rate:FLEXAS": 0.3 },
  ])
  const result = locationsFromRows(rows, ctx({ rateLabels: labels }))
  assert.deepEqual(result.errors, [
    "Baris 3: Rate FLEXAS diisi, tetapi type of cover slip tidak punya cover FLEXAS.",
  ])
})

test("lokasi yang sudah ada dilewati; mode ganti memakai semua baris", async () => {
  const rows = await templateRows(SPIL.slice(0, 2))
  let slip = propertySlip()
  const first = locationsFromRows(rows, ctx())
  slip = recalcSlip({
    ...slip,
    ...importLocationsPatch(slip, first.locations.slice(0, 1), {
      replace: false,
      fileDeductibles: true,
    }),
  })
  const keys = new Set(slipLocations(slip).map(locationKey))
  const again = locationsFromRows(rows, ctx({ existingKeys: keys }))
  assert.equal(again.read, 2)
  assert.deepEqual(again.skipped.map((s) => s.row), [3])
  assert.deepEqual(again.locations.map((l) => l.row), [4])

  // Tambah: lokasi 2 masuk di akhir daftar.
  const appended = recalcSlip({
    ...slip,
    ...importLocationsPatch(slip, again.locations, { replace: false, fileDeductibles: true }),
  })
  assert.equal(locationGroups(appended).length, 2)

  // Ganti: semua lokasi lama dibuang, termasuk sum insured dan rate-nya.
  const replaced = recalcSlip({
    ...appended,
    ...importLocationsPatch(appended, again.locations, { replace: true, fileDeductibles: true }),
  })
  const groups = locationGroups(replaced)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].location.riskLocation, "Kalianak No. 51 E, F, G (Depan), Surabaya")
  assert.equal(replaced.rateLines.length, PAR_LABELS.length)
  assert.equal(sumPremium(replaced.rateLines), 40_845_876.02)
})

test("file tanpa deductible: lokasi baru memakai deductible lokasi 1", async () => {
  let slip = propertySlip()
  slip = recalcSlip({
    ...slip,
    rateLines: slip.rateLines.map((l) =>
      l.label === "FWTWD" ? { ...l, deductibles: ["10% of claim"] } : l
    ),
  })
  slip = recalcSlip({
    ...slip,
    ...updateLocationPatch(slip, locationGroups(slip)[0].location.id, {
      riskLocation: "Jl. Lama, Jakarta",
      occupation: "2971 - Office",
    }),
  })
  const rows = await templateRows([
    { location: "Jl. Baru, Jakarta", occupation: "2971", mdDesc1: "Bangunan", mdValue1: 1000 },
  ])
  const result = locationsFromRows(rows, ctx())
  assert.equal(result.hasDeductibles, false)
  const next = recalcSlip({
    ...slip,
    ...importLocationsPatch(slip, result.locations, { replace: false, fileDeductibles: false }),
  })
  const added = locationGroups(next)[1]
  assert.deepEqual(
    added.rateLines.find((l) => l.label === "FWTWD")?.deductibles,
    ["10% of claim"]
  )
})

test("slip floating hanya memakai data lokasi", async () => {
  let slip = propertySlip()
  slip = recalcSlip({ ...slip, ...addLocationPatch(slip) })
  slip = recalcSlip({ ...slip, ...floatingSumInsuredPatch(slip, true) })
  slip = recalcSlip({
    ...slip,
    sumInsuredSection1: [{ id: "stock", description: "Stock", amount: 12_000_000_000 }],
    rateLines: slip.rateLines.map((l) => ({ ...l, rate: l.label === "FLEXAS" ? 1.127 : null })),
  })
  const rows = await templateRows([SPIL[0], SPIL[1]])
  const result = locationsFromRows(rows, ctx({ floating: true }))
  assert.deepEqual(result.errors, [])
  assert.equal(result.floatingIgnoredRows, 2)
  assert.deepEqual(result.locations[0].rates, {})

  const next = recalcSlip({
    ...slip,
    ...importLocationsPatch(slip, result.locations, { replace: true, fileDeductibles: false }),
  })
  const groups = locationGroups(next)
  assert.equal(groups.length, 2)
  assert.equal(totalSumInsured(next), 12_000_000_000)
  assert.equal(sumPremium(next.rateLines), 13_524_000)
  assert.equal(groups[1].rateLines.length, 0)
})

test("Period of Indemnity: satu nilai untuk slip, berbeda antar baris ditolak", async () => {
  const base = { occupation: "2971", mdDesc1: "Bangunan", mdValue1: 1, biDesc1: "Gross Profit", biValue1: 1 }
  const same = locationsFromRows(
    await templateRows([
      { ...base, location: "Jl. A, Surabaya", indemnity: 12 },
      { ...base, location: "Jl. B, Surabaya", indemnity: "12" },
    ]),
    ctx()
  )
  assert.equal(same.indemnityMonths, 12)
  const slip = propertySlip()
  assert.equal(
    importLocationsPatch(slip, same.locations, {
      replace: false,
      indemnityMonths: same.indemnityMonths,
      fileDeductibles: false,
    }).indemnityPeriod,
    "12 months"
  )

  const differ = locationsFromRows(
    await templateRows([
      { ...base, location: "Jl. A, Surabaya", indemnity: 12 },
      { ...base, location: "Jl. B, Surabaya", indemnity: 24 },
    ]),
    ctx()
  )
  assert.deepEqual(differ.fileErrors, [
    "Period of Indemnity berbeda antar baris (12 bulan di baris 3, 24 bulan di baris 4). Slip menyimpan satu periode; samakan untuk semua lokasi.",
  ])
  assert.equal(differ.locations.length, 0)
})

test("file tanpa judul kolom atau tanpa lokasi ditolak", async () => {
  assert.deepEqual(locationsFromRows([["Nama", "Alamat"], ["A", "B"]], ctx()).fileErrors, [
    "Kolom Risk Location dan Kode Okupasi OJK tidak ditemukan. Pakai template lokasi.",
  ])
  assert.deepEqual(locationsFromRows(await templateRows([]), ctx()).fileErrors, [
    "Tidak ada lokasi di file.",
  ])
})

test("template lama: rate BI yang diisi manual dicatat, tidak dipakai", () => {
  const header = [
    "No", "Insured Name", "Risk Location*", "Kode Okupasi OJK*", "Interest MD 1*",
    "Sum Insured MD 1*", "Interest BI 1", "Sum Insured BI 1", "Rate FLEXAS (‰)", "Rate BI PAR (‰)",
  ]
  const result = locationsFromRows(
    [
      ["Data Lokasi"],
      header,
      [1, "", "Jl. A, Surabaya", "2971", "Bangunan", 1000, "Gross Profit", 500, 0.5, 0.5],
    ],
    ctx()
  )
  assert.deepEqual(result.errors, ["Baris 3: Construction Class wajib karena rate FLEXAS atau EQVET diisi."])
  const ok = locationsFromRows(
    [header, [1, "", "Jl. A, Surabaya", "2971", "Bangunan", 1000, "Gross Profit", 500, "", 0.5]],
    ctx()
  )
  assert.equal(ok.biRateRows, 1)
  assert.deepEqual(ok.locations[0].rates, {})
  assert.deepEqual(ok.locations[0].section2, [{ description: "Gross Profit", amount: 500 }])
})

test("isian kelas konstruksi dan rate dikenali dari beberapa format", () => {
  assert.deepEqual(
    ["Class I", "class ii", "III", "K1", "Kelas 2", "3", "IV", ""].map(parseConstructionClass),
    ["K1", "K2", "K3", "K1", "K2", "K3", null, null]
  )
  assert.deepEqual(
    [0.75, "0,75", "0.0001", "1,127‰", "abc", "", null].map(parseRate),
    [0.75, 0.75, 0.0001, 1.127, null, null, null]
  )
})

test("Risk Location bernomor: tertanggung lokasi yang berbeda dicetak di atas alamat", () => {
  const locations = [
    { riskLocation: "Kalianak No. 51,\nSurabaya", insuredName: "PT A QQ B" },
    { riskLocation: "Karet No. 100, Surabaya", insuredName: "pt a" },
    { riskLocation: "Kalimalang No. 2, Surabaya" },
  ]
  assert.equal(locationInsuredName(locations[1], "PT A"), "")
  assert.equal(
    riskLocationItemsText(locations, "PT A"),
    "1. PT A QQ B\nKalianak No. 51, Surabaya\n2. Karet No. 100, Surabaya\n3. Kalimalang No. 2, Surabaya"
  )
})
