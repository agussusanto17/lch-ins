/**
 * Aturan detail klaim dari MoM review Phase 1 (luring, 17 November 2026): co-insurance
 * ditampilkan dengan bagian tiap asuransi (poin 14), dan dokumen yang sudah punya file tetap
 * ditandai diterima (poin 15). Bagiannya dihitung dari nilai disetujui/dibayar, bukan estimasi
 * kerugian (koreksi Agus, 18 November 2026).
 */
import { roundCents } from "@/lib/calc"
import { OPEN_CLAIM_STATUSES } from "@/lib/data/reference"
import type { ClaimInsurerShare, ClaimStatus } from "@/lib/data/types"
import { addDays, daysBetween } from "@/lib/date"

/**
 * Klaim Settled bersifat final dan terkunci: data klaim, dokumen, dan tindak lanjut tidak bisa
 * diubah (MoM review Phase 1, poin 9). Hanya Admin yang bisa membuka kuncinya bila ada salah input.
 */
export function isClaimLocked(status: ClaimStatus) {
  return status === "Settled"
}

/** Pesan saat klaim terkunci diubah. */
export const CLAIM_LOCKED_MESSAGE =
  "Klaim Settled terkunci: data, dokumen, dan tindak lanjut tidak bisa diubah. Minta Admin membuka kunci bila ada salah input."

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

/**
 * Asuransi umumnya membayar klaim paling lambat 30 hari kalender sejak LOD (Letter of Discharge,
 * persetujuan tertanggung atas nilai pembayaran klaim) dikirim ke asuransi (Agus, 19 November 2026).
 */
export const LOD_PAYMENT_DAYS = 30

/** Batas bayar asuransi: tanggal LOD dikirim + 30 hari kalender; kosong bila LOD belum dikirim. */
export function lodPaymentDueDate(lodDate: string | null | undefined) {
  return lodDate ? addDays(lodDate, LOD_PAYMENT_DAYS) : null
}

/**
 * Jumlah hari klaim berjalan (Outstanding atau Partial Settle) melewati batas bayar asuransi.
 * 0 bila LOD belum dikirim, batasnya belum lewat, atau klaimnya sudah selesai.
 */
export function lodDaysOverdue(
  claim: { lodDate?: string | null; status: ClaimStatus },
  today: string
) {
  const due = lodPaymentDueDate(claim.lodDate)
  if (!due || !OPEN_CLAIM_STATUSES.includes(claim.status)) return 0
  return Math.max(0, daysBetween(due, today))
}
