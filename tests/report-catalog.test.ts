import assert from "node:assert/strict"
import test from "node:test"

import {
  defaultReportPeriod,
  REPORTS,
  reportPeriodError,
  visibleReports,
} from "../lib/report-catalog"

test("report tampil sesuai hak akses menu sumbernya", () => {
  const all = visibleReports(() => true, ["admin"])
  assert.deepEqual(
    all.map((g) => [g.division, g.reports.map((r) => r.id)]),
    [
      ["Produksi", ["rekap-produksi", "produksi-ojk"]],
      ["Klaim", ["statistik-klaim", "loss-ratio-asuransi", "loss-ratio-akun"]],
      ["Finance", ["reserve-basis", "laporan-mom"]],
    ]
  )
  assert.deepEqual(visibleReports((path) => path !== "/reports", ["admin"]), [])
})

test("report klaim hanya untuk role yang melihat bagian Klaim di Report Operational", () => {
  const ids = (roles: string[]) =>
    visibleReports(() => true, roles).flatMap((g) => g.reports.map((r) => r.id))
  for (const role of ["admin", "marketing", "claim", "direksi"]) {
    assert.ok(ids([role]).includes("statistik-klaim"), role)
    assert.ok(ids([role]).includes("loss-ratio-akun"), role)
  }
  // Loss ratio memuat nilai klaim, jadi ikut aturan report klaim.
  assert.deepEqual(ids(["placement"]), [
    "rekap-produksi",
    "produksi-ojk",
    "reserve-basis",
    "laporan-mom",
  ])
})

test("setiap report punya menu hak akses", () => {
  for (const report of REPORTS) assert.match(report.access, /^\//)
})

test("periode awal adalah bulan berjalan", () => {
  assert.deepEqual(defaultReportPeriod("2026-11-18"), { start: "2026-11-01", end: "2026-11-30" })
  assert.deepEqual(defaultReportPeriod("2028-02-10"), { start: "2028-02-01", end: "2028-02-29" })
})

test("Laporan MOM: 1 Januari sampai akhir bulan berjalan", () => {
  assert.deepEqual(defaultReportPeriod("2026-11-23", "ytd"), {
    start: "2026-01-01",
    end: "2026-11-30",
  })
  assert.deepEqual(defaultReportPeriod("2028-02-10", "ytd"), {
    start: "2028-01-01",
    end: "2028-02-29",
  })
})

test("periode report pembanding tahunan wajib dalam satu tahun", () => {
  assert.equal(reportPeriodError("2026-01-01", "2026-11-30", { sameYear: true }), null)
  assert.match(
    reportPeriodError("2025-12-01", "2026-01-31", { sameYear: true }) ?? "",
    /tahun yang sama/
  )
  assert.equal(reportPeriodError("2025-12-01", "2026-01-31"), null)
  assert.ok(REPORTS.find((r) => r.id === "laporan-mom")?.sameYear)
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
