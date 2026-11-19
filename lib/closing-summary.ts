/**
 * Ringkasan penutupan sebelum Closing Instruction (Agus, 13 November 2026). Hanya tampil di form;
 * dokumen tidak mencetak net premium (instruksi LCH).
 */

import {
  additionalFeeAmount,
  additionalFeeVatAmount,
  brokerageAmount,
  brokerageVatAmount,
  insurerAdditionalFee,
  roundCents,
  slipDiscountAmount,
  totalPremium,
} from "@/lib/calc"
import type { PlacingSlip } from "@/lib/data/types"
import { usesAdditionalFee } from "@/components/underwriting/slip-model"

export interface InsurerClosingSummary {
  insurer: string
  share: number
  premium: number
  discount: number
  brokerage: number
  fee: number
  /** Premi − diskon − brokerage − additional fee bagian asuransi ini. */
  net: number
}

export interface ClosingSummary {
  /** Premi sebelum diskon, dasar brokerage dan additional fee. */
  premium: number
  /** Diskon slip (MoM review Phase 1, poin 19). */
  discount: number
  /** Gross Premium = premi − diskon. */
  gross: number
  brokerage: number
  /** Nol untuk COB tanpa additional fee (selain Property dan Motor Vehicle). */
  fee: number
  /**
   * Nett Premium yang disetor ke asuransi: premi − diskon − brokerage − additional fee
   * (MoM review Phase 1, poin 19).
   */
  net: number
  /** Pendapatan LCH: brokerage + additional fee. */
  income: number
  /** PPN 2,2% di dalam brokerage dan additional fee yang termasuk PPN. */
  incomeVat: number
  /** Rincian per asuransi untuk co-insurance; kosong bila hanya satu asuransi. */
  insurers: InsurerClosingSummary[]
}

export function closingSummary(slip: PlacingSlip): ClosingSummary {
  const withFee = usesAdditionalFee(slip.cob)
  const premium = totalPremium(slip)
  const discount = slipDiscountAmount(slip)
  const brokerage = brokerageAmount(slip)
  const fee = withFee ? additionalFeeAmount(slip) : 0
  const incomeVat = roundCents(
    brokerageVatAmount(slip) + (withFee ? additionalFeeVatAmount(slip) : 0)
  )

  // Co-insurance: bagian tiap asuransi sesuai share. Asuransi terakhir
  // menampung selisih pembulatan, supaya rinciannya sama dengan total.
  const rows = (slip.securityPanel ?? []).filter((r) => r.insurer && (r.share || 0) > 0)
  const insurers: InsurerClosingSummary[] = []
  if (rows.length > 1) {
    let premiumLeft = premium
    let discountLeft = discount
    let brokerageLeft = brokerage
    let feeLeft = fee
    rows.forEach((r, i) => {
      const last = i === rows.length - 1
      const part = {
        premium: last ? premiumLeft : roundCents((premium * r.share) / 100),
        discount: last ? discountLeft : roundCents((discount * r.share) / 100),
        brokerage: last ? brokerageLeft : roundCents((brokerage * r.share) / 100),
        fee: last ? feeLeft : withFee ? insurerAdditionalFee(premium, r) : 0,
      }
      premiumLeft = roundCents(premiumLeft - part.premium)
      discountLeft = roundCents(discountLeft - part.discount)
      brokerageLeft = roundCents(brokerageLeft - part.brokerage)
      feeLeft = roundCents(feeLeft - part.fee)
      insurers.push({
        insurer: r.insurer,
        share: r.share,
        ...part,
        net: roundCents(part.premium - part.discount - part.brokerage - part.fee),
      })
    })
  }

  return {
    premium,
    discount,
    gross: roundCents(premium - discount),
    brokerage,
    fee,
    net: roundCents(premium - discount - brokerage - fee),
    income: roundCents(brokerage + fee),
    incomeVat,
    insurers,
  }
}
