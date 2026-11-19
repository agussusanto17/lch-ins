import assert from "node:assert/strict"
import test from "node:test"
import ExcelJS from "exceljs"

import { LOD_PAYMENT_DAYS, lodDaysOverdue, lodPaymentDueDate } from "../lib/claim-detail"
import {
  fillClaimStatistics,
  type ClaimStatisticsData,
  type ClaimStatRow,
} from "../lib/claim-statistics"

test("batas bayar asuransi = tanggal LOD dikirim + 30 hari kalender", () => {
  assert.equal(LOD_PAYMENT_DAYS, 30)
  assert.equal(lodPaymentDueDate("2026-11-19"), "2026-12-19")
  // Lintas tahun dan tahun kabisat tetap dihitung per hari kalender.
  assert.equal(lodPaymentDueDate("2026-12-15"), "2027-01-14")
  assert.equal(lodPaymentDueDate("2028-02-10"), "2028-03-11")
  assert.equal(lodPaymentDueDate(null), null)
  assert.equal(lodPaymentDueDate(undefined), null)
})

test("lewat batas bayar hanya untuk klaim berjalan yang batasnya sudah lewat", () => {
  const today = "2026-11-19"
  // LOD 1 Oktober → batas 31 Oktober → lewat 19 hari.
  assert.equal(lodDaysOverdue({ lodDate: "2026-10-01", status: "Outstanding" }, today), 19)
  assert.equal(lodDaysOverdue({ lodDate: "2026-10-01", status: "Partial Settle" }, today), 19)
  for (const status of ["Settled", "Closed", "Rejected"] as const) {
    assert.equal(lodDaysOverdue({ lodDate: "2026-10-01", status }, today), 0)
  }
  // Batas jatuh hari ini belum dihitung lewat.
  assert.equal(lodDaysOverdue({ lodDate: "2026-10-20", status: "Outstanding" }, today), 0)
  assert.equal(lodDaysOverdue({ lodDate: "2026-11-10", status: "Outstanding" }, today), 0)
  assert.equal(lodDaysOverdue({ lodDate: null, status: "Outstanding" }, today), 0)
})

test("report Statistik Klaim: kolom Tanggal LOD dan Batas Bayar Asuransi setelah SPK/SPGR", async () => {
  const row: ClaimStatRow = {
    claimNo: "CLM-1",
    insuredName: "PT A",
    insurer: "PT Asuransi X",
    policyNo: "P-1",
    cob: "Property",
    currency: "IDR",
    sumInsured: 1_000_000_000,
    estimatedLoss: 0,
    claimedAmount: 0,
    paidAmount: 8_820_000,
    adjusterFeeAmount: 0,
    salvageAmount: 0,
    lossDate: "2026-09-01",
    reportedDate: "2026-09-02",
    documentCompleteDate: "2026-10-28",
    spkDate: "2026-11-02",
    lodDate: "2026-11-05",
    status: "Partial Settle",
    stage: "SPK / SPGR terbit",
    adjuster: "",
    lossDescription: "",
    notes: "",
    lastFollowup: null,
  }
  const data: ClaimStatisticsData = {
    claims: [row, { ...row, claimNo: "CLM-2", lodDate: null }],
    statusLabels: {
      Outstanding: "Outstanding",
      "Partial Settle": "Partial Settle",
      Settled: "Settled",
      Closed: "Closed",
      Rejected: "Rejected",
    },
    stages: ["SPK / SPGR terbit"],
  }
  const wb = new ExcelJS.Workbook()
  fillClaimStatistics(wb, data, { start: "2026-09-01", end: "2026-11-30" }, "2026-11-19")
  const read = new ExcelJS.Workbook()
  await read.xlsx.load(await wb.xlsx.writeBuffer())
  const list = read.getWorksheet("Daftar Klaim")!
  const cells = (row: number) => ["Q", "R", "S", "T"].map((col) => list.getCell(`${col}${row}`).value)
  assert.deepEqual(cells(4), ["Date SPK / SPGR", "Date LOD to Insurer", "Payment Due", "Status"])
  assert.deepEqual(cells(5), [
    "Tanggal Terbit SPK/SPGR",
    "Tanggal LOD ke Asuransi",
    "Batas Bayar Asuransi",
    "Status Klaim",
  ])
  const iso = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : value)
  assert.deepEqual(cells(6).map(iso), ["2026-11-02", "2026-11-05", "2026-12-05", "Partial Settle"])
  assert.deepEqual(cells(7).map(iso), ["2026-11-02", null, null, "Partial Settle"])
})
