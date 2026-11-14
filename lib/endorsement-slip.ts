/**
 * Isi cetak endorsement dari Policy Database, mengikuti contoh EDM 01 dan CANCELLATION asuransi
 * di `documents/` (Harry, 10 November 2026).
 */

import type { ChangeSlipLock, PolicyType } from "@/lib/data/types"
import { dateEn, moneyCents } from "@/lib/format"

/**
 * Judul dokumen: ENDORSEMENT SLIP, atau CANCELLATION SLIP untuk pembatalan
 * (koreksi Harry di cetakan, 11 November 2026).
 */
export function endorsementTitle(type: PolicyType) {
  return type === "Cancellation" ? "CANCELLATION SLIP" : "ENDORSEMENT SLIP"
}

/** Endorsement lain pada polis induk yang sama, untuk nomor dan nilai sebelumnya. */
export interface SiblingEndorsement {
  /** Hanya tipe Endorsement; renewal dan pembatalan lain tidak dihitung. */
  isEndorsement: boolean
  seq: number | null
  sumInsured: number
}

/**
 * Nomor lampiran. Pembatalan tidak punya urutan di Policy Database, jadi memakai nomor sesudah
 * endorsement terakhir, seperti contoh CANCELLATION asuransi.
 */
export function attachmentSeq(
  type: PolicyType,
  ownSeq: number | null | undefined,
  siblings: SiblingEndorsement[]
): number | null {
  if (ownSeq) return ownSeq
  if (type !== "Cancellation") return null
  return Math.max(0, ...siblings.filter((s) => s.isEndorsement).map((s) => s.seq ?? 0)) + 1
}

/**
 * Pertanggungan sebelum perubahan ini: polis induk plus endorsement sebelumnya. Pembatalan
 * menghitung semua endorsement, sama seperti usulan premi pembatalan.
 */
export function sumInsuredBefore(
  type: PolicyType,
  ownSeq: number | null | undefined,
  parentSumInsured: number,
  siblings: SiblingEndorsement[]
) {
  return siblings
    .filter(
      (s) =>
        s.isEndorsement &&
        (type === "Cancellation" || (s.seq !== null && ownSeq != null && s.seq < ownSeq))
    )
    .reduce((sum, s) => sum + s.sumInsured, parentSumInsured)
}

/** Nomor lampiran dua digit, seperti "01" di contoh EDM. */
export function endorsementNo(seq: number | null | undefined) {
  return seq ? String(seq).padStart(2, "0") : "—"
}

/**
 * Pembuka cukup bahasa Inggris (Harry, 12 November 2026): endorsement menyebut "amended as
 * follows", pembatalan hanya tanggal efektifnya.
 */
export function endorsementOpening(type: PolicyType, effectiveDate: string) {
  const since = `It is hereby noted and agreed that with effect from ${dateEn(effectiveDate)}`
  return type === "Cancellation"
    ? `${since}:`
    : `${since}, the above-mentioned policy is amended as follows:`
}

/** Penutup isi perubahan di endorsement dan cancellation slip. */
export const TERMS_UNCHANGED = "All other terms and conditions remain unchanged."

/** Isi perubahan dari Remarks; pembatalan tanpa remarks tetap tertulis dibatalkan. */
export function endorsementBody(type: PolicyType, remarks: string | null | undefined) {
  const text = remarks?.trim()
  if (text) return text
  return type === "Cancellation" ? "This policy is CANCELLED." : ""
}

/**
 * Label baris premi: premi tambahan, refund premi (negatif), atau nihil, dicetak dengan istilah
 * asuransi berbahasa Inggris (Harry, 11 November 2026).
 */
export function premiumAdjustmentLabel(amount: number) {
  if (amount > 0) return "Additional Premium"
  if (amount < 0) return "Return Premium"
  return "Premium Adjustment"
}

/** Nilai bertanda seperti contoh EDM: pengurangan ditulis dalam kurung. */
export function signedMoney(amount: number, currency: string) {
  return amount < 0 ? `(${moneyCents(-amount, currency)})` : moneyCents(amount, currency)
}

/**
 * Nama slip perubahan untuk pesan, misalnya "endorsement slip
 * 019/LCH-PLCMT/ES-MV/XI/2026", atau "draft endorsement slip" sebelum terbit.
 */
export function changeSlipName(lock: Pick<ChangeSlipLock, "kind" | "slipNo">) {
  const kind = lock.kind === "Cancellation" ? "cancellation slip" : "endorsement slip"
  return lock.slipNo ? `${kind} ${lock.slipNo}` : `draft ${kind}`
}

/**
 * Alasan slip asal tidak bisa direvisi: sudah ada slip perubahan darinya. Slip perubahan bisa
 * dihapus (draft) atau dibatalkan (terbit), lalu slip asal bisa direvisi lagi.
 */
export function changeSlipLockText(lock: Pick<ChangeSlipLock, "kind" | "slipNo" | "status">) {
  const name = changeSlipName(lock)
  if (lock.kind === "Cancellation" && lock.status === "Closed") {
    return `Slip ini terkunci karena polisnya sudah dibatalkan lewat ${name}.`
  }
  const reason = `Slip ini terkunci karena sudah ada ${name}. Perubahan polis berikutnya dibuat lewat endorsement slip, bukan dengan merevisi slip ini.`
  if (lock.status === "Closed") return reason
  return lock.status === "Draft"
    ? `${reason} Kalau slip ini masih perlu direvisi, hapus dulu ${name} itu.`
    : `${reason} Kalau slip ini masih perlu direvisi, batalkan dulu ${name}.`
}
