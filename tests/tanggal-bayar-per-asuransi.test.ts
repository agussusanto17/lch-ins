import assert from "node:assert/strict"
import test from "node:test"
import ExcelJS from "exceljs"

import {
  claimPaymentProgress,
  lodDaysOverdue,
  payingInsurers,
  paymentSpeed,
  paymentSpeedText,
} from "../lib/claim-detail"
import {
  fillClaimStatistics,
  insurerPaymentSpeed,
  type ClaimStatisticsData,
  type ClaimStatRow,
} from "../lib/claim-statistics"
import type { ClaimInsurerShare } from "../lib/data/types"

/**
 * Tanggal bayar klaim per asuransi (Agus, 20 November 2026): co-insurance membayar bagiannya
 * sendiri-sendiri, dan kecepatan bayarnya dihitung dari tanggal LOD ke asuransi.
 */
const share = (
  insurer: string,
  sharePct: number,
  leader = false,
  paidDate: string | null = null
): ClaimInsurerShare => ({ insurerId: insurer, insurer, sharePct, leader, paidDate })

const TODAY = "2026-11-19"

test("kecepatan bayar dihitung dari tanggal LOD, batasnya 30 hari", () => {
  assert.deepEqual(paymentSpeed("2026-11-01", "2026-11-13"), { days: 12, late: 0 })
  assert.deepEqual(paymentSpeed("2026-11-01", "2026-12-01"), { days: 30, late: 0 })
  assert.deepEqual(paymentSpeed("2026-11-01", "2026-12-06"), { days: 35, late: 5 })
  assert.equal(paymentSpeed(null, "2026-12-06"), null)
  assert.equal(paymentSpeed("2026-11-01", null), null)
  assert.equal(paymentSpeedText({ days: 12, late: 0 }), "12 hari sejak LOD")
  assert.equal(
    paymentSpeedText({ days: 35, late: 5 }),
    "35 hari sejak LOD, lewat 5 hari dari batas bayar"
  )
  assert.equal(paymentSpeedText({ days: -2, late: 0 }), "2 hari sebelum tanggal LOD")
})

test("co-insurance lunas setelah semua asuransi membayar", () => {
  const partly = [share("Sinar Mas", 40), share("Astra Buana", 60, true, "2026-10-20"), share("Nol", 0)]
  // Leader lebih dulu; asuransi tanpa share tidak ikut.
  assert.deepEqual(payingInsurers(partly).map((i) => i.insurer), ["Astra Buana", "Sinar Mas"])
  assert.deepEqual(claimPaymentProgress(partly), { total: 2, paid: 1, paidDate: null })
  const all = [share("Astra Buana", 60, true, "2026-10-20"), share("Sinar Mas", 40, false, "2026-11-10")]
  assert.deepEqual(claimPaymentProgress(all), { total: 2, paid: 2, paidDate: "2026-11-10" })
  assert.deepEqual(claimPaymentProgress([]), { total: 0, paid: 0, paidDate: null })

  // LOD 1 Oktober, batas 31 Oktober: lewat 19 hari selama masih ada asuransi yang belum bayar.
  const claim = { lodDate: "2026-10-01", status: "Partial Settle" as const }
  assert.equal(lodDaysOverdue({ ...claim, insurers: partly }, TODAY), 19)
  assert.equal(lodDaysOverdue({ ...claim, insurers: all }, TODAY), 0)
  assert.equal(lodDaysOverdue(claim, TODAY), 19)
})

const row = (patch: Partial<ClaimStatRow>): ClaimStatRow => ({
  claimNo: "CLM-0",
  insuredName: "PT A",
  insurer: "Astra Buana",
  insurers: [],
  policyNo: "P-1",
  cob: "Property",
  currency: "IDR",
  sumInsured: 1_000_000_000,
  estimatedLoss: 0,
  claimedAmount: 0,
  paidAmount: 0,
  adjusterFeeAmount: 0,
  salvageAmount: 0,
  lossDate: "2026-09-01",
  reportedDate: "2026-09-02",
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
  // LOD 1 Oktober: Astra bayar 20 Oktober (19 hari), Sinar Mas 10 November (40 hari, lewat 10).
  row({
    claimNo: "CLM-1",
    lodDate: "2026-10-01",
    status: "Settled",
    insurers: [share("Astra Buana", 60, true, "2026-10-20"), share("Sinar Mas", 40, false, "2026-11-10")],
  }),
  // Astra bayar 25 Oktober (24 hari); Sinar Mas belum bayar padahal batasnya lewat.
  row({
    claimNo: "CLM-2",
    reportedDate: "2026-09-10",
    lodDate: "2026-10-01",
    status: "Partial Settle",
    insurers: [share("Astra Buana", 60, true, "2026-10-25"), share("Sinar Mas", 40)],
  }),
  // Satu asuransi tanpa tanggal LOD: hanya dihitung dari tanggal lapor.
  row({
    claimNo: "CLM-3",
    insurer: "Tugu",
    reportedDate: "2026-10-01",
    status: "Settled",
    insurers: [share("Tugu", 100, true, "2026-10-31")],
  }),
  // Belum dibayar dan batasnya belum lewat: tidak dihitung.
  row({
    claimNo: "CLM-4",
    insurer: "Tugu",
    reportedDate: "2026-11-01",
    lodDate: "2026-11-10",
    insurers: [share("Tugu", 100, true)],
  }),
]

test("kecepatan bayar per asuransi: co-insurance dihitung per asuransi", () => {
  const speed = insurerPaymentSpeed(CLAIMS, TODAY)
  assert.deepEqual(speed.rows, [
    {
      insurer: "Astra Buana",
      paid: 2,
      avgDaysFromReport: 46.5,
      withLod: 2,
      avgDaysFromLod: 21.5,
      fastestDays: 19,
      slowestDays: 24,
      paidLate: 0,
      unpaidOverdue: 0,
    },
    {
      insurer: "Sinar Mas",
      paid: 1,
      avgDaysFromReport: 69,
      withLod: 1,
      avgDaysFromLod: 40,
      fastestDays: 40,
      slowestDays: 40,
      paidLate: 1,
      unpaidOverdue: 1,
    },
    {
      insurer: "Tugu",
      paid: 1,
      avgDaysFromReport: 30,
      withLod: 0,
      avgDaysFromLod: null,
      fastestDays: null,
      slowestDays: null,
      paidLate: 0,
      unpaidOverdue: 0,
    },
  ])
  assert.deepEqual(speed.total, {
    insurer: "Total",
    paid: 4,
    avgDaysFromReport: 48,
    withLod: 3,
    avgDaysFromLod: 27.7,
    fastestDays: 19,
    slowestDays: 40,
    paidLate: 1,
    unpaidOverdue: 1,
  })
})

test("report Statistik Klaim: tabel kecepatan bayar dan kolom tanggal bayar per asuransi", async () => {
  const data: ClaimStatisticsData = {
    claims: CLAIMS,
    statusLabels: {
      Outstanding: "Outstanding",
      "Partial Settle": "Partial Settle",
      Settled: "Settled",
      Closed: "Closed",
      Rejected: "Rejected",
    },
    stages: ["Tunggu Dokumen"],
  }
  const wb = new ExcelJS.Workbook()
  fillClaimStatistics(wb, data, { start: "2026-09-01", end: "2026-11-30" }, TODAY)
  const read = new ExcelJS.Workbook()
  await read.xlsx.load(await wb.xlsx.writeBuffer())

  const sum = read.getWorksheet("Ringkasan")!
  let title = 0
  sum.eachRow((r, n) => {
    if (r.getCell(1).value === "Kecepatan bayar per asuransi") title = n
  })
  assert.ok(title > 0, "judul tabel kecepatan bayar ada")
  const values = (n: number) =>
    Array.from({ length: 9 }, (_, i) => sum.getRow(n).getCell(i + 1).value)
  assert.deepEqual(values(title + 2), [
    "Asuransi",
    "Klaim Dibayar",
    "Rata-rata Hari sejak Lapor",
    "Dibayar dengan Tanggal LOD",
    "Rata-rata Hari sejak LOD",
    "Tercepat sejak LOD (hari)",
    "Terlama sejak LOD (hari)",
    "Dibayar Lewat 30 Hari",
    "Belum Dibayar, Lewat Batas",
  ])
  assert.deepEqual(values(title + 3), ["Astra Buana", 2, 46.5, 2, 21.5, 19, 24, 0, 0])
  assert.deepEqual(values(title + 4), ["Sinar Mas", 1, 69, 1, 40, 40, 40, 1, 1])
  assert.deepEqual(values(title + 5), ["Tugu", 1, 30, 0, null, null, null, 0, 0])
  assert.deepEqual(values(title + 6), ["Total", 4, 48, 3, 27.7, 19, 40, 1, 1])

  // Daftar Klaim: urut status (Outstanding, Partial Settle, Settled), kolom T sesudah Batas Bayar.
  const list = read.getWorksheet("Daftar Klaim")!
  assert.deepEqual(
    [list.getCell("T4").value, list.getCell("T5").value],
    ["Paid Date per Insurer", "Tanggal Bayar per Asuransi"]
  )
  assert.deepEqual(
    [6, 7, 8, 9].map((n) => [list.getCell(`B${n}`).value, list.getCell(`T${n}`).value]),
    [
      ["CLM-4", null],
      ["CLM-2", "Astra Buana: 25 Okt 2026 (24 hari sejak LOD)\nSinar Mas: belum dibayar"],
      [
        "CLM-1",
        "Astra Buana: 20 Okt 2026 (19 hari sejak LOD)\nSinar Mas: 10 Nov 2026 (40 hari sejak LOD, lewat 10 hari dari batas bayar)",
      ],
      ["CLM-3", "Tugu: 31 Okt 2026"],
    ]
  )
})

test("report tanpa tanggal bayar menulis catatan, bukan tabel kosong", async () => {
  const wb = new ExcelJS.Workbook()
  fillClaimStatistics(
    wb,
    {
      claims: [row({ claimNo: "CLM-9" })],
      statusLabels: {
        Outstanding: "Outstanding",
        "Partial Settle": "Partial Settle",
        Settled: "Settled",
        Closed: "Closed",
        Rejected: "Rejected",
      },
      stages: ["Tunggu Dokumen"],
    },
    { start: "2026-09-01", end: "2026-11-30" },
    TODAY
  )
  const sum = wb.getWorksheet("Ringkasan")!
  const texts: unknown[] = []
  sum.eachRow((r) => texts.push(r.getCell(1).value))
  assert.ok(texts.includes("Belum ada tanggal bayar asuransi untuk klaim di periode ini."))
})
