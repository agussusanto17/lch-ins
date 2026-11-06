/**
 * Peserta PA grup di polis (jawaban Harry, 6 November 2026): daftar disalin
 * dari slip saat polis dibuat, lalu endorsement menambah atau mengurangi
 * peserta dengan tanggal berlakunya, supaya klaim bisa menunjuk peserta yang
 * dijamin pada tanggal kejadian.
 */
import type { SlipParticipant } from "./data/types"

/** Peserta di daftar polis, dengan riwayat tambah dan kurangnya. */
export interface PolicyParticipant extends SlipParticipant {
  /** Mulai dijamin: tanggal mulai polis atau tanggal endorsement penambahan. */
  startDate: string
  /** Berhenti dijamin karena endorsement pengurangan; null berarti aktif. */
  endDate: string | null
  /** Nomor polis endorsement yang menambah peserta ini. */
  addedByPolicyNo: string | null
  /** Nomor polis endorsement yang mengurangi peserta ini. */
  removedByPolicyNo: string | null
}

/** Perubahan peserta yang dibawa endorsement baru. */
export interface ParticipantChanges {
  added: SlipParticipant[]
  /** Id peserta aktif di daftar polis induk yang berhenti dijamin. */
  removedIds: string[]
}

/**
 * Polis pemilik daftar peserta: naik ke polis induk selama polisnya
 * endorsement atau pembatalan, sama dengan server. Endorsement boleh dipilih
 * sebagai induk endorsement berikutnya, tapi daftar dan rate tetap milik
 * polis asalnya.
 */
export function rosterPolicy<
  P extends { id: string; type: string; parentPolicyId?: string | null },
>(policy: P, policies: readonly P[]): P {
  let current = policy
  for (let i = 0; i < 20; i++) {
    if (current.type !== "Endorsement" && current.type !== "Cancellation") return current
    const parent = current.parentPolicyId
      ? policies.find((p) => p.id === current.parentPolicyId)
      : undefined
    if (!parent) return current
    current = parent
  }
  return current
}

const DAY = 86_400_000
const days = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY)

/** Peserta yang dijamin pada sebuah tanggal, misalnya tanggal kejadian klaim. */
export function participantActiveOn(
  p: Pick<PolicyParticipant, "startDate" | "endDate">,
  date: string
) {
  return p.startDate <= date && (p.endDate == null || date < p.endDate)
}

/**
 * Usulan Total Sum Insured dan premi endorsement dari perubahan peserta:
 * perubahan UP × rate polis induk × sisa periode, pro-rata harian. Rate polis
 * induk = premi ÷ total sum insured, karena PA grup LCH memakai satu rate
 * untuk semua peserta. Premi bisa negatif untuk pengurangan peserta.
 */
export function endorsementSuggestion({
  parent,
  effectiveDate,
  addedTotal,
  removedTotal,
}: {
  parent: { inceptionDate: string; expiryDate: string; sumInsured: number; premium: number }
  effectiveDate: string
  addedTotal: number
  removedTotal: number
}) {
  const netSumInsured = addedTotal - removedTotal
  const rate = parent.sumInsured > 0 ? parent.premium / parent.sumInsured : 0
  const period = days(parent.inceptionDate, parent.expiryDate)
  const remaining = Math.min(period, Math.max(0, days(effectiveDate, parent.expiryDate)))
  const factor = period > 0 ? remaining / period : 0
  const premium = Math.round(netSumInsured * rate * factor * 100) / 100
  return { netSumInsured, rate, remainingDays: remaining, periodDays: period, factor, premium }
}
