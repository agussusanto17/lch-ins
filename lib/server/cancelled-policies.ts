import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { cancelledPolicies } from "@/lib/data/policy-status"
import { POLICY_TYPE_CODES, systemValueFromRow } from "@/lib/form-options"
import { prisma } from "@/lib/prisma"

/**
 * Polis yang sudah dibatalkan → no. record Cancellation-nya (lihat
 * `cancelledPolicies`). Cukup memuat record Endorsement dan Cancellation,
 * karena polis asal adalah induk endorsement yang paling atas. Dipakai Policy
 * Database, Placement, dan topbar supaya aturannya sama.
 */
export async function loadCancelledPolicies(
  db: Prisma.TransactionClient = prisma
): Promise<Map<string, string>> {
  const rows = await db.policy.findMany({
    where: {
      policyType: {
        code: { in: [POLICY_TYPE_CODES.Endorsement, POLICY_TYPE_CODES.Cancellation] },
      },
    },
    select: {
      id: true,
      policyNo: true,
      parentPolicyId: true,
      policyType: { select: { code: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  })
  return cancelledPolicies(
    rows.map((r) => ({
      id: r.id,
      policyNo: r.policyNo,
      parentPolicyId: r.parentPolicyId,
      type: systemValueFromRow(POLICY_TYPE_CODES, r.policyType, "Baru"),
    }))
  )
}
