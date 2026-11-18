import assert from "node:assert/strict"
import test from "node:test"

import {
  defaultReportPeriod,
  REPORTS,
  reportPeriodError,
  visibleReports,
} from "../lib/report-catalog"

test("report tampil sesuai hak akses menu sumbernya", () => {
  const all = visibleReports(() => true)
  assert.deepEqual(
    all.map((g) => [g.division, g.reports.map((r) => r.id)]),
    [["Produksi", ["rekap-produksi"]]]
  )
  assert.deepEqual(visibleReports((path) => path !== "/reports"), [])
})

test("setiap report punya menu hak akses", () => {
  for (const report of REPORTS) assert.match(report.access, /^\//)
})

test("periode awal adalah bulan berjalan", () => {
  assert.deepEqual(defaultReportPeriod("2026-11-18"), { start: "2026-11-01", end: "2026-11-30" })
  assert.deepEqual(defaultReportPeriod("2028-02-10"), { start: "2028-02-01", end: "2028-02-29" })
})

test("periode wajib lengkap dan berurutan", () => {
  assert.equal(reportPeriodError("2026-11-01", "2026-11-30"), null)
  assert.equal(reportPeriodError("2026-11-01", "2026-11-01"), null)
  assert.equal(reportPeriodError("", "2026-11-30"), "Isi tanggal mulai dan tanggal akhir.")
  assert.equal(
    reportPeriodError("2026-12-01", "2026-11-30"),
    "Tanggal mulai tidak boleh setelah tanggal akhir."
  )
})
