import assert from "node:assert/strict"
import test from "node:test"

import ExcelJS from "exceljs"

import { exportXlsx, type ExportSpec } from "../lib/export"

// Tanggal mundur sehari hanya terjadi di zona waktu positif. Dipasang di sini supaya test tetap
// menangkap bug walau dijalankan di mesin atau CI yang memakai UTC.
process.env.TZ = "Asia/Jakarta"

// exportXlsx mengunduh lewat <a download>. Di Node cukup tangkap Blob yang akan diunduh.
const downloads: Blob[] = []
URL.createObjectURL = (blob: Blob) => {
  downloads.push(blob)
  return "blob:test"
}
URL.revokeObjectURL = () => {}
Object.assign(globalThis, {
  document: {
    body: { appendChild() {} },
    createElement: () => ({ click() {}, remove() {} }),
  },
})

interface Row {
  policyNo: string
  inceptionDate: string | null
  updatedAt: string
}

/** Export lalu baca ulang file .xlsx yang akan diunduh browser. */
async function exportedSheet(rows: Row[]) {
  const spec: ExportSpec<Row> = {
    filename: "polis-lch",
    rows,
    columns: [
      { header: "No. Polis", value: (r) => r.policyNo },
      { header: "Mulai", value: (r) => r.inceptionDate, type: "date" },
      { header: "Diperbarui", value: (r) => r.updatedAt, type: "date" },
    ],
  }
  await exportXlsx(spec)
  const blob = downloads.pop()
  assert.ok(blob, "exportXlsx tidak mengunduh file")
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await blob.arrayBuffer())
  const ws = wb.getWorksheet("Data")
  assert.ok(ws)
  return ws
}

/** Serial tanggal Excel. ExcelJS membaca serial sebagai Date UTC, jadi pecahannya adalah jam. */
function serial(value: ExcelJS.CellValue) {
  assert.ok(value instanceof Date, `bukan tanggal: ${String(value)}`)
  return value.getTime() / 86_400_000 + 25_569
}

test("test berjalan di WIB", () => {
  assert.equal(new Date(2026, 10, 1).getTimezoneOffset(), -420)
})

test("tanggal tersimpan sebagai serial bulat dengan format dd/mm/yyyy", async () => {
  const ws = await exportedSheet([
    { policyNo: "A", inceptionDate: "2026-11-01", updatedAt: "2026-11-01" },
    { policyNo: "B", inceptionDate: "2026-12-31", updatedAt: "2026-12-31" },
  ])
  // Sebelum diperbaiki: 46326,70833 (31/10/2026 pukul 17.00).
  assert.equal(serial(ws.getCell("B2").value), 46327) // 01/11/2026
  assert.equal(serial(ws.getCell("B3").value), 46387) // 31/12/2026
  assert.equal(ws.getCell("B2").numFmt, "dd/mm/yyyy")
  assert.equal(ws.getCell("C3").numFmt, "dd/mm/yyyy")
})

test("updatedAt berjam jadi tanggal WIB, bukan NaN", async () => {
  const ws = await exportedSheet([
    { policyNo: "A", inceptionDate: null, updatedAt: "2026-11-18T16:59:59.000Z" }, // 18/11 23.59 WIB
    { policyNo: "B", inceptionDate: null, updatedAt: "2026-11-18T17:00:00.000Z" }, // 19/11 00.00 WIB
  ])
  assert.equal(serial(ws.getCell("C2").value), 46344) // 18/11/2026
  assert.equal(serial(ws.getCell("C3").value), 46345) // 19/11/2026
  assert.equal(ws.getCell("B2").text, "")
})
