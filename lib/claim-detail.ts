/**
 * Aturan detail klaim dari MoM review Phase 1 (luring, 17 November 2026): co-insurance
 * ditampilkan dengan bagian tiap asuransi (poin 14), dan dokumen yang sudah punya file tetap
 * ditandai diterima (poin 15). Bagiannya dihitung dari nilai disetujui/dibayar, bukan estimasi
 * kerugian (koreksi Agus, 18 November 2026).
 */
import { roundCents } from "@/lib/calc"
import type { ClaimInsurerShare } from "@/lib/data/types"

export interface ClaimInsurerPortion extends ClaimInsurerShare {
  /** Bagian nilai klaim sesuai share, tanpa fee. */
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
 * Bagian nilai klaim per asuransi: leader lebih dulu, lalu share terbesar. Asuransi terakhir
 * menampung selisih pembulatan, sama seperti ringkasan penutupan, supaya jumlahnya tepat sama
 * dengan nilai × total share.
 */
export function claimInsurerPortions(
  amount: number,
  insurers: readonly ClaimInsurerShare[] | undefined
): ClaimInsurerPortion[] {
  const rows = sharedInsurers(insurers).sort(
    (a, b) => Number(b.leader) - Number(a.leader) || b.sharePct - a.sharePct
  )
  const totalShare = rows.reduce((sum, r) => sum + r.sharePct, 0)
  let left = roundCents((amount * totalShare) / 100)
  return rows.map((r, i) => {
    const part = i === rows.length - 1 ? left : roundCents((amount * r.sharePct) / 100)
    left = roundCents(left - part)
    return { ...r, amount: part }
  })
}

/** Dokumen klaim yang sudah punya file tidak bisa dilepas centang diterimanya. */
export function documentReceiptLocked(doc: { isReceived: boolean; filePath: string | null }) {
  return doc.isReceived && Boolean(doc.filePath)
}
