import assert from "node:assert/strict"
import test from "node:test"

import ExcelJS from "exceljs"

import { PDF_TYPE, XLSX_TYPE, detectContentType } from "../lib/file-types"
import { attachmentUploadProblem, uploadProblem } from "../lib/uploads"

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? Array.from(p, (c) => c.charCodeAt(0)) : p)))

test("jenis berkas dibaca dari isinya: PDF, gambar, dan workbook Excel", async () => {
  assert.equal(detectContentType(bytes("%PDF-1.7\n")), PDF_TYPE)
  assert.equal(detectContentType(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), "image/png")
  assert.equal(detectContentType(bytes([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg")

  const wb = new ExcelJS.Workbook()
  wb.addWorksheet("Vessels").addRow(["Vessel", "GRT"])
  const xlsx = new Uint8Array(await wb.xlsx.writeBuffer())
  assert.equal(detectContentType(xlsx), XLSX_TYPE)

  // ZIP lain (misalnya dokumen Word) dan teks biasa ditolak.
  assert.equal(detectContentType(bytes([0x50, 0x4b, 0x03, 0x04], "word/document.xml")), null)
  assert.equal(detectContentType(bytes("<svg onload=alert(1)>")), null)
})

test("pemeriksaan di browser: lampiran slip menerima Excel, unggahan lain tidak", () => {
  const xlsx = { name: "Vessel Schedule.xlsx", size: 1000, type: XLSX_TYPE }
  assert.equal(attachmentUploadProblem(xlsx), null)
  // Sebagian browser tidak mengisi jenis file Excel; ekstensinya cukup.
  assert.equal(attachmentUploadProblem({ ...xlsx, type: "" }), null)
  assert.match(attachmentUploadProblem({ name: "a.docx", size: 10, type: "application/msword" }) ?? "", /Excel/)
  assert.match(attachmentUploadProblem({ ...xlsx, size: 5 * 1024 * 1024 }) ?? "", /4 MB/)
  assert.match(uploadProblem(xlsx) ?? "", /Hanya PDF/)
})
