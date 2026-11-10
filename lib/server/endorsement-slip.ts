import "server-only"

import type { Client } from "@/lib/data/types"
import { todayIso } from "@/lib/date"
import {
  attachmentSeq,
  sumInsuredBefore,
  type SiblingEndorsement,
} from "@/lib/endorsement-slip"
import { POLICY_TYPE_CODES } from "@/lib/form-options"
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
  /** Nomor lampiran; pembatalan memakai nomor sesudah endorsement terakhir. */
  attachmentSeq: number | null
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

  const [recorded, siblingRows] = await Promise.all([
    prisma.policy.findUnique({ where: { id }, select: { createdAt: true } }),
    parent
      ? prisma.policy.findMany({
          where: { parentPolicyId: parent.id, id: { not: id } },
          select: {
            sumInsured: true,
            endorsementSeq: true,
            policyType: { select: { code: true } },
          },
        })
      : Promise.resolve([]),
  ])
  const siblings: SiblingEndorsement[] = siblingRows.map((s) => ({
    isEndorsement: s.policyType.code === POLICY_TYPE_CODES.Endorsement,
    seq: s.endorsementSeq,
    sumInsured: Number(s.sumInsured),
  }))

  const part =
    parent?.slipPart === "PAR" || parent?.slipPart === "EQVET" ? parent.slipPart : null
  return {
    policy,
    parent,
    slip,
    address: mailingAddress(client),
    sumInsuredBefore: parent
      ? sumInsuredBefore(policy.type, policy.endorsementSeq, parent.sumInsured, siblings)
      : null,
    attachmentSeq: attachmentSeq(policy.type, policy.endorsementSeq, siblings),
    deductibles: slip ? deductibleGroups(slip, part) : [],
    recordedDate: todayIso(recorded?.createdAt ?? new Date()),
  }
}
