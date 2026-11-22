/**
 * Ringkasan penutupan sebelum Closing Instruction (Agus, 13 November 2026). Hanya tampil di form;
 * dokumen tidak mencetak net premium (instruksi LCH).
 */

import {
  additionalFeeAmount,
  additionalFeeVatAddedAmount,
  additionalFeeVatAmount,
  brokerageAmount,
  brokerageVatAdded,
  brokerageVatAmount,
  feeVatInside,
  insurerAdditionalFee,
  roundCents,
  sgCommissionShare,
  slipDiscountAmount,
  totalPremium,
  vatAdded,
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
  /** Rincian per asuransi untuk co-insurance; kosong bila hanya satu asuransi. */
  insurers: InsurerClosingSummary[]
}

/** Fee sebelum PPN dan PPN-nya untuk satu asuransi. */
function feeParts(premium: number, r: SecurityPanelRow) {
  const gross = insurerAdditionalFee(premium, r)
  const inside = feeVatInside(gross, r.additionalFeeIncludeVat)
  return {
    fee: roundCents(gross - inside),
    vat: roundCents(inside + vatAdded(gross, r.additionalFeeIncludeVat)),
  }
}

export function closingSummary(slip: PlacingSlip): ClosingSummary {
  const withFee = usesAdditionalFee(slip.cob)
  const premium = totalPremium(slip)
  const discount = slipDiscountAmount(slip)
  const brokerage = brokerageAmount(slip)
  const brokerageVat = roundCents(brokerageVatAmount(slip) + brokerageVatAdded(slip))
  const feeGross = withFee ? additionalFeeAmount(slip) : 0
  const feeInside = withFee ? additionalFeeVatAmount(slip) : 0
  const fee = roundCents(feeGross - feeInside)
  const feeVat = withFee ? roundCents(feeInside + additionalFeeVatAddedAmount(slip)) : 0
  const vat = roundCents(brokerageVat + feeVat)

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
      const own = withFee ? feeParts(premium, r) : { fee: 0, vat: 0 }
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
    insurers,
  }
}
