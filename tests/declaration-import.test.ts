import assert from "node:assert/strict"
import test from "node:test"

import ExcelJS from "exceljs"

import type { OpenCoverRate, Policy } from "../lib/data/types"
import {
  DECLARATION_IMPORT_LIMIT,
  declarationsFromRows,
  fillDeclarationTemplate,
  type DeclarationImportContext,
} from "../lib/declaration-import"
import { declarationPreset } from "../lib/open-cover"

const RATES: OpenCoverRate[] = [
  { id: "a", label: "DRY SHIPMENT", basis: "percent", rate: 0.075 },
  { id: "b", label: "REEFER SHIPMENT (WITHIN INDONESIA)", basis: "percent", rate: 0.0975 },
  { id: "c", label: "20 FT - Others", basis: "per_unit", rate: 100_000, unit: "container" },
  { id: "d", label: "Belum ada rate", basis: "percent", rate: null },
]

function ctx(over: Partial<DeclarationImportContext> = {}): DeclarationImportContext {
  return {
    rates: RATES,
    period: { start: "2026-05-28", end: "2027-05-28" },
    currency: "IDR",
    existingNos: new Set(["cert/lama/001"]),
    ...over,
  }
}

const HEADER = [
  "No. Sertifikat / Deklarasi*",
  "Tanggal Deklarasi*",
  "Nilai Deklarasi*",
  "Kategori Rate",
  "Jumlah Unit",
  "Premium",
  "Keterangan",
]

test("premi deklarasi dihitung dari kategori rate slip, atau memakai kolom Premium", () => {
  const { declarations, errors } = declarationsFromRows(
    [
      HEADER,
      ["CERT/001", "05/12/2026", 1_000_000_000, "DRY SHIPMENT", null, null, "Jakarta - Medan"],
      ["CERT/002", new Date(Date.UTC(2026, 11, 12)), "2.000.000.000", "reefer shipment (within indonesia)"],
      ["CERT/003", "2026-12-20", 500_000_000, "20 FT - Others", 10],
      ["CERT/004", "21/12/2026", 750_000_000, "DRY SHIPMENT", null, "600.000"],
      [],
    ],
    ctx()
  )
  assert.deepEqual(errors, [])
  assert.deepEqual(
    declarations.map((d) => [d.row, d.policyNo, d.inceptionDate, d.sumInsured, d.premium, d.rateLabel, d.units]),
    [
      [2, "CERT/001", "2026-12-05", 1_000_000_000, 750_000, "DRY SHIPMENT", null],
      [3, "CERT/002", "2026-12-12", 2_000_000_000, 1_950_000, "REEFER SHIPMENT (WITHIN INDONESIA)", null],
      // Rate per container: 10 × IDR 100.000.
      [4, "CERT/003", "2026-12-20", 500_000_000, 1_000_000, "20 FT - Others", 10],
      // Kolom Premium diisi: dipakai apa adanya.
      [5, "CERT/004", "2026-12-21", 750_000_000, 600_000, "DRY SHIPMENT", null],
    ]
  )
  assert.equal(declarations[0].remarks, "Jakarta - Medan")
})

test("slip dengan satu rate: kategori boleh dikosongkan", () => {
  const { declarations, errors } = declarationsFromRows(
    [HEADER, ["CERT/010", "05/12/2026", 1_000_000_000]],
    ctx({ rates: [RATES[0]] })
  )
  assert.deepEqual(errors, [])
  assert.equal(declarations[0].premium, 750_000)
  assert.equal(declarations[0].rateLabel, "DRY SHIPMENT")
})

test("kesalahan per baris memakai nomor baris Excel, dan tidak ada baris yang lolos sebagian", () => {
  const { declarations, errors } = declarationsFromRows(
    [
      ["Daftar deklarasi CV KARYA MITRA KASIH"],
      HEADER,
      ["CERT/100", "05/12/2026", 1_000_000_000, "DRY SHIPMENT"],
      ["cert/100", "06/12/2026", 1_000_000_000, "DRY SHIPMENT"],
      ["CERT/LAMA/001", "06/12/2026", 1_000_000_000, "DRY SHIPMENT"],
      ["CERT/101", "01/06/2027", 1_000_000_000, "DRY SHIPMENT"],
      ["CERT/102", "kemarin", 1_000_000_000, "DRY SHIPMENT"],
      ["CERT/103", "07/12/2026", 0, "DRY SHIPMENT"],
      ["CERT/104", "07/12/2026", 1_000_000_000, "BULK"],
      ["CERT/105", "07/12/2026", 1_000_000_000, "20 FT - Others"],
      ["CERT/106", "07/12/2026", 1_000_000_000],
      ["", "07/12/2026", 1_000_000_000, "DRY SHIPMENT"],
    ],
    ctx()
  )
  assert.deepEqual(declarations.map((d) => d.policyNo), ["CERT/100"])
  assert.deepEqual(errors, [
    "Baris 4: No. Sertifikat cert/100 sama dengan baris 3.",
    "Baris 5: No. Sertifikat CERT/LAMA/001 sudah terdaftar di Policy Database.",
    "Baris 6: Tanggal Deklarasi 01/06/2027 di luar periode polis MOP (28 Mei 2026 s/d 28 Mei 2027).",
    'Baris 7: Tanggal Deklarasi "kemarin" tidak dikenali.',
    "Baris 8: Nilai Deklarasi harus angka lebih dari 0.",
    'Baris 9: Kategori Rate "BULK" tidak ada di slip. Pilihan: DRY SHIPMENT, REEFER SHIPMENT (WITHIN INDONESIA), 20 FT - Others.',
    "Baris 10: Jumlah Unit wajib diisi untuk rate 20 FT - Others (IDR 100.000 per container).",
    "Baris 11: Isi Kategori Rate atau Premium.",
    "Baris 12: No. Sertifikat / Deklarasi kosong.",
  ])
})

test("file tanpa kolom wajib, file kosong, dan file di atas batas ditolak", () => {
  assert.deepEqual(declarationsFromRows([["Nama", "Alamat"]], ctx()).errors, [
    "Kolom No. Sertifikat / Deklarasi dan Nilai Deklarasi tidak ditemukan. Pakai template deklarasi.",
  ])
  assert.deepEqual(declarationsFromRows([HEADER, []], ctx()).errors, ["Tidak ada deklarasi di file."])
  const many = Array.from({ length: DECLARATION_IMPORT_LIMIT + 1 }, (_, i) => [
    `CERT/${i}`,
    "05/12/2026",
    1_000_000,
    "DRY SHIPMENT",
  ])
  const big = declarationsFromRows([HEADER, ...many], ctx())
  assert.equal(
    big.errors.at(-1),
    `Maksimal ${DECLARATION_IMPORT_LIMIT.toLocaleString("id-ID")} deklarasi baru per file. Pecah file menjadi beberapa upload.`
  )
})

test("no. sertifikat yang sudah tercatat di polis MOP ini dilewati, jadi file boleh diupload ulang", () => {
  const saved = new Set(["cert/lama/001"])
  const { declarations, skipped, errors } = declarationsFromRows(
    [
      HEADER,
      ["CERT/LAMA/001", "05/12/2026", 1_000_000_000, "DRY SHIPMENT"],
      ["CERT/200", "06/12/2026", 1_000_000_000, "DRY SHIPMENT"],
    ],
    ctx({ savedNos: saved })
  )
  assert.deepEqual(errors, [])
  assert.deepEqual(skipped, [{ row: 2, policyNo: "CERT/LAMA/001" }])
  assert.deepEqual(declarations.map((d) => d.policyNo), ["CERT/200"])
  const again = declarationsFromRows(
    [HEADER, ["CERT/LAMA/001", "05/12/2026", 1_000_000_000, "DRY SHIPMENT"]],
    ctx({ savedNos: saved })
  )
  assert.deepEqual(again.errors, ["Semua deklarasi di file sudah tercatat di polis MOP ini."])
})

test("template bisa diisi lalu dibaca lagi, dengan dropdown kategori dari sheet Rate", async () => {
  const wb = new ExcelJS.Workbook()
  const ws = fillDeclarationTemplate(wb, {
    policyNo: "007/LCH-PLCMT/CI-MOP/XI/2026",
    insuredName: "CV KARYA MITRA KASIH",
    period: { start: "2026-05-28", end: "2027-05-28" },
    currency: "IDR",
    rates: RATES,
  })
  assert.deepEqual(wb.worksheets.map((w) => w.name), ["Deklarasi", "Rate", "Petunjuk"])
  assert.deepEqual(ws.getCell("D2").dataValidation.formulae, ["Rate!$A$2:$A$4"])
  // Diisi seperti petugas: langsung di baris 2, di bawah judul.
  ws.getRow(2).values = ["CERT/500", new Date(Date.UTC(2026, 11, 5)), 1_000_000_000, "DRY SHIPMENT"]

  const loaded = new ExcelJS.Workbook()
  await loaded.xlsx.load(await wb.xlsx.writeBuffer())
  const sheet = loaded.getWorksheet("Deklarasi")!
  const rows: unknown[][] = []
  sheet.eachRow({ includeEmpty: true }, (row, n) => {
    rows[n - 1] = (row.values as unknown[]).slice(1)
  })
  const { declarations, errors } = declarationsFromRows(Array.from(rows, (r) => r ?? []), ctx())
  assert.deepEqual(errors, [])
  assert.deepEqual(
    declarations.map((d) => [d.row, d.policyNo, d.inceptionDate, d.premium]),
    [[2, "CERT/500", "2026-12-05", 750_000]]
  )
})

test("deklarasi mengikuti isian polis MOP", () => {
  const master = {
    id: "mop-1",
    policyNo: "007/LCH-PLCMT/CI-MOP/XI/2026",
    clientId: "c-1",
    placingSlipId: "slip-7",
    parentPolicyId: null,
    insuredName: "CV KARYA MITRA KASIH",
    insurer: "PT Asuransi Multi Artha Guna Tbk",
    insurers: [{ id: "i1", insurer: "PT Asuransi Multi Artha Guna Tbk", share: 100, role: "As Leader" as const }],
    cob: "Marine Cargo",
    typeOfCover: "Marine Cargo Open Cover",
    inceptionDate: "2026-05-28",
    expiryDate: "2027-05-28",
    currency: "IDR",
    sumInsured: 0,
    premium: 0,
    brokeragePct: 12.5,
    type: "Baru" as const,
    riskLocation: "",
    files: [],
  } as Policy
  const preset = declarationPreset(master)
  assert.equal(preset.type, "Deklarasi")
  assert.equal(preset.parentPolicyId, "mop-1")
  assert.equal(preset.placingSlipId, "slip-7")
  assert.equal(preset.expiryDate, "2027-05-28")
  assert.equal(preset.brokeragePct, 12.5)
  assert.equal(preset.insurers, master.insurers)
})
