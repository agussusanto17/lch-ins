import assert from "node:assert/strict"
import test from "node:test"

import ExcelJS from "exceljs"

import { brokerageIdr, feeIdr } from "../lib/data/analytics"

import {
  fillProductionRecap,
  RECAP_COLUMNS,
  RECAP_HEADERS,
  RECAP_POLICY_HEADERS,
  recapDate,
  recapObject,
  recapPolicyRows,
  recapRows,
  recapSourceFile,
  spilClass,
  type RecapPolicy,
} from "../lib/production-recap"

function policy(over: Partial<RecapPolicy> = {}): RecapPolicy {
  return {
    policyNo: "018/LCH-PLCMT/CI-MV/XI/2026",
    parentPolicyNo: null,
    slipNo: "018/LCH-PLCMT/PS-MV/XI/2026",
    type: "Baru",
    endorsementSeq: null,
    insuredName: "PT NUSANTARA FLEET SERVICES",
    clientName: "PT Nusantara Fleet Services",
    clientType: "Korporasi",
    clientCodes: {},
    sourceCode: "LCH-ID",
    sourceName: "PT. LCH Insurance Brokers",
    cobCode: "02",
    cobName: "MOTOR VEHICLE",
    coverCode: "0201",
    coverName: "PSKBI",
    periodStart: "2026-11-01",
    periodEnd: "2027-11-01",
    productionDate: "2026-11-01",
    recordedDate: "2026-11-12",
    paidDate: null,
    currency: "IDR",
    premium: 1_000_000,
    brokeragePct: 15,
    remarks: null,
    groupingInsured: null,
    cobOjkClass: null,
    placementLocation: null,
    insurers: [{ insurer: "PT Asuransi Multi Artha Guna Tbk", share: 100, additionalFeePct: 0 }],
    ...over,
  }
}

test("the recap has the 49 headers of the LCH sample, in order, then the MOP rate margin", () => {
  // 49 kolom contoh LCH, lalu dua kolom margin rate deklarasi MOP (Agus, 20 November 2026), kolom
  // Jatuh Tempo Cicilan (Agus, 26 November 2026), dan kolom Cek Dobel (Agus, 22 November 2026).
  assert.equal(RECAP_HEADERS.length, 53)
  assert.equal(RECAP_COLUMNS.length, 53)
  assert.equal(RECAP_HEADERS.at(-1), "Cek Dobel")
  assert.deepEqual(RECAP_HEADERS.slice(0, 5), ["refno", "voucher", "thn", "mth", "insured"])
  assert.equal(RECAP_HEADERS[30], "RM_Fee_OC")
  assert.equal(RECAP_HEADERS[48], "Perusahaan/Perorangan")
  assert.deepEqual(RECAP_HEADERS.slice(49), [
    "Margin_Rate_OC",
    "Margin_Rate",
    "Jatuh Tempo Cicilan",
    "Cek Dobel",
  ])
})

test("dates follow the sample format MM/DD/YYYY", () => {
  assert.equal(recapDate("2025-12-21"), "12/21/2025")
  assert.equal(recapDate(null), "")
})

test("a USD row matches the sample: rupiah from the unrounded original amounts", () => {
  const [row] = recapRows(
    [policy({ currency: "USD", premium: 80_013.96, brokeragePct: 0.15 })],
    { USD: 16_782 }
  )
  assert.equal(row.rate, 16_782)
  assert.equal(row.Premium_Gross_OC, 80_013.96)
  assert.equal(row.Premium_Gross, 1_342_794_276.72)
  assert.equal(row.Premium_Commission_OC, -120.02)
  assert.equal(row.Premium_Commission, -2_014_191.42)
  assert.equal(row["(Income)/Beban"], -2_014_191.42)
  assert.equal(row.Percentage, -0.0015)
})

test("co-insurance gives a COMM row per insurer with its premium share, and an EF row for its fee", () => {
  const rows = recapRows([
    policy({
      insurers: [
        { insurer: "PT Asuransi Astra Buana", share: 60, additionalFeePct: 12.5 },
        { insurer: "PT Asuransi Sinar Mas", share: 40, additionalFeePct: 10 },
      ],
    }),
  ])
  // Catatan Team LCH (20 November 2026): satu sub akun pnl per baris; premi hanya di baris COMM.
  assert.deepEqual(
    rows.map((r) => [
      r.asuransi,
      r["akun pnl"],
      r["sub akun pnl"],
      r.Premium_Gross,
      r.Premium_Commission,
      r.RM_Fee,
      r["(Income)/Beban"],
      r.Percentage,
    ]),
    [
      ["PT Asuransi Astra Buana", "INCOME", "COMM", 600_000, -90_000, 0, -90_000, -0.15],
      ["PT Asuransi Astra Buana", "INCOME", "EF", 0, 0, -75_000, -75_000, -0.125],
      ["PT Asuransi Sinar Mas", "INCOME", "COMM", 400_000, -60_000, 0, -60_000, -0.15],
      ["PT Asuransi Sinar Mas", "INCOME", "EF", 0, 0, -40_000, -40_000, -0.1],
    ]
  )
  // Total kolom sama dengan sebelum baris dipecah.
  const total = (key: "Premium_Gross" | "(Income)/Beban") =>
    rows.reduce((sum, r) => sum + Number(r[key]), 0)
  assert.equal(total("Premium_Gross"), 1_000_000)
  assert.equal(total("(Income)/Beban"), -265_000)
  assert.equal(rows[0].cob, "02 - MOTOR VEHICLE")
  assert.equal(rows[0].toc, "0201 - PSKBI")
  assert.equal(rows[0].tipe, "NEW")
  assert.equal(rows[0].source, "LCH-ID - PT. LCH Insurance Brokers")
  assert.equal(rows[0]["Perusahaan/Perorangan"], "Perusahaan")
  assert.equal(rows[0].thn, 2026)
  assert.equal(rows[0].mth, 11)
})

test("the insured column uses the client code of each insurer when Marketing has it", () => {
  const rows = recapRows([
    policy({
      clientName: "BUANA LINTAS LAUTAN TBK",
      clientCodes: { "PT Asuransi Multi Artha Guna Tbk": "D45BL00001" },
    }),
  ])
  assert.equal(rows[0].insured, "D45BL00001 - BUANA LINTAS LAUTAN TBK")
  assert.equal(rows[0]["Insured Name"], "D45BL00001 - BUANA LINTAS LAUTAN TBK")
  assert.equal(rows[0]["Grouping Insured"], "BUANA LINTAS LAUTAN TBK")
})

test("an endorsement row carries the parent policy number, sequence, and parent period", () => {
  const [row] = recapRows([
    policy({
      type: "Endorsement",
      policyNo: "019/LCH-PLCMT/ES-MV/XI/2026",
      parentPolicyNo: "45020125022398",
      endorsementSeq: 5,
      periodStart: "2025-05-01",
      periodEnd: "2026-04-30",
      productionDate: "2026-01-06",
      remarks: "Additional accessories",
    }),
  ])
  assert.equal(row.tipe, "ENDORSE")
  assert.equal(row.policyno, "45020125022398")
  assert.equal(row.CERTIFICATENO, "019/LCH-PLCMT/ES-MV/XI/2026")
  assert.equal(row.eseqno, 5)
  assert.equal(row.sdate, "05/01/2025")
  assert.equal(row.edate, "04/30/2026")
  assert.equal(row.mth, 1)
  assert.equal(row.Note, "Additional accessories")
})

test("an MOP declaration is a NEW row under the MOP policy number with its own certificate", () => {
  const rows = recapRows([
    policy({
      type: "Baru",
      policyNo: "007/LCH-PLCMT/CI-MOP/XI/2026",
      openCoverMaster: true,
      premium: 0,
    }),
    policy({
      type: "Deklarasi",
      policyNo: "CERT/MOP/0001",
      parentPolicyNo: "007/LCH-PLCMT/CI-MOP/XI/2026",
      premium: 750_000,
      productionDate: "2026-12-05",
    }),
  ])
  // Polis MOP tanpa premi deposit tidak punya produksi, jadi hanya deklarasinya yang tertulis.
  assert.equal(rows.length, 1)
  assert.equal(rows[0].tipe, "NEW")
  assert.equal(rows[0].policyno, "007/LCH-PLCMT/CI-MOP/XI/2026")
  assert.equal(rows[0].CERTIFICATENO, "CERT/MOP/0001")
  assert.equal(rows[0].eseqno, 0)
  assert.equal(rows[0].mth, 12)
})

test("an MOP policy with a deposit premium stays in the recap", () => {
  const rows = recapRows([
    policy({ type: "Baru", openCoverMaster: true, premium: 5_000_000 }),
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].CERTIFICATENO, "")
})

test("a cancellation refund reverses income, so commission and fee turn positive", () => {
  const [commission, fee] = recapRows([
    policy({
      type: "Cancellation",
      premium: -200_000,
      insurers: [{ insurer: "PT Asuransi Astra Buana", share: 100, additionalFeePct: 15 }],
    }),
  ])
  assert.equal(commission.tipe, "CANCEL")
  assert.equal(commission.Premium_Gross, -200_000)
  assert.equal(commission.Premium_Commission, 30_000)
  assert.equal(fee.tipe, "CANCEL")
  assert.equal(fee.RM_Fee, 30_000)
  assert.equal(fee["akun pnl"], "INCOME")
})

test("the EF row uses the insurer's Sub akun EF from master data, EF when unset", () => {
  const rows = recapRows([
    policy({
      insurers: [
        {
          insurer: "PT Asuransi Multi Artha Guna Tbk",
          share: 60,
          additionalFeePct: 15,
          feeSubAccount: "EF (MAG)",
        },
        { insurer: "PT Asuransi Astra Buana", share: 25, additionalFeePct: 10, feeSubAccount: "DLL" },
        { insurer: "PT Asuransi Sinar Mas", share: 15, additionalFeePct: 10, feeSubAccount: null },
      ],
    }),
  ])
  // Nama asuransi tidak lagi menentukan; sub akunnya diatur di Master Data (22 November 2026).
  assert.deepEqual(
    rows.map((r) => [r.asuransi, r["sub akun pnl"]]),
    [
      ["PT Asuransi Multi Artha Guna Tbk", "COMM"],
      ["PT Asuransi Multi Artha Guna Tbk", "EF (MAG)"],
      ["PT Asuransi Astra Buana", "COMM"],
      ["PT Asuransi Astra Buana", "DLL"],
      ["PT Asuransi Sinar Mas", "COMM"],
      ["PT Asuransi Sinar Mas", "EF"],
    ]
  )
})

test("a policy without fee or margin keeps one COMM row", () => {
  const rows = recapRows([policy()])
  assert.equal(rows.length, 1)
  assert.equal(rows[0]["sub akun pnl"], "COMM")
  assert.equal(rows[0]["sub akun comm exp"], "")
})

test("Grouping Insured falls back to the client or insured name when it is empty", () => {
  const [blank] = recapRows([policy({ groupingInsured: "  " })])
  assert.equal(blank["Grouping Insured"], "PT Nusantara Fleet Services")
  const [named] = recapRows([policy({ groupingInsured: "D BEST GROUP" })])
  assert.equal(named["Grouping Insured"], "D BEST GROUP")
  const [noClient] = recapRows([policy({ groupingInsured: "", clientName: null })])
  assert.equal(noClient["Grouping Insured"], "PT NUSANTARA FLEET SERVICES")
})

test("spil/non spil follows the client's SPIL Program flag, not the name", () => {
  assert.equal(spilClass({ spilProgram: true }), "SPIL")
  assert.equal(spilClass({ spilProgram: false }), "Non SPIL")
  assert.equal(spilClass({}), "Non SPIL")
  // Tidak ada daftar resmi SPIL; LCH menandai kliennya sendiri (22 November 2026).
  const [named] = recapRows([policy({ groupingInsured: "SPIL Warehouse" })])
  assert.equal(named["spil/non spil"], "Non SPIL")
  const [flagged] = recapRows([policy({ spilProgram: true })])
  assert.equal(flagged["spil/non spil"], "SPIL")
})

test("source file is the module the policy came from", () => {
  assert.equal(recapSourceFile({ type: "Baru", slipNo: "018/LCH-PLCMT/PS-MV/XI/2026" }), "Placement")
  assert.equal(recapSourceFile({ type: "Endorsement", slipNo: null }), "Policy Database")
  assert.equal(recapSourceFile({ type: "Deklarasi", slipNo: "011/LCH-PLCMT/PS-MOP/XI/2026" }), "Deklarasi MOP")
})

test("Object lists the slip interests, or the risk location when there are none", () => {
  assert.equal(
    recapObject(["Toyota Avanza 1.3 G  B 1234 XYZ", "Honda Brio B 5678 ABC", "Toyota Avanza 1.3 G  B 1234 XYZ"], "Jl. Nanas"),
    "Toyota Avanza 1.3 G B 1234 XYZ; Honda Brio B 5678 ABC"
  )
  assert.equal(
    recapObject([], "1. Gudang Bekasi, Jl. Raya Industri No. 5\n2. Kantor, Jl. Sudirman"),
    "1. Gudang Bekasi, Jl. Raya Industri No. 5; 2. Kantor, Jl. Sudirman"
  )
  assert.equal(recapObject([], null), "")
  assert.equal(recapObject(["x".repeat(300)], null).length, 250)
  const [row] = recapRows([policy({ object: "Honda Brio B 5678 ABC" })])
  assert.equal(row.Object, "Honda Brio B 5678 ABC")
})

test("Percentage is formatted as a percent like the LCH sample", () => {
  const column = RECAP_COLUMNS.find((c) => c.header === "Percentage")
  assert.equal(column?.numFmt, "0.00%")
})

test("Per Polis sheet: one row per policy per insurer with a value column per sub account", () => {
  const rows = recapPolicyRows([
    policy({
      premium: 1_000_000,
      discount: 100_000,
      // Margin deklarasi: premi tagihan ke klien − premi ke asuransi = 150.000.
      clientPremium: 1_150_000,
      insurers: [
        { insurer: "PT Asuransi Multi Artha Guna Tbk", share: 60, additionalFeePct: 10 },
        { insurer: "PT Asuransi Sinar Mas", share: 40, additionalFeePct: 0 },
      ],
    }),
  ])
  assert.equal(rows.length, 2)
  assert.deepEqual(
    [
      rows[0].Premium_Gross_IDR,
      rows[0].Premium_Discount_IDR,
      rows[0].Commission_IDR,
      rows[0].EF_IDR,
      rows[0]["O/I-MARGIN_IDR"],
      rows[0]["MARKETING-CASHBACK_IDR"],
      rows[0]["(Income)/Beban"],
    ],
    [600_000, -60_000, -90_000, -60_000, -90_000, 0, -240_000]
  )
  assert.equal(rows[1].EF_IDR, 0)
  assert.deepEqual(RECAP_POLICY_HEADERS.slice(17, 21), [
    "Premium_Gross_OC",
    "Premium_Gross_IDR",
    "Premium_Discount_OC",
    "Premium_Discount_IDR",
  ])
  assert.ok(RECAP_POLICY_HEADERS.includes("EXPENSE-COMMISIONS_IDR"))
  assert.deepEqual(RECAP_POLICY_HEADERS.slice(-2), ["(Income)/Beban", "Cek Dobel"])
})

test("the recap workbook has the LCH sheet, the Per Polis sheet, and notes", () => {
  const wb = new ExcelJS.Workbook()
  fillProductionRecap(
    wb,
    [
      policy({
        insurers: [
          {
            insurer: "PT Asuransi Multi Artha Guna Tbk",
            share: 100,
            additionalFeePct: 15,
            feeSubAccount: "EF (MAG)",
          },
        ],
      }),
    ],
    { start: "2026-11-01", end: "2026-11-30" },
    "2026-11-21"
  )
  assert.deepEqual(
    wb.worksheets.map((ws) => ws.name),
    ["Rekap Produksi", "Per Polis", "Keterangan"]
  )
  const recap = wb.getWorksheet("Rekap Produksi")!
  // Header + baris COMM + baris EF (MAG).
  assert.equal(recap.rowCount, 3)
  assert.equal(recap.getRow(1).getCell(37).value, "akun pnl")
  assert.equal(recap.getRow(3).getCell(38).value, "EF (MAG)")
  assert.equal(wb.getWorksheet("Per Polis")!.rowCount, 2)
})

test("sharing komisi ke LCH Singapore: baris EXPENSE / COMM EXPENSE dan kolom Per Polis", () => {
  // Brokerage 15% dari premi 1.000.000 = 150.000; 40% di-sharing ke LCH Singapore = 60.000
  // (Agus, 22 November 2026).
  const p = policy({ commissionShareSgPct: 40 })
  const rows = recapRows([p])
  assert.deepEqual(
    rows.map((r) => [r["akun pnl"], r["sub akun pnl"], r["sub akun comm exp"], r["(Income)/Beban"]]),
    [
      ["INCOME", "COMM", "", -150_000],
      ["EXPENSE", "COMM EXPENSE", "LCH Insurance Brokers Pte Ltd", 60_000],
    ]
  )
  assert.equal(rows[1].Premium_Gross_OC, 0)
  assert.equal(rows[1].Percentage, 0.06)

  const [perPolis] = recapPolicyRows([p])
  assert.equal(perPolis["EXPENSE-COMMISIONS_OC"], 60_000)
  assert.equal(perPolis["EXPENSE-COMMISIONS_IDR"], 60_000)
  assert.equal(perPolis["(Income)/Beban"], -90_000)

  // Tanpa sharing: tidak ada baris beban.
  assert.deepEqual(recapRows([policy()]).map((r) => r["akun pnl"]), ["INCOME"])

  // Brokerage incl. VAT: sharing dari brokerage sebelum PPN (150.000 ÷ 1,022 × 40% = 58.708,41).
  const incl = recapRows([policy({ commissionShareSgPct: 40, includeVat: true })])
  assert.equal(incl[1]["(Income)/Beban"], 58_708.41)
})

test("Cek Dobel: polis yang kemungkinan dobel tetap ditulis, diberi tanda dan warna", () => {
  // Polis sementara dari CI yang juga diinput manual dengan nomor asuransi (Agus, 22 November 2026).
  const auto = policy()
  const manual = policy({ policyNo: "45020126000123", slipNo: null })
  const other = policy({ policyNo: "MV/2026/0002", insuredName: "PT LAIN" })
  const rows = recapRows([auto, manual, other])
  // Datanya tetap ditulis semua.
  assert.equal(rows.length, 3)
  assert.deepEqual(
    rows.map((r) => r["Cek Dobel"]),
    [
      "DOBEL? isi sama dengan 45020126000123",
      "DOBEL? isi sama dengan 018/LCH-PLCMT/CI-MV/XI/2026",
      "",
    ]
  )
  assert.equal(recapPolicyRows([auto, manual, other])[0]["Cek Dobel"], rows[0]["Cek Dobel"])

  const wb = new ExcelJS.Workbook()
  fillProductionRecap(wb, [auto, manual, other], { start: "2026-11-01", end: "2026-11-30" }, "2026-11-22")
  const sheet = wb.getWorksheet("Rekap Produksi")!
  const fill = (n: number) => (sheet.getRow(n).getCell(1).fill as { fgColor?: { argb?: string } })?.fgColor?.argb
  assert.equal(fill(2), "FFFCE4D6")
  assert.equal(fill(3), "FFFCE4D6")
  assert.equal(fill(4), undefined)
})

test("brokerage dan EF incl. VAT ditulis sebelum PPN, sama dengan placing", () => {
  // Brokerage 15% incl. VAT = 14,6771% (÷ 1,022); EF 10% incl. VAT = 9,78% (× 97,8%, sheet TARIF EF).
  const [comm, ef] = recapRows([
    policy({
      includeVat: true,
      insurers: [
        { insurer: "PT Asuransi Multi Artha Guna Tbk", share: 100, additionalFeePct: 10, additionalFeeIncludeVat: true },
      ],
    }),
  ])
  assert.equal(comm.Premium_Commission_OC, -146_771.04)
  assert.equal(comm["(Income)/Beban"], -146_771.04)
  assert.equal(Math.round((comm.Percentage as number) * 1e6) / 1e6, -0.146771)
  assert.equal(ef.RM_Fee_OC, -97_800)
  // Excl. VAT tetap persen slip.
  const [plain] = recapRows([policy()])
  assert.equal(plain.Premium_Commission_OC, -150_000)
})

test("Report Operational: brokerage dan fee IDR sebelum PPN", () => {
  const p = {
    premium: 10_000_000,
    currency: "IDR",
    brokeragePct: 15,
    includeVat: true,
    additionalFee: 1_000_000,
    insurers: [{ share: 100, additionalFeePct: 10, additionalFeeIncludeVat: true }],
  }
  assert.equal(Math.round(brokerageIdr(p) * 100) / 100, 1_467_710.37)
  assert.equal(Math.round(feeIdr(p) * 100) / 100, 978_000)
  assert.equal(brokerageIdr({ ...p, includeVat: false }), 1_500_000)
})

test("premi installment: satu baris per cicilan, nilai dibagi sesuai persen", () => {
  // Premi 1.000.000, brokerage 15%, 3 cicilan 33,33% / 33,33% / 33,34% (Agus, 26 November 2026).
  const p = policy({
    premiumInstallments: [
      { no: 1, dueDate: "2026-11-01", pct: 33.33 },
      { no: 2, dueDate: "2027-03-01", pct: 33.33 },
      { no: 3, dueDate: "2027-07-01", pct: 33.34 },
    ],
  })
  const rows = recapRows([p])
  assert.deepEqual(
    rows.map((r) => [
      r.Instl,
      r["Jatuh Tempo Cicilan"],
      r.Premium_Gross_OC,
      r.Premium_Commission,
      r["(Income)/Beban"],
    ]),
    [
      [1, "11/01/2026", 333_300, -49_995, -49_995],
      [2, "03/01/2027", 333_300, -49_995, -49_995],
      // Cicilan terakhir menampung pembulatan: jumlahnya tepat premi dan komisi polis.
      [3, "07/01/2027", 333_400, -50_010, -50_010],
    ]
  )
  assert.equal(
    rows.reduce((s, r) => s + (r.Premium_Gross_OC as number), 0),
    1_000_000
  )
  // Polis tanpa installment tetap satu baris, Instl 0.
  assert.deepEqual(
    recapRows([policy()]).map((r) => [r.Instl, r["Jatuh Tempo Cicilan"]]),
    [[0, ""]]
  )
  // Sheet Per Polis tetap satu baris per polis per asuransi.
  assert.equal(recapPolicyRows([p]).length, 1)
})

