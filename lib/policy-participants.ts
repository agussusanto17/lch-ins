/**
 * Peserta PA grup disalin dari slip saat polis dibuat, lalu endorsement menambah atau mengurangi
 * dengan tanggal berlaku, supaya klaim menunjuk peserta yang dijamin (Harry, 6 November 2026).
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
  /** Jumlah klaim yang menunjuk peserta ini. */
  claimCount?: number
  /** Tanggal kejadian klaim terakhir; peserta tidak bisa berhenti sebelum tanggal ini. */
  lastLossDate?: string | null
}

/** Perubahan peserta yang dibawa endorsement baru. */
export interface ParticipantChanges {
  added: SlipParticipant[]
  /** Id peserta aktif di daftar polis induk yang berhenti dijamin. */
  removedIds: string[]
}

/**
 * Polis pemilik daftar peserta: naik ke induk selama endorsement atau pembatalan, sama dengan
 * server. Endorsement bisa jadi induk, tapi daftar dan rate tetap milik polis asalnya.
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
 * Usulan premi = perubahan UP × rate induk × sisa periode prorata harian; rate induk = premi ÷ TSI
 * karena PA grup LCH memakai satu rate. Premi negatif untuk pengurangan peserta.
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
