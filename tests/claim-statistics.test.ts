import assert from "node:assert/strict"
import test from "node:test"
import ExcelJS from "exceljs"

import {
  claimPeriodDate,
  claimStatusPivot,
  claimStatusSummary,
  fillClaimStatistics,
  sortedClaims,
  type ClaimStatisticsData,
  type ClaimStatRow,
} from "../lib/claim-statistics"

const claim = (patch: Partial<ClaimStatRow>): ClaimStatRow => ({
  claimNo: "CLM/2026/11/0001",
  insuredName: "PT A",
  insurer: "PT Asuransi X",
  policyNo: "P-1",
  cob: "Property",
  currency: "IDR",
  sumInsured: 1_000_000_000,
  estimatedLoss: 0,
  claimedAmount: 0,
  paidAmount: 0,
  adjusterFeeAmount: 0,
  salvageAmount: 0,
  lossDate: "2026-11-01",
  reportedDate: "2026-11-02",
  documentCompleteDate: null,
  spkDate: null,
  lodDate: null,
  status: "Outstanding",
  stage: "Tunggu Dokumen",
  adjuster: "",
  lossDescription: "",
  notes: "",
  lastFollowup: null,
  ...patch,
})

const CLAIMS: ClaimStatRow[] = [
  claim({ claimNo: "C-3", status: "Settled", paidAmount: 40_000_000, adjusterFeeAmount: 2_000_000, cob: "Motor Vehicle", stage: "SPK / SPGR terbit" }),
  claim({ claimNo: "C-1", estimatedLoss: 10_000_000, reportedDate: "2026-11-05" }),
  claim({ claimNo: "C-2", estimatedLoss: 100, currency: "USD", reportedDate: null, lossDate: "2026-11-03", insurer: "PT Asuransi Y" }),
  claim({ claimNo: "C-4", status: "Rejected", estimatedLoss: 5_000_000, cob: "Motor Vehicle", stage: "Dokumen Lengkap" }),
]

const DATA: ClaimStatisticsData = {
  claims: CLAIMS,
  statusLabels: {
    Outstanding: "Outstanding",
    "Partial Settle": "Partial Settle",
    Settled: "Settled",
    Closed: "Closed",
    Rejected: "Rejected",
  },
  stages: ["Tunggu Dokumen", "Dokumen Belum Lengkap", "Dokumen Lengkap", "Proses Adjuster", "SPK / SPGR terbit"],
}

test("dasar periode: tanggal lapor, atau tanggal kejadian bila kosong", () => {
  assert.equal(claimPeriodDate({ reportedDate: "2026-11-02", lossDate: "2026-11-01" }), "2026-11-02")
  assert.equal(claimPeriodDate({ reportedDate: null, lossDate: "2026-11-01" }), "2026-11-01")
})

test("ringkasan per status: semua status tampil, nilai dalam IDR", () => {
  const s = claimStatusSummary(CLAIMS)
  assert.deepEqual(
    s.rows.map((r) => [r.status, r.count]),
    [
      ["Outstanding", 2],
      ["Partial Settle", 0],
      ["Settled", 1],
      ["Closed", 0],
      ["Rejected", 1],
    ]
  )
  // USD 100 × kurs tetap report 16.200.
  assert.equal(s.rows[0].estimatedLoss, 10_000_000 + 1_620_000)
  assert.equal(s.rows[0].share, 0.5)
  assert.equal(s.total.count, 4)
  assert.equal(s.total.paidAmount, 40_000_000)
  assert.equal(s.total.adjusterFee, 2_000_000)
})

test("pivot: urut klaim terbanyak, atau mengikuti urutan tahapan Master Data", () => {
  const byCob = claimStatusPivot(CLAIMS, (c) => c.cob)
  assert.deepEqual(
    byCob.map((r) => [r.label, r.counts.Outstanding, r.counts.Settled, r.counts.Rejected, r.total]),
    [
      ["Motor Vehicle", 0, 1, 1, 2],
      ["Property", 2, 0, 0, 2],
    ]
  )
  const byStage = claimStatusPivot(CLAIMS, (c) => c.stage, DATA.stages)
  assert.deepEqual(
    byStage.map((r) => r.label),
    ["Tunggu Dokumen", "Dokumen Lengkap", "SPK / SPGR terbit"]
  )
})

test("daftar klaim urut status, lalu tanggal dasar periode", () => {
  assert.deepEqual(
    sortedClaims(CLAIMS).map((c) => c.claimNo),
    ["C-2", "C-1", "C-3", "C-4"]
  )
})

test("workbook: sheet Ringkasan dan Daftar Klaim seperti register LCH", async () => {
  const wb = new ExcelJS.Workbook()
  fillClaimStatistics(wb, DATA, { start: "2026-11-01", end: "2026-11-30" }, "2026-11-19")
  // Tulis lalu baca ulang, seperti file yang dibuka di Excel.
  const read = new ExcelJS.Workbook()
  await read.xlsx.load(await wb.xlsx.writeBuffer())
  assert.deepEqual(
    read.worksheets.map((ws) => ws.name),
    ["Ringkasan", "Daftar Klaim"]
  )

  const sum = read.getWorksheet("Ringkasan")!
  assert.equal(sum.getCell("A1").value, "STATISTIK KLAIM PER STATUS")
  assert.equal(sum.getCell("A7").value, "Status Klaim")
  assert.deepEqual(
    [sum.getCell("A8").value, sum.getCell("B8").value, sum.getCell("D8").value],
    ["Outstanding", 2, 11_620_000]
  )
  assert.deepEqual([sum.getCell("A13").value, sum.getCell("B13").value], ["Total", 4])
  assert.equal(sum.getCell("A15").value, "Per COB")

  const list = read.getWorksheet("Daftar Klaim")!
  assert.deepEqual(
    [list.getCell("B4").value, list.getCell("B5").value, list.getCell("N4").value, list.getCell("N5").value],
    ["Register No", "No. Registrasi", "DOL", "Tanggal Kejadian"]
  )
  assert.deepEqual(
    [list.getCell("A6").value, list.getCell("B6").value, list.getCell("G6").value, list.getCell("T6").value],
    [1, "C-2", "USD", "Outstanding"]
  )
  // Tanggal tidak bergeser hari walau dibaca di zona waktu mana pun.
  assert.equal((list.getCell("N6").value as Date).toISOString().slice(0, 10), "2026-11-03")
  assert.equal(list.getCell("O6").value, null)
  assert.equal(list.rowCount, 5 + CLAIMS.length)
})
