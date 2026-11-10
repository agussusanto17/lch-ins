/**
 * Isi cetak endorsement dari Policy Database, mengikuti contoh endorsement
 * asuransi yang dikirim Harry (`documents/45020126015995 - EDM 01.pdf` dan
 * `45020126008633 - CANCELLATION.pdf`, 10 November 2026).
 */

import type { PolicyType } from "@/lib/data/types"
import { dateLong, moneyCents } from "@/lib/format"

/** Judul dokumen: ENDORSEMENT, atau CANCELLATION untuk pembatalan. */
export function endorsementTitle(type: PolicyType) {
  return type === "Cancellation" ? "CANCELLATION" : "ENDORSEMENT"
}

/** Nomor lampiran dua digit, seperti "01" di contoh EDM. */
export function endorsementNo(seq: number | null | undefined) {
  return seq ? String(seq).padStart(2, "0") : "—"
}

/**
 * Kalimat pembuka perubahan. Endorsement menyebut "perubahan sebagai
 * berikut", pembatalan hanya tanggal efektifnya, seperti di kedua contoh.
 */
export function endorsementOpening(type: PolicyType, effectiveDate: string) {
  const since = `Dengan ini dicatat dan disetujui bahwa terhitung sejak tanggal ${dateLong(effectiveDate)}`
  return type === "Cancellation"
    ? `${since} :`
    : `${since}, pada polis tersebut di atas diadakan perubahan sebagai berikut :`
}

/** Isi perubahan dari Remarks; pembatalan tanpa remarks tetap tertulis dibatalkan. */
export function endorsementBody(type: PolicyType, remarks: string | null | undefined) {
  const text = remarks?.trim()
  if (text) return text
  return type === "Cancellation" ? "Polis ini DIBATALKAN." : ""
}

/** Label baris premi: tambahan premi, pengembalian premi (negatif), atau nihil. */
export function premiumAdjustmentLabel(amount: number) {
  if (amount > 0) return { id: "Premi Tambahan", en: "Additional Premium" }
  if (amount < 0) return { id: "Pengembalian Premi", en: "Return Premium" }
  return { id: "Penyesuaian Premi", en: "Premium Adjustment" }
}

/** Nilai bertanda seperti contoh EDM: pengurangan ditulis dalam kurung. */
export function signedMoney(amount: number, currency: string) {
  return amount < 0 ? `(${moneyCents(-amount, currency)})` : moneyCents(amount, currency)
}
