/**
 * Rekap produksi format `documents/Contoh Format Rekap Produksi.xlsx` (Harry, 19 Oktober 2026):
 * satu baris per polis per asuransi per unsur pendapatan, nilai OC dan Rupiah, pendapatan ditulis
 * negatif. Kolom akun pnl, sub akun pnl, spil/non spil, source file, dan Object mengikuti catatan
 * Team LCH di rekap produksi 19 November (dikirim 20 November 2026).
 */

import type { Workbook } from "exceljs"

import {
  BROKERAGE_VAT_RATE,
  beforeVat,
  feeBeforeVat,
  FX,
  magCommissionVat,
  roundCents,
} from "@/lib/calc"
import { addExportSheet, type ExportColumn } from "@/lib/export"
import { duplicateFlags } from "@/lib/production-duplicates"
import { dateShort } from "@/lib/format"
import type { PolicyType } from "@/lib/data/types"

/** Data polis yang dibutuhkan rekap, disiapkan server. */
export interface RecapPolicy {
  policyNo: string
  /** Polis induk untuk endorsement, pembatalan, dan deklarasi MOP. */
  parentPolicyNo: string | null
  /**
   * Polis induk MOP. Tanpa premi deposit tidak ada produksinya, jadi tidak ditulis;
   * produksinya datang dari baris deklarasi.
   */
  openCoverMaster?: boolean
  slipNo: string | null
  type: PolicyType
  endorsementSeq: number | null
  insuredName: string
  clientName: string | null
  /** Nama tipe klien dari master: Korporasi atau Perorangan. */
  clientType: string | null
  /** Kode klien per nama asuransi, dari Marketing. */
  clientCodes: Record<string, string>
  sourceCode: string | null
  sourceName: string | null
  cobCode: string | null
  cobName: string
  coverCode: string | null
  coverName: string | null
  /** Periode polis "YYYY-MM-DD"; endorsement memakai periode polis induk. */
  periodStart: string
  periodEnd: string
  /** Tanggal produksi "YYYY-MM-DD": tanggal mulai record, sama seperti Report Operational. */
  productionDate: string
  /** Tanggal record dicatat "YYYY-MM-DD". */
  recordedDate: string
  paidDate: string | null
  currency: string
  premium: number
  /** Diskon polis, bertanda sama dengan premi (MoM review Phase 1, poin 19). */
  discount?: number
  /**
   * Additional discount Quotation (%) dari gross premium, ditanggung LCH (Agus, 25 November
   * 2026). Beban MARKETING-DISCOUNT BEBAN LCH; tidak mengurangi premi ke asuransi.
   */
  additionalDiscountPct?: number
  /**
   * Deklarasi MOP: premi tagihan ke klien menurut rate yang diupload. Premi deklarasi adalah premi
   * ke asuransi menurut rate MOP; selisihnya margin LCH (Agus, 22 November 2026).
   */
  clientPremium?: number | null
  brokeragePct: number
  remarks: string | null
  groupingInsured: string | null
  cobOjkClass: string | null
  placementLocation: string | null
  /** Objek pertanggungan untuk kolom Object, lihat `recapObject`. */
  object?: string | null
  /** Klien ditandai SPIL Program di Database Klien. */
  spilProgram?: boolean
  /** Sharing brokerage ke LCH Singapore, persen dari brokerage (Agus, 22 November 2026). */
  commissionShareSgPct?: number
  /** Bagian slip PAR + EQVET, supaya kedua polisnya tidak dianggap dobel. */
  slipPart?: string | null
  /** Brokerage sudah termasuk PPN 2,2%; sharing dihitung dari brokerage sebelum PPN. */
  includeVat?: boolean
  /** feeSubAccount: sub akun EF asuransi dari Master Data; kosong = EF. */
  insurers: {
    insurer: string
    share: number
    additionalFeePct: number
    /** Additional fee asuransi ini sudah termasuk PPN 2,2%. */
    additionalFeeIncludeVat?: boolean
    feeSubAccount?: string | null
    /** Kode lookup sub akun EF, misalnya `ef_mag` untuk EF (MAG). */
    feeSubAccountCode?: string | null
  }[]
}

/** Satu baris rekap, satu kolom per header contoh LCH. */
export type RecapRow = Record<(typeof RECAP_HEADERS)[number], string | number>

/** Header persis seperti baris 4 contoh rekap LCH. */
export const RECAP_HEADERS = [
  "refno",
  "voucher",
  "thn",
  "mth",
  "insured",
  "aname",
  "source",
  "cob",
  "toc",
  "tipe",
  "INS_TYPE",
  "tgl_paid",
  "policyno",
  "CERTIFICATENO",
  "eseqno",
  "RENEWAL",
  "pdate",
  "sdate",
  "edate",
  "adate",
  "Object",
  "Instl",
  "currency",
  "rate",
  "Premium_Gross_OC",
  "Premium_Gross",
  "Premium_Discount_OC",
  "Premium_Discount",
  "Premium_Commission_OC",
  "Premium_Commission",
  "RM_Fee_OC",
  "RM_Fee",
  "(Income)/Beban",
  "bulan prod LCH",
  "year's",
  "Percentage",
  "akun pnl",
  "sub akun pnl",
  "spil/non spil",
  "source file",
  "asuransi",
  "sub akun comm exp",
  "Note",
  "Insured Name",
  "Grouping Insured",
  "Group New Source Rev",
  "COB OJK",
  "Lokasi Penempatan",
  "Perusahaan/Perorangan",
  // Tambahan sistem di luar contoh LCH: margin rate deklarasi MOP (Agus, 20 November 2026).
  "Margin_Rate_OC",
  "Margin_Rate",
  // Tanda data produksi yang kemungkinan dobel; datanya tetap ditulis (Agus, 22 November 2026).
  "Cek Dobel",
] as const

const TYPE_CODES: Record<PolicyType, string> = {
  Baru: "NEW",
  Renewal: "RENEWAL",
  Endorsement: "ENDORSE",
  Cancellation: "CANCEL",
  // Deklarasi MOP adalah produksi baru di bawah nomor polis MOP, dengan nomor sertifikatnya.
  Deklarasi: "NEW",
}

/** Tanggal contoh LCH ditulis MM/DD/YYYY. */
export function recapDate(iso: string | null | undefined) {
  if (!iso) return ""
  const [y, m, d] = iso.slice(0, 10).split("-")
  return y && m && d ? `${m}/${d}/${y}` : ""
}

const codeName = (code: string | null | undefined, name: string | null | undefined) =>
  code && name ? `${code} - ${name}` : (name ?? code ?? "")

/** Akun dan sub akun laba rugi dari daftar Team LCH. Beban belum dicatat di sistem. */
export const PNL_INCOME = "INCOME"
export const PNL_EXPENSE = "EXPENSE"
/** Sub akun beban komisi dan penerimanya untuk sharing brokerage ke LCH Singapore. */
export const COMM_EXPENSE = "COMM EXPENSE"
/** Sub akun beban additional discount Quotation yang ditanggung LCH (nama kolom Team LCH). */
export const MARKETING_DISCOUNT = "MARKETING-DISCOUNT BEBAN LCH"
export const SG_OFFICE = "LCH Insurance Brokers Pte Ltd"
export const SUB_ACCOUNT = {
  commission: "COMM",
  fee: "EF",
  margin: "O/I-MARGIN",
} as const

/**
 * Sub akun baris EF: pilihan Sub akun EF asuransi di Master Data (misalnya "EF (MAG)" untuk Multi
 * Artha Guna), atau EF bila asuransinya belum diatur.
 */
export const feeSubAccount = (label?: string | null) => label?.trim() || SUB_ACCOUNT.fee

/** Akun (kolom Grouping Insured): grouping insured polis, atau nama klien/tertanggung bila kosong. */
export const recapAccount = (
  p: Pick<RecapPolicy, "groupingInsured" | "clientName" | "insuredName">
) => p.groupingInsured?.trim() || p.clientName?.trim() || p.insuredName

/** SPIL bila klien polis ditandai SPIL Program di Database Klien; tidak ada daftar resmi SPIL. */
export const spilClass = (p: Pick<RecapPolicy, "spilProgram">) =>
  p.spilProgram ? "SPIL" : "Non SPIL"

/** Modul tempat polis dicatat: Placement (dari placing slip), Policy Database, atau Deklarasi MOP. */
export function recapSourceFile(p: Pick<RecapPolicy, "type" | "slipNo">) {
  if (p.type === "Deklarasi") return "Deklarasi MOP"
  return p.slipNo ? "Placement" : "Policy Database"
}

const OBJECT_MAX = 250

/**
 * Kolom Object: objek pertanggungan dari baris Interest slip (kendaraan, barang, alat), atau
 * lokasi risiko polis bila slip tidak punya baris Interest (Property, polis tanpa slip).
 */
export function recapObject(interests: readonly string[], riskLocation: string | null | undefined) {
  const clean = (text: string) =>
    text
      .split(/\s*\n\s*/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("; ")
  const items = [...new Set(interests.map(clean).filter(Boolean))]
  const text = items.length ? items.join("; ") : clean(riskLocation ?? "")
  return text.length > OBJECT_MAX ? `${text.slice(0, OBJECT_MAX - 1)}…` : text
}

/** Nilai mentah satu polis untuk satu asuransi sesuai share, dalam mata uang polis. */
interface InsurerLine {
  policy: RecapPolicy
  insurer: RecapPolicy["insurers"][number]
  rate: number
  gross: number
  discount: number
  commission: number
  fee: number
  margin: number
  /** Sharing brokerage ke LCH Singapore: beban, ditulis positif. */
  sgShare: number
  /** Additional discount Quotation yang ditanggung LCH: beban, ditulis positif. */
  marketingDiscount: number
}

/**
 * Satu baris per asuransi sesuai share. Komisi = premi × brokerage (%), fee = premi × additional
 * fee (%), keduanya negatif karena pendapatan (konvensi contoh LCH). Komisi dan fee dari premi
 * sebelum diskon (MoM review Phase 1, poin 19). Margin deklarasi MOP = premi tagihan ke klien −
 * premi deklarasi (premi ke asuransi).
 */
function insurerLines(policies: readonly RecapPolicy[], fx: Record<string, number>): InsurerLine[] {
  return policies.flatMap((policy) => {
    if (policy.openCoverMaster && policy.premium === 0) return []
    const rate = fx[policy.currency] ?? 1
    const insurers = policy.insurers.length
      ? policy.insurers
      : [{ insurer: "", share: 100, additionalFeePct: 0 }]
    return insurers.map((insurer) => {
      const gross = (policy.premium * insurer.share) / 100
      const commission = beforeVat((gross * policy.brokeragePct) / 100, policy.includeVat)
      return {
        policy,
        insurer,
        rate,
        gross,
        // Diskon ditulis negatif seperti komisi dan fee: potongan dari premi bruto.
        discount: -((policy.discount ?? 0) * insurer.share) / 100,
        // Brokerage dan fee sebelum PPN, sama dengan placing (Agus dan Harry, 22 November 2026).
        // EF MAG = fee − PPN komisi, sesuai produksi MAG (23 November 2026).
        commission: -commission,
        fee: -feeBeforeVat(
          (gross * insurer.additionalFeePct) / 100,
          insurer.additionalFeeIncludeVat,
          magCommissionVat(insurer, commission, policy.includeVat)
        ),
        margin:
          policy.clientPremium == null
            ? 0
            : -(((policy.clientPremium - policy.premium) * insurer.share) / 100),
        // Beban komisi ke LCH Singapore: bagian sharing dari brokerage sebelum PPN, sama dengan
        // Ringkasan Penutupan (Agus, 22 November 2026).
        sgShare:
          ((gross * policy.brokeragePct) / 100 / (policy.includeVat ? 1 + BROKERAGE_VAT_RATE : 1)) *
          ((policy.commissionShareSgPct || 0) / 100),
        // Additional discount Quotation dari gross premium bagian asuransi ini (Agus, 25 November
        // 2026).
        marketingDiscount: (gross * (policy.additionalDiscountPct || 0)) / 100,
      }
    })
  })
}

/** Kolom identitas satu baris, nilai uang 0. */
function baseRow(line: InsurerLine): RecapRow {
  const { policy: p, insurer: ins, rate } = line
  const [year, month] = p.productionDate.split("-").map(Number)
  // Endorsement, pembatalan, dan deklarasi ditulis di bawah nomor polis induknya.
  const changeRecord =
    p.type === "Endorsement" || p.type === "Cancellation" || p.type === "Deklarasi"
  const source = codeName(p.sourceCode, p.sourceName)
  const insured = codeName(p.clientCodes[ins.insurer], p.clientName ?? p.insuredName)
  return {
    refno: p.slipNo ?? p.policyNo,
    voucher: "",
    thn: year,
    mth: month,
    insured,
    aname: p.insuredName,
    source,
    cob: codeName(p.cobCode, p.cobName.toUpperCase()),
    toc: codeName(p.coverCode, p.coverName),
    tipe: TYPE_CODES[p.type],
    INS_TYPE: "DIRECT INSURANCE",
    tgl_paid: p.paidDate ? recapDate(p.paidDate) : 0,
    policyno: changeRecord && p.parentPolicyNo ? p.parentPolicyNo : p.policyNo,
    CERTIFICATENO: changeRecord ? p.policyNo : "",
    eseqno: p.endorsementSeq ?? 0,
    RENEWAL: p.type === "Renewal" ? 1 : 0,
    pdate: recapDate(p.recordedDate),
    sdate: recapDate(p.periodStart),
    edate: recapDate(p.periodEnd),
    adate: "",
    Object: p.object ?? "",
    Instl: 0,
    currency: p.currency,
    rate,
    Premium_Gross_OC: 0,
    Premium_Gross: 0,
    Premium_Discount_OC: 0,
    Premium_Discount: 0,
    Premium_Commission_OC: 0,
    Premium_Commission: 0,
    RM_Fee_OC: 0,
    RM_Fee: 0,
    "(Income)/Beban": 0,
    "bulan prod LCH": month,
    "year's": year,
    Percentage: 0,
    "akun pnl": PNL_INCOME,
    "sub akun pnl": "",
    "spil/non spil": spilClass(p),
    "source file": recapSourceFile(p),
    asuransi: ins.insurer,
    // Penerima beban komisi (agen, referral, broker lain) belum dicatat di sistem.
    "sub akun comm exp": "",
    Note: p.remarks ?? "",
    "Insured Name": insured,
    "Grouping Insured": recapAccount(p),
    "Group New Source Rev": source,
    "COB OJK": p.cobOjkClass ?? "",
    "Lokasi Penempatan": p.placementLocation ?? "",
    "Perusahaan/Perorangan": p.clientType === "Korporasi" ? "Perusahaan" : (p.clientType ?? ""),
    Margin_Rate_OC: 0,
    Margin_Rate: 0,
    "Cek Dobel": "",
  }
}

/** Tanda dobel per polis rekap, lihat `duplicateFlags`. */
function recapDuplicateFlags(policies: readonly RecapPolicy[]): Map<RecapPolicy, string> {
  const flags = duplicateFlags(
    policies.map((p) => ({
      policyNo: p.policyNo,
      type: p.type,
      insuredName: p.insuredName,
      cob: p.cobName,
      inceptionDate: p.productionDate,
      expiryDate: p.periodEnd,
      currency: p.currency,
      premium: p.premium,
      insurer: p.insurers[0]?.insurer,
      slipPart: p.slipPart,
      parent: p.parentPolicyNo,
    }))
  )
  return new Map(policies.map((p, i) => [p, flags[i]]))
}

/**
 * Baris rekap per unsur pendapatan, seperti nota terpisah di rekap LCH: baris COMM membawa premi,
 * diskon, dan komisi; baris EF dan O/I-MARGIN hanya nilainya, supaya jumlah premi tidak dobel.
 * Nilai mentah dibulatkan sekali per kolom, supaya kolom Rupiah sama dengan contoh LCH (komisi OC ×
 * kurs, bukan komisi OC yang sudah dibulatkan).
 */
export function recapRows(policies: RecapPolicy[], fx: Record<string, number> = FX): RecapRow[] {
  const flags = recapDuplicateFlags(policies)
  return insurerLines(policies, fx).flatMap((line) => {
    const { policy: p, insurer: ins } = line
    const idr = (raw: number) => roundCents(raw * line.rate)
    const base: RecapRow = { ...baseRow(line), "Cek Dobel": flags.get(p) ?? "" }
    const gross = roundCents(line.gross)
    const rows: RecapRow[] = [
      {
        ...base,
        Premium_Gross_OC: gross,
        Premium_Gross: idr(line.gross),
        Premium_Discount_OC: roundCents(line.discount),
        Premium_Discount: idr(line.discount),
        Premium_Commission_OC: roundCents(line.commission),
        Premium_Commission: idr(line.commission),
        "(Income)/Beban": idr(line.commission),
        Percentage: gross ? -beforeVat(p.brokeragePct, p.includeVat) / 100 : 0,
        "sub akun pnl": SUB_ACCOUNT.commission,
      },
    ]
    if (line.fee) {
      rows.push({
        ...base,
        RM_Fee_OC: roundCents(line.fee),
        RM_Fee: idr(line.fee),
        "(Income)/Beban": idr(line.fee),
        Percentage:
          -feeBeforeVat(
            ins.additionalFeePct,
            ins.additionalFeeIncludeVat,
            magCommissionVat(ins, beforeVat(p.brokeragePct, p.includeVat), p.includeVat)
          ) / 100,
        "sub akun pnl": feeSubAccount(ins.feeSubAccount),
      })
    }
    if (line.margin) {
      rows.push({
        ...base,
        Margin_Rate_OC: roundCents(line.margin),
        Margin_Rate: idr(line.margin),
        "(Income)/Beban": idr(line.margin),
        Percentage: p.premium ? -((p.clientPremium ?? p.premium) - p.premium) / p.premium : 0,
        "sub akun pnl": SUB_ACCOUNT.margin,
      })
    }
    if (line.sgShare) {
      // Sharing brokerage ke LCH Singapore: beban komisi, sub akun comm exp = penerimanya
      // (catatan Team LCH, 20 November 2026; Agus, 22 November 2026).
      rows.push({
        ...base,
        "(Income)/Beban": idr(line.sgShare),
        Percentage: gross ? line.sgShare / line.gross : 0,
        "akun pnl": PNL_EXPENSE,
        "sub akun pnl": COMM_EXPENSE,
        "sub akun comm exp": SG_OFFICE,
      })
    }
    if (line.marketingDiscount) {
      // Additional discount Quotation yang ditanggung LCH (Agus, 25 November 2026).
      rows.push({
        ...base,
        "(Income)/Beban": idr(line.marketingDiscount),
        Percentage: (p.additionalDiscountPct || 0) / 100,
        "akun pnl": PNL_EXPENSE,
        "sub akun pnl": MARKETING_DISCOUNT,
      })
    }
    return rows
  })
}

const MONEY = new Set<string>([
  "Premium_Gross_OC",
  "Premium_Gross",
  "Premium_Discount_OC",
  "Premium_Discount",
  "Premium_Commission_OC",
  "Premium_Commission",
  "RM_Fee_OC",
  "RM_Fee",
  "(Income)/Beban",
  "Margin_Rate_OC",
  "Margin_Rate",
])

/** Kolom export, urutan dan nama persis contoh LCH. Percentage berformat persen seperti contoh. */
export const RECAP_COLUMNS: ExportColumn<RecapRow>[] = RECAP_HEADERS.map((header) => ({
  header,
  value: (row: RecapRow) => row[header],
  type: MONEY.has(header) ? "money" : header === "rate" || header === "Percentage" ? "number" : "text",
  numFmt: header === "Percentage" ? "0.00%" : undefined,
  width:
    header === "aname" || header === "Object" || header === "Cek Dobel"
      ? 50
      : header === "insured" || header === "Insured Name"
        ? 36
        : undefined,
}))

/** Sub akun di format alternatif Team LCH yang belum punya data di sistem (beban dan sponsorship). */
const UNRECORDED_ACCOUNTS = [
  "O/I-SPONSORSHIP",
  "MARKETING-CASHBACK",
  "EXPENSE-COMMISIONS",
  "MARKETING-REFERRAL FEE",
  "MARKETING-PREMI BEBAN LCH",
  "MARKETING-DISCOUNT BEBAN LCH",
] as const

type Unrecorded = `${(typeof UNRECORDED_ACCOUNTS)[number]}_${"OC" | "IDR"}`

/**
 * Sheet Per Polis: "modifikasi output produksi" Team LCH, satu baris per polis per asuransi dengan
 * kolom nilai per sub akun. Nama kolom persis catatan Team LCH, termasuk "EXPENSE-COMMISIONS".
 */
export const RECAP_POLICY_HEADERS = [
  "policyno",
  "CERTIFICATENO",
  "tipe",
  "pdate",
  "sdate",
  "edate",
  "insured",
  "Grouping Insured",
  "cob",
  "toc",
  "asuransi",
  "currency",
  "rate",
  "Object",
  "spil/non spil",
  "source file",
  "Group New Source Rev",
  "Premium_Gross_OC",
  "Premium_Gross_IDR",
  "Premium_Discount_OC",
  "Premium_Discount_IDR",
  "Commission_OC",
  "Commission_IDR",
  "EF_OC",
  "EF_IDR",
  "O/I-MARGIN_OC",
  "O/I-MARGIN_IDR",
  ...UNRECORDED_ACCOUNTS.flatMap((a) => [`${a}_OC` as Unrecorded, `${a}_IDR` as Unrecorded]),
  "(Income)/Beban",
  "Cek Dobel",
] as const

export type RecapPolicyRow = Record<(typeof RECAP_POLICY_HEADERS)[number], string | number>

/** Baris sheet Per Polis; kolom beban dan sponsorship 0 sampai datanya dicatat di sistem. */
export function recapPolicyRows(
  policies: RecapPolicy[],
  fx: Record<string, number> = FX
): RecapPolicyRow[] {
  const flags = recapDuplicateFlags(policies)
  return insurerLines(policies, fx).map((line) => {
    const base = baseRow(line)
    const idr = (raw: number) => roundCents(raw * line.rate)
    const unrecorded = Object.fromEntries(
      UNRECORDED_ACCOUNTS.flatMap((a) => [
        [`${a}_OC`, 0],
        [`${a}_IDR`, 0],
      ])
    ) as Record<Unrecorded, number>
    return {
      policyno: base.policyno,
      CERTIFICATENO: base.CERTIFICATENO,
      tipe: base.tipe,
      pdate: base.pdate,
      sdate: base.sdate,
      edate: base.edate,
      insured: base.insured,
      "Grouping Insured": base["Grouping Insured"],
      cob: base.cob,
      toc: base.toc,
      asuransi: base.asuransi,
      currency: base.currency,
      rate: base.rate,
      Object: base.Object,
      "spil/non spil": base["spil/non spil"],
      "source file": base["source file"],
      "Group New Source Rev": base["Group New Source Rev"],
      Premium_Gross_OC: roundCents(line.gross),
      Premium_Gross_IDR: idr(line.gross),
      Premium_Discount_OC: roundCents(line.discount),
      Premium_Discount_IDR: idr(line.discount),
      Commission_OC: roundCents(line.commission),
      Commission_IDR: idr(line.commission),
      EF_OC: roundCents(line.fee),
      EF_IDR: idr(line.fee),
      "O/I-MARGIN_OC": roundCents(line.margin),
      "O/I-MARGIN_IDR": idr(line.margin),
      ...unrecorded,
      // Beban komisi yang tercatat: sharing brokerage ke LCH Singapore.
      "EXPENSE-COMMISIONS_OC": roundCents(line.sgShare),
      "EXPENSE-COMMISIONS_IDR": idr(line.sgShare),
      // Additional discount Quotation yang ditanggung LCH (Agus, 25 November 2026).
      "MARKETING-DISCOUNT BEBAN LCH_OC": roundCents(line.marketingDiscount),
      "MARKETING-DISCOUNT BEBAN LCH_IDR": idr(line.marketingDiscount),
      "(Income)/Beban": idr(
        line.commission + line.fee + line.margin + line.sgShare + line.marketingDiscount
      ),
      "Cek Dobel": flags.get(line.policy) ?? "",
    }
  })
}

const POLICY_TEXT = new Set<string>(RECAP_POLICY_HEADERS.slice(0, 17))

export const RECAP_POLICY_COLUMNS: ExportColumn<RecapPolicyRow>[] = RECAP_POLICY_HEADERS.map(
  (header) => ({
    header,
    value: (row: RecapPolicyRow) => row[header],
    type:
      header === "rate"
        ? "number"
        : POLICY_TEXT.has(header) || header === "Cek Dobel"
          ? "text"
          : "money",
    width: header === "Object" || header === "Cek Dobel" ? 50 : header === "insured" ? 36 : undefined,
  })
)

/** Pendapatan satu polis untuk satu asuransi dalam IDR, untuk laporan per akun per bulan. */
export interface RecapIncome {
  /** Kolom Grouping Insured, lihat `recapAccount`. */
  account: string
  /** Bulan produksi "YYYY-MM", sama dengan kolom thn dan mth. */
  month: string
  sourceCode: string | null
  /** Kode sub akun EF asuransinya dari Master Data, misalnya `ef_mag`. */
  feeSubAccountCode: string | null
  commission: number
  fee: number
  margin: number
  /** Sharing brokerage ke LCH Singapore (baris EXPENSE / COMM EXPENSE), positif. */
  sgShare: number
  /** Additional discount Quotation yang ditanggung LCH (baris MARKETING-DISCOUNT), positif. */
  marketingDiscount: number
}

/** Komisi, fee, dan margin per polis per asuransi dengan aturan dan pembulatan Rekap Produksi. */
export function recapIncome(
  policies: RecapPolicy[],
  fx: Record<string, number> = FX
): RecapIncome[] {
  return insurerLines(policies, fx).map((line) => {
    const idr = (raw: number) => roundCents(raw * line.rate)
    return {
      account: recapAccount(line.policy),
      month: line.policy.productionDate.slice(0, 7),
      sourceCode: line.policy.sourceCode,
      feeSubAccountCode: line.insurer.feeSubAccountCode ?? null,
      commission: idr(line.commission),
      fee: idr(line.fee),
      margin: idr(line.margin),
      sgShare: idr(line.sgShare),
      marketingDiscount: idr(line.marketingDiscount),
    }
  })
}

/** Penjelasan kolom yang ditambahkan untuk catatan Team LCH. */
export const RECAP_NOTES = [
  "Rekap Produksi: satu baris per polis per asuransi per unsur pendapatan. Premi dan diskon hanya ditulis di baris COMM, jadi jumlah premi tidak dobel.",
  "akun pnl: INCOME untuk pendapatan dan EXPENSE untuk beban. Pendapatan ditulis negatif dan beban positif, seperti kolom (Income)/Beban contoh LCH.",
  "Cek Dobel: tanda polis yang kemungkinan tercatat dua kali, barisnya berwarna oranye. Datanya tetap ditulis dan ikut dijumlah; cek di Policy Database lalu hapus atau perbaiki yang dobel. Aturannya: no. polis sama dipakai lebih dari satu data, atau tipe, tertanggung, COB, tanggal mulai dan berakhir, mata uang, dan premi sama dengan nomor polis berbeda (misalnya polis sementara dari CI yang juga diinput manual).",
  "sub akun pnl: COMM = brokerage; baris EF = additional fee, sub akunnya mengikuti Sub akun EF asuransi di Master Data > Asuransi & Adjuster (Multi Artha Guna: EF (MAG); belum diatur: EF); nilai EF sebelum PPN (incl. VAT × 97,8%; EF MAG incl. VAT = fee − PPN komisi, sesuai produksi MAG); O/I-MARGIN = margin deklarasi MOP (premi tagihan ke klien − premi ke asuransi menurut rate MOP).",
  "spil/non spil: SPIL bila klien polis ditandai SPIL Program di Database Klien; selain itu Non SPIL.",
  "source file: Placement untuk polis dari placing slip, Policy Database untuk polis yang diinput langsung, Deklarasi MOP untuk deklarasi.",
  "Object: objek pertanggungan dari baris Interest slip (kendaraan, barang, alat), atau lokasi risiko polis bila tidak ada.",
  "Per Polis: format alternatif Team LCH, satu baris per polis per asuransi dengan kolom nilai per sub akun.",
  "Beban komisi: sharing brokerage ke LCH Singapore (isian Sharing Komisi LCH Singapore di placing slip/polis) ditulis sebagai baris EXPENSE / COMM EXPENSE dengan sub akun comm exp LCH Insurance Brokers Pte Ltd, dan kolom EXPENSE-COMMISIONS di sheet Per Polis.",
  "MARKETING-DISCOUNT BEBAN LCH: additional discount Quotation di polis (persen dari gross premium), ditanggung LCH dan tidak mengurangi premi ke asuransi. Ditulis sebagai baris EXPENSE dan kolom MARKETING-DISCOUNT BEBAN LCH di sheet Per Polis.",
  "Beban lain (MARKETING-CASHBACK, REFERRAL FEE, PREMI BEBAN LCH) dan O/I-SPONSORSHIP belum dicatat di sistem, jadi berisi 0. Kolomnya bisa diisi langsung di file ini.",
] as const

/** Warna baris yang bertanda dobel. */
const DUPLICATE_FILL = "FFFCE4D6"

/** Workbook Rekap Produksi: sheet Rekap Produksi (format LCH), Per Polis, dan Keterangan. */
export function fillProductionRecap(
  wb: Workbook,
  policies: RecapPolicy[],
  period: { start: string; end: string },
  printedOn: string,
  fx: Record<string, number> = FX
) {
  const recap = addExportSheet(wb, {
    sheet: "Rekap Produksi",
    columns: RECAP_COLUMNS,
    rows: recapRows(policies, fx),
  })
  const perPolicy = addExportSheet(wb, {
    sheet: "Per Polis",
    columns: RECAP_POLICY_COLUMNS,
    rows: recapPolicyRows(policies, fx),
  })
  // Baris bertanda dobel diberi warna supaya mudah dicek; nilainya tetap ikut dijumlah.
  for (const ws of [recap, perPolicy]) {
    const flagColumn = ws.getRow(1).values as unknown[]
    const index = flagColumn.indexOf("Cek Dobel")
    ws.eachRow((row, n) => {
      if (n === 1 || !row.getCell(index).value) return
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DUPLICATE_FILL } }
      })
    })
  }
  const notes = wb.addWorksheet("Keterangan")
  notes.getColumn(1).width = 130
  notes.getCell("A1").value = "Keterangan Rekap Produksi"
  notes.getCell("A1").font = { bold: true, size: 13 }
  notes.getCell("A2").value =
    `Periode tanggal mulai polis ${dateShort(period.start)} s/d ${dateShort(period.end)}. Dibuat ${dateShort(printedOn)}.`
  RECAP_NOTES.forEach((text, i) => {
    const cell = notes.getCell(`A${i + 4}`)
    cell.value = text
    cell.alignment = { wrapText: true, vertical: "top" }
  })
}
