/**
 * Rekap produksi format `documents/Contoh Format Rekap Produksi.xlsx` (Harry, 19 Oktober 2026):
 * satu baris per polis per asuransi, nilai OC dan Rupiah, pendapatan ditulis negatif.
 */

import { FX, roundCents } from "@/lib/calc"
import type { ExportColumn } from "@/lib/export"
import type { PolicyType } from "@/lib/data/types"

/** Data polis yang dibutuhkan rekap, disiapkan server. */
export interface RecapPolicy {
  policyNo: string
  /** Polis induk untuk endorsement dan pembatalan. */
  parentPolicyNo: string | null
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
  brokeragePct: number
  remarks: string | null
  groupingInsured: string | null
  cobOjkClass: string | null
  placementLocation: string | null
  insurers: { insurer: string; share: number; additionalFeePct: number }[]
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
] as const

const TYPE_CODES: Record<PolicyType, string> = {
  Baru: "NEW",
  Renewal: "RENEWAL",
  Endorsement: "ENDORSE",
  Cancellation: "CANCEL",
}

/** Tanggal contoh LCH ditulis MM/DD/YYYY. */
export function recapDate(iso: string | null | undefined) {
  if (!iso) return ""
  const [y, m, d] = iso.slice(0, 10).split("-")
  return y && m && d ? `${m}/${d}/${y}` : ""
}

const codeName = (code: string | null | undefined, name: string | null | undefined) =>
  code && name ? `${code} - ${name}` : (name ?? code ?? "")

/**
 * Satu baris per asuransi sesuai share. Komisi = premi × brokerage (%), fee = premi × additional
 * fee (%), keduanya negatif karena pendapatan (konvensi contoh LCH).
 */
export function recapRows(policies: RecapPolicy[], fx: Record<string, number> = FX): RecapRow[] {
  return policies.flatMap((p) => {
    const rate = fx[p.currency] ?? 1
    const [year, month] = p.productionDate.split("-").map(Number)
    const changeRecord = p.type === "Endorsement" || p.type === "Cancellation"
    const source = codeName(p.sourceCode, p.sourceName)
    const insurers = p.insurers.length
      ? p.insurers
      : [{ insurer: "", share: 100, additionalFeePct: 0 }]
    return insurers.map((ins) => {
      // Nilai mentah dibulatkan sekali per kolom, supaya kolom Rupiah sama
      // dengan contoh LCH (komisi OC × kurs, bukan komisi OC yang sudah dibulatkan).
      const grossRaw = (p.premium * ins.share) / 100
      const commissionRaw = -(grossRaw * p.brokeragePct) / 100
      const feeRaw = -(grossRaw * ins.additionalFeePct) / 100
      const gross = roundCents(grossRaw)
      const commission = roundCents(commissionRaw)
      const fee = roundCents(feeRaw)
      const idr = (raw: number) => roundCents(raw * rate)
      const clientCode = p.clientCodes[ins.insurer]
      const insured = codeName(clientCode, p.clientName ?? p.insuredName)
      const row: RecapRow = {
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
        Object: "",
        Instl: 0,
        currency: p.currency,
        rate,
        Premium_Gross_OC: gross,
        Premium_Gross: idr(grossRaw),
        Premium_Discount_OC: 0,
        Premium_Discount: 0,
        Premium_Commission_OC: commission,
        Premium_Commission: idr(commissionRaw),
        RM_Fee_OC: fee,
        RM_Fee: idr(feeRaw),
        "(Income)/Beban": idr(commissionRaw + feeRaw),
        "bulan prod LCH": month,
        "year's": year,
        Percentage: gross ? -p.brokeragePct / 100 : 0,
        "akun pnl": "",
        "sub akun pnl": "",
        "spil/non spil": "",
        "source file": "",
        asuransi: ins.insurer,
        "sub akun comm exp": "",
        Note: p.remarks ?? "",
        "Insured Name": insured,
        "Grouping Insured": p.groupingInsured ?? p.clientName ?? p.insuredName,
        "Group New Source Rev": source,
        "COB OJK": p.cobOjkClass ?? "",
        "Lokasi Penempatan": p.placementLocation ?? "",
        "Perusahaan/Perorangan":
          p.clientType === "Korporasi" ? "Perusahaan" : (p.clientType ?? ""),
      }
      return row
    })
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
])

/** Kolom export, urutan dan nama persis contoh LCH. */
export const RECAP_COLUMNS: ExportColumn<RecapRow>[] = RECAP_HEADERS.map((header) => ({
  header,
  value: (row: RecapRow) => row[header],
  type: MONEY.has(header) ? "money" : header === "rate" || header === "Percentage" ? "number" : "text",
  width: header === "aname" ? 50 : header === "insured" || header === "Insured Name" ? 36 : undefined,
}))
