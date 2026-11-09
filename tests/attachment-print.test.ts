import assert from "node:assert/strict"
import test from "node:test"

import ExcelJS from "exceljs"

import { PRINT_TABLE_LIMITS, printKindFor } from "../lib/attachment-print"
import { formatNumber, workbookTables } from "../lib/excel-table"
import { PDF_TYPE, XLSX_TYPE } from "../lib/file-types"

async function bytesOf(wb: ExcelJS.Workbook) {
  return new Uint8Array(await wb.xlsx.writeBuffer())
}

test("jenis cetak lampiran dari jenis berkas hasil baca server", () => {
  assert.equal(printKindFor(PDF_TYPE), "pdf")
  assert.equal(printKindFor(XLSX_TYPE), "excel")
  assert.equal(printKindFor("image/png"), "image")
  assert.equal(printKindFor("image/webp"), "image")
  assert.equal(printKindFor("text/html"), null)
})

test("angka Excel mengikuti format selnya", () => {
  // General dicetak apa adanya, jadi tahun pembuatan tidak diberi titik ribuan.
  assert.equal(formatNumber(2010), "2010")
  assert.equal(formatNumber(2010, "General"), "2010")
  assert.equal(formatNumber(0.1 + 0.2), "0.3")
  assert.equal(formatNumber(8500, "#,##0"), "8.500")
  assert.equal(formatNumber(8_000_000, '"USD "#,##0.00'), "USD 8.000.000,00")
  assert.equal(formatNumber(1_250_000.5, "[$IDR] #,##0.00"), "IDR 1.250.000,50")
  assert.equal(formatNumber(0.0045, "0.00%"), "0,45%")
  assert.equal(formatNumber(12.5, "0.0#"), "12,5")
  assert.equal(formatNumber(1234.5, '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)'), "1.234,50")
})

test("vessel schedule: judul gabungan, header tebal, angka, tanggal, rumus", async () => {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Vessel Schedule")
  // Isi mulai di B2: baris dan kolom kosong di depan tidak dicetak.
  ws.getCell("B2").value = "VESSEL SCHEDULE"
  ws.mergeCells("B2:E2")
  ws.getRow(3).values = [undefined, undefined, "Vessel", "Year Built", "GRT", "Sum Insured"]
  ws.getRow(3).font = { bold: true }
  ws.getCell("B3").value = "No"
  ws.getRow(4).values = [undefined, undefined, 1, 2010, 8500, 8_000_000]
  ws.getCell("C4").value = "MV Patria Nawasena 1"
  ws.getCell("B4").value = 1
  ws.getCell("E4").numFmt = "#,##0"
  ws.getCell("F4").numFmt = '"USD "#,##0.00'
  ws.getCell("B5").value = 2
  ws.getCell("C5").value = "TB Eng Lee 7"
  ws.getCell("D5").value = new Date(Date.UTC(2026, 6, 29))
  ws.getCell("E5").value = { formula: "E4*2", result: 17000 }
  ws.getCell("E5").numFmt = "#,##0"
  wb.addWorksheet("Kosong")
  const hidden = wb.addWorksheet("Rahasia")
  hidden.state = "hidden"
  hidden.getCell("A1").value = "tidak dicetak"

  const sheets = await workbookTables(await bytesOf(wb))
  assert.deepEqual(sheets.map((s) => s.name), ["Vessel Schedule"])
  const [sheet] = sheets
  assert.equal(sheet.truncated, false)
  assert.deepEqual(sheet.rows[0], [{ text: "VESSEL SCHEDULE", colSpan: 4 }, { text: "" }])
  assert.deepEqual(
    sheet.rows[1].map((c) => [c.text, c.bold ?? false]),
    [["No", true], ["Vessel", true], ["Year Built", true], ["GRT", true], ["Sum Insured", true]]
  )
  assert.deepEqual(
    sheet.rows[2].map((c) => c.text),
    ["1", "MV Patria Nawasena 1", "2010", "8.500", "USD 8.000.000,00"]
  )
  assert.equal(sheet.rows[2][4].numeric, true)
  assert.deepEqual(sheet.rows[3].map((c) => c.text), ["2", "TB Eng Lee 7", "29/07/2026", "17.000", ""])
})

test("tabel panjang dipotong di batas cetak", async () => {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Units")
  for (let r = 1; r <= PRINT_TABLE_LIMITS.rows + 20; r++) ws.addRow([`Unit ${r}`, r])
  const [sheet] = await workbookTables(await bytesOf(wb))
  assert.equal(sheet.rows.length, PRINT_TABLE_LIMITS.rows)
  assert.equal(sheet.truncated, true)
  assert.equal(sheet.rows.at(-1)?.[0].text, `Unit ${PRINT_TABLE_LIMITS.rows}`)
})
