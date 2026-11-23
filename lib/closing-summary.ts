/**
 * Ringkasan penutupan sebelum Closing Instruction (Agus, 13 November 2026). Hanya tampil di form;
 * dokumen tidak mencetak net premium (instruksi LCH).
 */

import {
  additionalFeeBeforeVatAmount,
  additionalFeeVatAddedAmount,
  additionalFeeVatAmount,
  brokerageAmount,
  brokerageVatAdded,
  brokerageVatAmount,
  feeVatInside,
  insurerAdditionalFee,
  insurerFeeBeforeVat,
  magFeeRule,
  roundCents,
  sgCommissionShare,
  slipDiscountAmount,
  totalPremium,
  vatAdded,
  withFeeSubAccounts,
} from "@/lib/calc"
import type { PlacingSlip, SecurityPanelRow } from "@/lib/data/types"
import { usesAdditionalFee } from "@/components/underwriting/slip-model"

export interface InsurerClosingSummary {
  insurer: string
  share: number
  premium: number
  discount: number
  /** Brokerage sebelum PPN bagian asuransi ini. */
  brokerage: number
  /** Additional fee sebelum PPN. */
  fee: number
  /** PPN 2,2% brokerage dan fee bagian asuransi ini, yang di dalam (incl.) maupun ditambahkan (excl.). */
  vat: number
  /** Premi − diskon − brokerage − additional fee − PPN bagian asuransi ini. */
  net: number
}

export interface ClosingSummary {
  /** Premi sebelum diskon, dasar brokerage dan additional fee. */
  premium: number
  /** Diskon slip (MoM review Phase 1, poin 19). */
  discount: number
  /** Gross Premium = total premi sebelum diskon, brokerage, dan additional fee (Team LCH). */
  gross: number
  /**
   * Brokerage sebelum PPN (Agus, 22 November 2026): incl. VAT = persen slip ÷ 1,022, misalnya 15%
   * incl. VAT = 14,6771%; excl. VAT = persen slip.
   */
  brokerage: number
  /** PPN 2,2% brokerage: di dalam persen slip (incl. VAT) atau ditambahkan di atasnya (excl. VAT). */
  brokerageVat: number
  /** Additional fee sebelum PPN; nol untuk COB tanpa additional fee (selain Property dan Motor Vehicle). */
  fee: number
  /** PPN 2,2% additional fee, di dalam atau ditambahkan sesuai status PPN tiap asuransi. */
  feeVat: number
  /**
   * Nett Premium yang disetor ke asuransi: Gross Premium − diskon − brokerage − additional fee
   * (Team LCH, 19 November 2026; MoM review Phase 1, poin 19) − PPN brokerage dan fee.
   */
  net: number
  /** Diterima LCH dari asuransi: brokerage + additional fee + PPN-nya. */
  income: number
  /** Semua PPN 2,2% di dalam pendapatan. */
  incomeVat: number
  /**
   * Bagian brokerage (sebelum PPN) yang di-sharing ke LCH Singapore (Agus, 22 November 2026).
   * Beban komisi LCH Indonesia; tidak mengubah net ke asuransi.
   */
  sgShare: number
  /** Ada asuransi EF (MAG) dengan fee incl. VAT: EF-nya dihitung seperti produksi MAG. */
  magFee: boolean
  /** Rincian per asuransi untuk co-insurance; kosong bila hanya satu asuransi. */
  insurers: InsurerClosingSummary[]
}

/**
 * Fee sebelum PPN dan PPN-nya untuk satu asuransi. EF MAG tidak kena PPN sendiri: PPN komisinya
 * sudah di kolom PPN brokerage, dan fee sebelum PPN = fee − PPN komisi itu.
 */
function feeParts(
  premium: number,
  r: SecurityPanelRow,
  brokerage: { pct: number; includeVat?: boolean }
) {
  const gross = insurerAdditionalFee(premium, r)
  return {
    fee: insurerFeeBeforeVat(premium, r, brokerage),
    vat: roundCents(
      feeVatInside(gross, r.additionalFeeIncludeVat, magFeeRule(r)) +
        vatAdded(gross, r.additionalFeeIncludeVat)
    ),
  }
}

/**
 * `masterInsurers`: pilihan asuransi Master Data dengan kode Sub akun EF-nya, untuk aturan EF MAG
 * (asuransi di panel dicocokkan lewat nama).
 */
export function closingSummary(
  input: PlacingSlip,
  masterInsurers: readonly { name: string; feeSubAccountCode?: string | null }[] = []
): ClosingSummary {
  const slip = { ...input, securityPanel: withFeeSubAccounts(input.securityPanel, masterInsurers) }
  const withFee = usesAdditionalFee(slip.cob)
  const premium = totalPremium(slip)
  const discount = slipDiscountAmount(slip)
  const brokerage = brokerageAmount(slip)
  const brokerageVat = roundCents(brokerageVatAmount(slip) + brokerageVatAdded(slip))
  const fee = withFee ? additionalFeeBeforeVatAmount(slip) : 0
  const feeVat = withFee
    ? roundCents(additionalFeeVatAmount(slip) + additionalFeeVatAddedAmount(slip))
    : 0
  const vat = roundCents(brokerageVat + feeVat)
  const brokerageTerms = { pct: slip.brokeragePct, includeVat: slip.includeVat }

  // Co-insurance: bagian tiap asuransi sesuai share. Asuransi terakhir
  // menampung selisih pembulatan, supaya rinciannya sama dengan total.
  const rows = (slip.securityPanel ?? []).filter((r) => r.insurer && (r.share || 0) > 0)
  const insurers: InsurerClosingSummary[] = []
  if (rows.length > 1) {
    let premiumLeft = premium
    let discountLeft = discount
    let brokerageLeft = brokerage
    let brokerageVatLeft = brokerageVat
    let feeLeft = fee
    let feeVatLeft = feeVat
    rows.forEach((r, i) => {
      const last = i === rows.length - 1
      const own = withFee ? feeParts(premium, r, brokerageTerms) : { fee: 0, vat: 0 }
      const brokeragePart = last ? brokerageLeft : roundCents((brokerage * r.share) / 100)
      const brokerageVatPart = last
        ? brokerageVatLeft
        : roundCents((brokerageVat * r.share) / 100)
      const feePart = last ? feeLeft : own.fee
      const feeVatPart = last ? feeVatLeft : own.vat
      const part = {
        premium: last ? premiumLeft : roundCents((premium * r.share) / 100),
        discount: last ? discountLeft : roundCents((discount * r.share) / 100),
        brokerage: brokeragePart,
        fee: feePart,
        vat: roundCents(brokerageVatPart + feeVatPart),
      }
      premiumLeft = roundCents(premiumLeft - part.premium)
      discountLeft = roundCents(discountLeft - part.discount)
      brokerageLeft = roundCents(brokerageLeft - brokeragePart)
      brokerageVatLeft = roundCents(brokerageVatLeft - brokerageVatPart)
      feeLeft = roundCents(feeLeft - feePart)
      feeVatLeft = roundCents(feeVatLeft - feeVatPart)
      insurers.push({
        insurer: r.insurer,
        share: r.share,
        ...part,
        net: roundCents(part.premium - part.discount - part.brokerage - part.fee - part.vat),
      })
    })
  }

  return {
    premium,
    discount,
    gross: premium,
    brokerage,
    brokerageVat,
    fee,
    feeVat,
    net: roundCents(premium - discount - brokerage - fee - vat),
    income: roundCents(brokerage + fee + vat),
    incomeVat: vat,
    sgShare: sgCommissionShare(brokerage, slip.commissionShareSgPct),
    magFee: withFee && slip.securityPanel.some((r) => (r.share || 0) > 0 && magFeeRule(r)),
    insurers,
  }
}
