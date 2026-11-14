import { daysBetween } from "../date"
import type { PolicyStatus } from "./types"

/** Polis dianggap akan berakhir dalam jendela renewal notice. */
export const EXPIRING_WINDOW_DAYS = 60

/**
 * Status polis dihitung dari tanggal berakhir (PRD A-17), tidak disimpan. Polis dengan record
 * Cancellation, beserta endorsement dan pembatalannya, selalu berstatus Cancelled.
 */
export function policyStatus(
  policy: { expiryDate: string; cancelled?: boolean },
  today: string
): PolicyStatus {
  if (policy.cancelled) return "Cancelled"
  const days = daysBetween(today, policy.expiryDate)
  if (days < 0) return "Expired"
  if (days <= EXPIRING_WINDOW_DAYS) return "Expiring"
  return "Active"
}

/** Baris polis secukupnya untuk menelusuri polis asal sebuah pembatalan. */
export interface PolicyLink {
  id: string
  policyNo: string
  type: string
  parentPolicyId?: string | null
}

const isChange = (p: PolicyLink) =>
  p.type === "Endorsement" || p.type === "Cancellation"

/**
 * Polis asal tiap Cancellation dan endorsementnya dipetakan ke no. Cancellation; induk pembatalan
 * bisa endorsement, jadi dicari naik. `links` wajib memuat semua Endorsement dan Cancellation.
 */
export function cancelledPolicies(links: readonly PolicyLink[]): Map<string, string> {
  const byId = new Map(links.map((p) => [p.id, p]))
  const rootOf = (p: PolicyLink) => {
    let current = p
    for (let i = 0; i < 20; i++) {
      if (!isChange(current) || !current.parentPolicyId) return current.id
      const parent = byId.get(current.parentPolicyId)
      if (!parent) return current.parentPolicyId
      current = parent
    }
    return current.id
  }

  const roots = new Map<string, string>()
  for (const p of links) {
    if (p.type !== "Cancellation") continue
    const root = rootOf(p)
    if (!roots.has(root)) roots.set(root, p.policyNo)
  }
  const cancelled = new Map(roots)
  for (const p of links) {
    const no = isChange(p) ? roots.get(rootOf(p)) : undefined
    if (no) cancelled.set(p.id, no)
  }
  return cancelled
}
