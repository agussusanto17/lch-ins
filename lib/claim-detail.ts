/**
 * Aturan detail klaim dari MoM review Phase 1 (luring, 17 November 2026): co-insurance
 * ditampilkan dengan bagian estimasi kerugiannya (poin 14), dan dokumen yang sudah punya file
 * tetap ditandai diterima (poin 15).
 */
import { roundCents } from "@/lib/calc"
import type { ClaimInsurerShare } from "@/lib/data/types"

export interface ClaimInsurerPortion extends ClaimInsurerShare {
  /** Bagian estimasi kerugian sesuai share, tanpa fee. */
  amount: number
}

function sharedInsurers(insurers: readonly ClaimInsurerShare[] | undefined) {
  return (insurers ?? []).filter((i) => i.insurer && i.sharePct > 0)
}

/** Polis klaim dipegang dua asuransi atau lebih. */
export function isCoInsurance(insurers: readonly ClaimInsurerShare[] | undefined) {
  return sharedInsurers(insurers).length > 1
}

/**
 * Bagian estimasi kerugian per asuransi: leader lebih dulu, lalu share terbesar. Asuransi
 * terakhir menampung selisih pembulatan, sama seperti ringkasan penutupan, supaya jumlahnya
 * tepat sama dengan estimasi kerugian × total share.
 */
export function claimInsurerPortions(
  estimatedLoss: number,
  insurers: readonly ClaimInsurerShare[] | undefined
): ClaimInsurerPortion[] {
  const rows = sharedInsurers(insurers).sort(
    (a, b) => Number(b.leader) - Number(a.leader) || b.sharePct - a.sharePct
  )
  const totalShare = rows.reduce((sum, r) => sum + r.sharePct, 0)
  let left = roundCents((estimatedLoss * totalShare) / 100)
  return rows.map((r, i) => {
    const amount = i === rows.length - 1 ? left : roundCents((estimatedLoss * r.sharePct) / 100)
    left = roundCents(left - amount)
    return { ...r, amount }
  })
}

/** Dokumen klaim yang sudah punya file tidak bisa dilepas centang diterimanya. */
export function documentReceiptLocked(doc: { isReceived: boolean; filePath: string | null }) {
  return doc.isReceived && Boolean(doc.filePath)
}
