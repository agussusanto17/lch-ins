import assert from "node:assert/strict"
import test from "node:test"
import ExcelJS from "exceljs"

import {
  accountLossRatio,
  fillAccountLossRatio,
  fillInsurerCobLossRatio,
  insurerCobLossRatio,
  lossRatioAccounts,
  netPremium,
  type LossRatioReportData,
  type LrPolicy,
} from "../lib/loss-ratio-report"
import { fillOjkProduction, ojkProduction, OJK_MISSING, quarterLabel } from "../lib/ojk-production"
import type { RecapPolicy } from "../lib/production-recap"
import { defaultReportPeriod } from "../lib/report-catalog"

/** Template report Team LCH (20 November 2026): Form LR 01/02 OJK, COB.pdf MAG, LOSS RATIO DBEST. */

const recap = (over: Partial<RecapPolicy>): RecapPolicy => ({
  policyNo: "P-1",
  parentPolicyNo: null,
  slipNo: null,
  type: "Baru",
  endorsementSeq: null,
  insuredName: "PT A",
  clientName: null,
  clientType: null,
  clientCodes: {},
  sourceCode: null,
  sourceName: null,
  cobCode: "01",
  cobName: "PROPERTY",
  coverCode: null,
  coverName: null,
  periodStart: "2026-07-01",
  periodEnd: "2027-07-01",
  productionDate: "2026-07-01",
  recordedDate: "2026-07-01",
  paidDate: null,
  currency: "IDR",
  premium: 10_000_000,
  brokeragePct: 15,
  remarks: null,
  groupingInsured: null,
  cobOjkClass: "Aneka",
  placementLocation: "Dalam Negeri",
  insurers: [
    { insurer: "MAG", share: 60, additionalFeePct: 10 },
    { insurer: "LIPPO", share: 40, additionalFeePct: 0 },
  ],
  ...over,
})

const OJK_POLICIES: RecapPolicy[] = [
  recap({}),
  // Endorsement polis yang sama: menambah premi, bukan jumlah polis.
  recap({ policyNo: "P-1/E1", type: "Endorsement", premium: 1_000_000 }),
  recap({
    policyNo: "P-2",
    cobOjkClass: "Rangka Kapal",
    placementLocation: "Luar Negeri",
    currency: "USD",
    premium: 1_000,
    brokeragePct: 20,
    insurers: [{ insurer: "MAG", share: 100, additionalFeePct: 0 }],
  }),
  recap({ policyNo: "P-3", cobOjkClass: null, premium: 0, insurers: [] }),
]

test("LR 01: per lini usaha dan lokasi; pendapatan = brokerage + EF", () => {
  const data = ojkProduction(OJK_POLICIES, { IDR: 1, USD: 16_200 })
  assert.deepEqual(
    data.lr01.map((r) => [r.line, r.location, r.policyCount, r.premium, r.income]),
    [
      // 15% × 11 jt + EF MAG 10% × (60% × 11 jt).
      ["Aneka", "Dalam Negeri", 1, 11_000_000, 2_310_000],
      ["Rangka Kapal", "Luar Negeri", 1, 16_200_000, 3_240_000],
      [OJK_MISSING, "Dalam Negeri", 1, 0, 0],
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0]), "id"))
  )
  assert.deepEqual(data.missing, ["P-3"])
})

test("LR 02: per penanggung sesuai share", () => {
  const data = ojkProduction(OJK_POLICIES, { IDR: 1, USD: 16_200 })
  const row = (insurer: string, line: string) =>
    data.lr02.find((r) => r.insurer === insurer && r.line === line)
  assert.deepEqual(
    [row("MAG", "Aneka")?.policyCount, row("MAG", "Aneka")?.premium, row("MAG", "Aneka")?.income],
    [1, 6_600_000, 1_650_000]
  )
  assert.deepEqual([row("LIPPO", "Aneka")?.premium, row("LIPPO", "Aneka")?.income], [4_400_000, 660_000])
  assert.deepEqual([row("MAG", "Rangka Kapal")?.premium, row("MAG", "Rangka Kapal")?.income], [16_200_000, 3_240_000])
})

test("periode triwulan: label LKTW dan periode awal dialog", () => {
  assert.equal(quarterLabel("2026-07-01", "2026-09-30"), "LKTW III 2026")
  assert.equal(quarterLabel("2026-01-01", "2026-03-31"), "LKTW I 2026")
  assert.equal(quarterLabel("2026-07-01", "2026-09-29"), null)
  assert.deepEqual(defaultReportPeriod("2026-11-21", "quarter"), { start: "2026-10-01", end: "2026-12-31" })
  assert.deepEqual(defaultReportPeriod("2026-11-21"), { start: "2026-11-01", end: "2026-11-30" })
  assert.deepEqual(defaultReportPeriod("2026-11-21", "years"), { start: "2021-01-01", end: "2026-11-21" })
})

test("workbook OJK: sheet LR 01, LR 02, dan Rincian", async () => {
  const wb = new ExcelJS.Workbook()
  fillOjkProduction(wb, OJK_POLICIES, { start: "2026-07-01", end: "2026-09-30" }, "2026-11-21", { IDR: 1, USD: 16_200 })
  const read = new ExcelJS.Workbook()
  await read.xlsx.load(await wb.xlsx.writeBuffer())
  assert.deepEqual(read.worksheets.map((w) => w.name), ["LR 01", "LR 02", "Rincian"])
  const lr01 = read.getWorksheet("LR 01")!
  assert.equal(lr01.getCell("A1").value, "LKTW III 2026")
  assert.deepEqual(
    ["A6", "B6", "C6", "D6", "E6"].map((c) => lr01.getCell(c).value),
    ["Lini Usaha", "Jumlah Polis", "Lokasi Penempatan", "Premi", "Pendapatan Jasa Keperantaraan"]
  )
  const lr02 = read.getWorksheet("LR 02")!
  assert.equal(lr02.getCell("A6").value, "Penanggung")
})

// Loss ratio

const policy = (over: Partial<LrPolicy>): LrPolicy => ({
  id: "p1",
  rootId: "p1",
  yearStart: "2024-07-01",
  policyNo: "P1",
  type: "Baru",
  cobCode: "01",
  cob: "PROPERTY",
  account: "D BEST GROUP",
  currency: "IDR",
  premium: 100_000_000,
  discount: 0,
  brokeragePct: 15,
  insurers: [
    { insurer: "MAG", share: 60, additionalFeePct: 20 },
    { insurer: "LIPPO", share: 40, additionalFeePct: 30 },
  ],
  ...over,
})

const DATA: LossRatioReportData = {
  policies: [
    policy({}),
    policy({ id: "p2", rootId: "p1", policyNo: "P1/E1", type: "Endorsement", premium: 10_000_000 }),
    policy({
      id: "p3",
      rootId: "p3",
      yearStart: "2025-07-01",
      policyNo: "P3",
      type: "Renewal",
      premium: 120_000_000,
      insurers: [
        { insurer: "MAG", share: 50, additionalFeePct: 20 },
        { insurer: "LIPPO", share: 50, additionalFeePct: 30 },
      ],
    }),
    policy({
      id: "p4",
      rootId: "p4",
      yearStart: "2025-03-01",
      policyNo: "P4",
      cobCode: "02",
      cob: "MOTOR VEHICLE",
      account: "SPIL",
      premium: 50_000_000,
      brokeragePct: 25,
      insurers: [{ insurer: "MAG", share: 100, additionalFeePct: 0 }],
    }),
  ],
  claims: [
    // 30 jt + adjuster fee 1 jt = 31 jt.
    { id: "c1", claimNo: "C1", rootId: "p1", status: "Settled", paidAmount: 30_000_000, adjusterFeeAmount: 1_000_000, salvageAmount: 0, currency: "IDR" },
    { id: "c2", claimNo: "C2", rootId: "p3", status: "Rejected", paidAmount: 10_000_000, adjusterFeeAmount: 0, salvageAmount: 0, currency: "IDR" },
    { id: "c3", claimNo: "C3", rootId: "p4", status: "Outstanding", paidAmount: 20_000_000, adjusterFeeAmount: 0, salvageAmount: 0, currency: "IDR" },
  ],
}

test("loss ratio per asuransi: per COB per tahun, seperti laporan MAG", () => {
  const [mag] = insurerCobLossRatio(DATA, "MAG")
  assert.equal(mag.insurer, "MAG")
  const property = mag.cobs.find((c) => c.cob === "PROPERTY")!
  assert.deepEqual(
    property.years.map((y) => [y.year, y.gross, netPremium(y), y.claim, y.topClaimAccount]),
    [
      // 110 jt × 60% = 66 jt; net = 66 − BF 9,9 − EF 13,2 = 42,9 jt; klaim 31 jt × 60%.
      ["2024", 66_000_000, 42_900_000, 18_600_000, "D BEST GROUP"],
      // Klaim Rejected tidak dihitung.
      ["2025", 60_000_000, 39_000_000, 0, null],
    ]
  )
  const motor = mag.cobs.find((c) => c.cob === "MOTOR VEHICLE")!
  assert.deepEqual(motor.years.map((y) => [y.year, y.gross, netPremium(y), y.claim]), [["2025", 50_000_000, 37_500_000, 20_000_000]])
  assert.deepEqual(
    mag.all.years.map((y) => [y.year, y.gross, netPremium(y), y.claim]),
    [
      ["2024", 66_000_000, 42_900_000, 18_600_000],
      ["2025", 110_000_000, 76_500_000, 20_000_000],
    ]
  )
  assert.deepEqual(insurerCobLossRatio(DATA).map((r) => r.insurer), ["LIPPO", "MAG"])
})

test("loss ratio akun per asuransi: per tahun polis, terbaru dulu, dengan share efektif", () => {
  const r = accountLossRatio(DATA, "D BEST GROUP")
  assert.deepEqual(r.years.map((y) => y.label), ["2025-2026", "2024-2025"])
  const y2024 = r.years[1]
  assert.deepEqual(
    y2024.insurers.map((i) => [i.insurer, i.share, i.gross, i.brokerage, i.fee, netPremium(i), i.claim]),
    [
      ["MAG", 0.6, 66_000_000, 9_900_000, 13_200_000, 42_900_000, 18_600_000],
      ["LIPPO", 0.4, 44_000_000, 6_600_000, 13_200_000, 24_200_000, 12_400_000],
    ]
  )
  assert.equal(r.total.gross, 230_000_000)
  assert.equal(r.total.claim, 31_000_000)
  assert.deepEqual(r.insurers.map((i) => i.insurer), ["MAG", "LIPPO"])
  assert.deepEqual(lossRatioAccounts(DATA), ["D BEST GROUP", "SPIL"])
})

test("workbook loss ratio: sheet per asuransi dan sheet akun", async () => {
  const wb = new ExcelJS.Workbook()
  fillInsurerCobLossRatio(wb, insurerCobLossRatio(DATA), { start: "2021-01-01", end: "2026-10-31" }, "2026-11-21")
  fillAccountLossRatio(wb, accountLossRatio(DATA, "D BEST GROUP"), { start: "2021-01-01", end: "2026-10-31" }, "2026-11-21")
  const read = new ExcelJS.Workbook()
  await read.xlsx.load(await wb.xlsx.writeBuffer())
  // Sheet MAG dan LIPPO kedua (akun) diberi akhiran supaya unik.
  assert.deepEqual(read.worksheets.map((w) => w.name), ["LIPPO", "MAG", "Per Tahun", "Gabungan", "MAG (2)", "LIPPO (2)"])
  const mag = read.getWorksheet("MAG")!
  assert.equal(mag.getCell("A1").value, "MAG")
  assert.equal(mag.getCell("A6").value, "PROPERTY")
  assert.deepEqual(
    ["A7", "B7", "C7", "D7", "E7", "F7"].map((c) => mag.getCell(c).value),
    ["Tahun", "Sum of Gross Premium", "Sum of Net Premium", "Sum of Claim", "Ratio Base on Gross Premium", "Ratio Base on Net Premium"]
  )
  assert.deepEqual([mag.getCell("A8").value, mag.getCell("B8").value, mag.getCell("D8").value], ["2024", 66_000_000, 18_600_000])
  const perYear = read.getWorksheet("Per Tahun")!
  assert.equal(perYear.getCell("A6").value, "TOTAL 2025-2026")
})
