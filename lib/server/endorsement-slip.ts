import "server-only"

import type { Client } from "@/lib/data/types"
import { todayIso } from "@/lib/date"
import { prisma } from "@/lib/prisma"
import { getClientById } from "@/lib/server/clients"
import { getPlacingSlipById, type PlacingSlipRecord } from "@/lib/server/placing-slips"
import { getPolicyById, type PolicyRecord } from "@/lib/server/policies"
import { deductibleGroups, type DeductibleGroupText } from "@/lib/slip-deductibles"

export interface EndorsementSlipData {
  /** Record endorsement atau pembatalan di Policy Database. */
  policy: PolicyRecord
  /** Polis yang di-endorse. */
  parent: PolicyRecord | null
  /** Placing slip sumber polis induk: jenis pertanggungan, deductible, klausul. */
  slip: PlacingSlipRecord | null
  address: string
  /** Sum insured sebelum endorsement ini: polis induk ditambah endorsement sebelumnya. */
  sumInsuredBefore: number | null
  deductibles: DeductibleGroupText[]
  /** Tanggal endorsement dicatat (WIB), untuk tanggal dokumen. */
  recordedDate: string
}

function mailingAddress(client: Client | null) {
  const addresses = client?.addresses ?? []
  return (addresses.find((a) => a.isPrimary) ?? addresses[0])?.value ?? ""
}

/**
 * Data cetak endorsement (permintaan LCH, 10 November 2026). Data polis
 * induk dan slip sumbernya ikut dimuat, karena isi endorsement di contoh
 * asuransi mengulang data polis yang di-endorse.
 */
export async function getEndorsementSlipData(id: string): Promise<EndorsementSlipData | null> {
  const policy = await getPolicyById(id)
  if (!policy || (policy.type !== "Endorsement" && policy.type !== "Cancellation")) {
    return null
  }
  const parent = policy.parentPolicyId ? await getPolicyById(policy.parentPolicyId) : null
  const slipId = parent?.placingSlipId ?? policy.placingSlipId
  const slip = slipId ? await getPlacingSlipById(slipId) : null
  const clientId = policy.clientId ?? parent?.clientId ?? null
  const client = clientId ? await getClientById(clientId) : null

  const [recorded, earlier] = await Promise.all([
    prisma.policy.findUnique({ where: { id }, select: { createdAt: true } }),
    parent
      ? prisma.policy.findMany({
          where: {
            parentPolicyId: parent.id,
            id: { not: id },
            endorsementSeq: { lt: policy.endorsementSeq ?? 0 },
          },
          select: { sumInsured: true },
        })
      : Promise.resolve([]),
  ])

  const part =
    parent?.slipPart === "PAR" || parent?.slipPart === "EQVET" ? parent.slipPart : null
  return {
    policy,
    parent,
    slip,
    address: mailingAddress(client),
    sumInsuredBefore: parent
      ? earlier.reduce((sum, e) => sum + Number(e.sumInsured), parent.sumInsured)
      : null,
    deductibles: slip ? deductibleGroups(slip, part) : [],
    recordedDate: todayIso(recorded?.createdAt ?? new Date()),
  }
}
