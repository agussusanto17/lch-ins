/**
 * Renewal boleh tanpa polis rujukan di sistem, cukup nomornya, karena polis sebelum 2026 belum
 * tercatat (Agus, 9 November 2026). Endorsement dan pembatalan tetap wajib memilih polisnya.
 */
import { POLICY_TYPES_WITH_PARENT } from "./data/reference"
import type { PolicyType } from "./data/types"

type ParentFields = {
  type: PolicyType
  parentPolicyId: string | null
  previousPolicyNo?: string | null
}

export function parentPolicyLabel(type: PolicyType) {
  if (type === "Renewal") return "Polis Sebelumnya"
  if (type === "Endorsement") return "Polis yang Di-endorse"
  if (type === "Cancellation") return "Polis yang Dibatalkan"
  return "Polis Induk"
}

/** Pesan bila polis rujukan belum diisi, atau null bila sudah cukup. */
export function parentPolicyIssue(d: ParentFields) {
  if (!POLICY_TYPES_WITH_PARENT.includes(d.type) || d.parentPolicyId) return null
  if (d.type === "Renewal") {
    return d.previousPolicyNo?.trim()
      ? null
      : "Pilih polis sebelumnya, atau isi nomornya bila belum ada di sistem"
  }
  return `${parentPolicyLabel(d.type)} wajib dipilih`
}

/** No. polis sebelumnya yang disimpan: hanya renewal tanpa polis sebelumnya di sistem. */
export function storedPreviousPolicyNo(d: ParentFields) {
  if (d.type !== "Renewal" || d.parentPolicyId) return null
  return d.previousPolicyNo?.trim() || null
}

/** Keterangan polis rujukan di daftar polis, misalnya "renewal dari PAR/2025/0871". */
export function parentPolicyNote(
  p: Pick<ParentFields, "type" | "previousPolicyNo"> & { parentPolicyNo: string | null }
) {
  const no = p.parentPolicyNo ?? p.previousPolicyNo?.trim() ?? null
  if (!no) return null
  if (p.type === "Renewal") return `renewal dari ${no}`
  if (p.type === "Endorsement") return `endorsement ${no}`
  if (p.type === "Cancellation") return `pembatalan ${no}`
  return `induk ${no}`
}
