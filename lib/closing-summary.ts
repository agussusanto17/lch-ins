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
  insurerAdditionalFee,
  roundCents,
  slipDiscountAmount,
  totalPremium,
  vatAdded,
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
  /** PPN 2,2% yang ditambahkan di atas brokerage dan fee excl. VAT bagian asuransi ini. */
  vat: number
  /** Premi − diskon − brokerage − additional fee − PPN excl. VAT bagian asuransi ini. */
  net: number
}

export interface ClosingSummary {
  /** Premi sebelum diskon, dasar brokerage dan additional fee. */
  premium: number
  /** Diskon slip (MoM review Phase 1, poin 19). */
  discount: number
  /** Gross Premium = total premi sebelum diskon, brokerage, dan additional fee (Team LCH). */
  gross: number
  brokerage: number
  /** PPN 2,2% yang ditambahkan di atas brokerage excl. VAT; nol bila brokerage incl. VAT. */
  brokerageVat: number
  /** Nol untuk COB tanpa additional fee (selain Property dan Motor Vehicle). */
  fee: number
  /** PPN 2,2% yang ditambahkan di atas fee asuransi yang excl. VAT. */
  feeVat: number
  /**
   * Nett Premium yang disetor ke asuransi: Gross Premium − diskon − brokerage − additional fee
   * (Team LCH, 19 November 2026; MoM review Phase 1, poin 19), dikurangi PPN yang ditambahkan di
   * atas brokerage dan fee excl. VAT (Agus, 20 November 2026).
   */
  net: number
  /** Diterima LCH dari asuransi: brokerage + additional fee + PPN excl. VAT. */
  income: number
  /** Semua PPN 2,2% di dalam pendapatan: yang termasuk di nominal dan yang ditambahkan. */
  incomeVat: number
  /** Rincian per asuransi untuk co-insurance; kosong bila hanya satu asuransi. */
  insurers: InsurerClosingSummary[]
}

export function closingSummary(slip: PlacingSlip): ClosingSummary {
  const withFee = usesAdditionalFee(slip.cob)
  const premium = totalPremium(slip)
  const discount = slipDiscountAmount(slip)
  const brokerage = brokerageAmount(slip)
  const brokerageVat = brokerageVatAdded(slip)
  const fee = withFee ? additionalFeeAmount(slip) : 0
  const feeVat = withFee ? additionalFeeVatAddedAmount(slip) : 0
  const vatOnTop = roundCents(brokerageVat + feeVat)
  const vatInside = roundCents(
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
    let vatLeft = vatOnTop
    rows.forEach((r, i) => {
      const last = i === rows.length - 1
      const brokeragePart = last ? brokerageLeft : roundCents((brokerage * r.share) / 100)
      const feePart = last ? feeLeft : withFee ? insurerAdditionalFee(premium, r) : 0
      const part = {
        premium: last ? premiumLeft : roundCents((premium * r.share) / 100),
        discount: last ? discountLeft : roundCents((discount * r.share) / 100),
        brokerage: brokeragePart,
        fee: feePart,
        vat: last
          ? vatLeft
          : roundCents(
              vatAdded(brokeragePart, slip.includeVat) +
                (withFee ? vatAdded(feePart, r.additionalFeeIncludeVat) : 0)
            ),
      }
      premiumLeft = roundCents(premiumLeft - part.premium)
      discountLeft = roundCents(discountLeft - part.discount)
      brokerageLeft = roundCents(brokerageLeft - part.brokerage)
      feeLeft = roundCents(feeLeft - part.fee)
      vatLeft = roundCents(vatLeft - part.vat)
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
    net: roundCents(premium - discount - brokerage - fee - vatOnTop),
    income: roundCents(brokerage + fee + vatOnTop),
    incomeVat: roundCents(vatInside + vatOnTop),
    insurers,
  }
}
