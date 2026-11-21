import "server-only"

import { CLAIM_STATUS_CODES, POLICY_TYPE_CODES, systemValueFromRow } from "@/lib/form-options"
import type { LossRatioReportData, LrClaim, LrPolicy } from "@/lib/loss-ratio-report"
import { prisma } from "@/lib/prisma"

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Data report loss ratio: polis yang tahun polisnya (polis Baru/Renewal induk) mulai di periode,
 * beserta endorsement, pembatalan, dan deklarasinya, serta klaimnya. Klaim yang tercatat di polis
 * perubahan ikut ke polis induk tahun polisnya.
 */
export async function listLossRatioReport(start: string, end: string): Promise<LossRatioReportData> {
  const rows = await prisma.policy.findMany({
    select: {
      id: true,
      policyNo: true,
      parentPolicyId: true,
      inceptionDate: true,
      currencyCode: true,
      premium: true,
      discountAmount: true,
      brokeragePct: true,
      insuredName: true,
      groupingInsured: true,
      client: { select: { name: true } },
      policyType: { select: { code: true, name: true } },
      cob: { select: { code: true, name: true } },
      insurers: {
        select: { sharePct: true, additionalFeePct: true, insurer: { select: { name: true } } },
        orderBy: { sharePct: "desc" },
      },
    },
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  const typeOf = (r: (typeof rows)[number]) => systemValueFromRow(POLICY_TYPE_CODES, r.policyType, "Baru")
  // Endorsement, pembatalan, dan deklarasi ikut tahun polis induknya; Renewal membuka tahun baru.
  const rootOf = (id: string) => {
    let current = byId.get(id)
    for (let i = 0; current && i < 20; i++) {
      const type = typeOf(current)
      if (type === "Baru" || type === "Renewal" || !current.parentPolicyId) return current
      const parent = byId.get(current.parentPolicyId)
      if (!parent) return current
      current = parent
    }
    return current
  }

  const policies: LrPolicy[] = []
  for (const r of rows) {
    const root = rootOf(r.id)
    if (!root) continue
    const yearStart = isoDate(root.inceptionDate)
    if (yearStart < start || yearStart > end) continue
    policies.push({
      id: r.id,
      rootId: root.id,
      yearStart,
      policyNo: r.policyNo,
      type: typeOf(r),
      cobCode: r.cob.code,
      cob: r.cob.name.toUpperCase(),
      // Akun = grouping insured polis induk (Team LCH: "D BEST GROUP", "SPIL Warehouse").
      account:
        root.groupingInsured?.trim() || root.client?.name?.trim() || root.insuredName.trim(),
      currency: r.currencyCode,
      premium: Number(r.premium),
      discount: Number(r.discountAmount),
      brokeragePct: Number(r.brokeragePct),
      insurers: r.insurers.map((i) => ({
        insurer: i.insurer.name,
        share: Number(i.sharePct),
        additionalFeePct: Number(i.additionalFeePct),
      })),
    })
  }

  const inRange = new Set(policies.map((p) => p.rootId))
  const claimRows = await prisma.claim.findMany({
    select: {
      id: true,
      claimNo: true,
      policyId: true,
      paidAmount: true,
      adjusterFeeAmount: true,
      salvageAmount: true,
      currencyCode: true,
      status: { select: { code: true, name: true } },
    },
  })
  const claims: LrClaim[] = []
  for (const c of claimRows) {
    if (!c.policyId) continue
    const root = rootOf(c.policyId)
    if (!root || !inRange.has(root.id)) continue
    claims.push({
      id: c.id,
      claimNo: c.claimNo,
      rootId: root.id,
      status: systemValueFromRow(CLAIM_STATUS_CODES, c.status, "Outstanding"),
      paidAmount: Number(c.paidAmount),
      adjusterFeeAmount: Number(c.adjusterFeeAmount),
      salvageAmount: Number(c.salvageAmount),
      currency: c.currencyCode,
    })
  }
  return { policies, claims }
}
