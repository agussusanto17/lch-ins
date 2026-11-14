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
 * Data cetak endorsement (LCH, 10 November 2026). Polis induk dan slip sumbernya ikut dimuat
 * karena isi endorsement di contoh asuransi mengulang data polis yang di-endorse.
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

export interface EndorsementSlipPrint {
  slip: PlacingSlipRecord
  address: string
  deductibles: DeductibleGroupText[]
  /** Nomor lampiran: urutan endorsement di polis induk. */
  attachmentSeq: number | null
  /** Record Policy Database dari slip ini, kalau slip sudah Closed. */
  recordedPolicyNo: string | null
}

/**
 * Data cetak endorsement atau cancellation slip dari Placement (Harry, 11 November 2026).
 * Nomor lampiran dari urutan record tercatat, atau sesudah endorsement terakhir polis induk.
 */
export async function getEndorsementSlipPrint(id: string): Promise<EndorsementSlipPrint | null> {
  const slip = await getPlacingSlipById(id)
  if (!slip || !slip.kind || slip.kind === "Placing") return null
  const client = slip.clientId ? await getClientById(slip.clientId) : null
  const [recorded, siblings] = await Promise.all([
    prisma.policy.findFirst({
      where: { placingSlipId: slip.dbId },
      select: { id: true, policyNo: true, endorsementSeq: true },
    }),
    slip.parentPolicyId
      ? prisma.policy.findMany({
          where: { parentPolicyId: slip.parentPolicyId },
          select: { id: true, endorsementSeq: true, policyType: { select: { code: true } } },
        })
      : Promise.resolve([]),
  ])
  const nextSeq =
    Math.max(
      0,
      ...siblings
        .filter((s) => s.id !== recorded?.id && s.policyType.code === POLICY_TYPE_CODES.Endorsement)
        .map((s) => s.endorsementSeq ?? 0)
    ) + 1
  return {
    slip,
    address: slip.correspondenceAddress?.trim() || mailingAddress(client),
    deductibles: deductibleGroups(slip, null),
    attachmentSeq: recorded?.endorsementSeq ?? (slip.parentPolicyId ? nextSeq : null),
    recordedPolicyNo: recorded?.policyNo ?? null,
  }
}
