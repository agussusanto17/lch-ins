import "server-only"

import { derivedDocNumber } from "@/components/underwriting/slip-model"
import { slipPolicyParts } from "@/lib/calc"
import type { SlipPart } from "@/lib/data/types"
import { usesOpenCover } from "@/lib/open-cover"
import {
  policyFieldsFromSlip,
  provisionalPolicyNo,
  slipExistingPolicyNo,
} from "@/lib/policy-from-slip"
import { prisma } from "@/lib/prisma"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { createPolicy } from "@/lib/server/policies"

/** Nomor polis yang berasal dari slip ini, untuk keterangan di dokumen CI. */
export async function policyNosForSlip(slipId: string): Promise<string[]> {
  const policies = await prisma.policy.findMany({
    where: { placingSlipId: slipId },
    select: { policyNo: true },
    orderBy: { createdAt: "asc" },
  })
  return policies.map((p) => p.policyNo)
}

export interface AutoPolicyResult {
  /** Nomor polis yang baru dicatat. */
  created: string[]
  /** Alasan polis tidak dicatat otomatis, untuk ditampilkan ke pengguna. */
  skipped: string | null
}

/**
 * Polis otomatis dari Closing Instruction (meeting LCH, 10 November 2026):
 * begitu CI terbit, polisnya langsung tercatat di Policy Database, jadi
 * petugas polis tinggal mengganti nomor polis dan mengunggah polis dari
 * asuransi.
 *
 * - Data polis disalin dengan aturan yang sama seperti "polis dari slip" di
 *   form polis. Slip PAR + EQVET menjadi satu polis per bagian.
 * - Nomor polis sementara memakai nomor CI.
 * - Slip yang punya Existing Policy No. dicatat sebagai Renewal dengan nomor
 *   polis sebelumnya.
 * - Bagian yang sudah punya polis tidak dibuat lagi.
 * - Slip open cover dilewati karena polisnya per deklarasi. Slip tanpa periode
 *   juga dilewati, karena polis wajib bertanggal.
 */
export async function recordPoliciesFromClosing(
  slipId: string,
  userId: string
): Promise<AutoPolicyResult> {
  const slip = await getPlacingSlipById(slipId)
  if (!slip || slip.status !== "Closed") return { created: [], skipped: null }
  if (usesOpenCover(slip)) {
    return {
      created: [],
      skipped: "Slip open cover: polis dicatat per deklarasi di Policy Database.",
    }
  }
  if (!slip.inceptionDate || !slip.expiryDate) {
    return {
      created: [],
      skipped: "Periode slip belum diisi, jadi polis belum dicatat otomatis.",
    }
  }

  const existing = await prisma.policy.findMany({
    where: { placingSlipId: slip.id },
    select: { slipPart: true },
  })
  // Polis lama tanpa bagian memakai seluruh slip.
  if (existing.some((p) => !p.slipPart)) return { created: [], skipped: null }
  const parts = slipPolicyParts(slip)
  const wanted: (SlipPart | null)[] = parts.length ? parts : [null]
  const missing = wanted.filter(
    (part) => !existing.some((p) => (p.slipPart ?? null) === part)
  )
  if (!missing.length) return { created: [], skipped: null }

  const client = slip.clientId
    ? await prisma.client.findUnique({
        where: { id: slip.clientId },
        select: { id: true, name: true },
      })
    : null
  const ciNo = derivedDocNumber(slip.slipNo, "CI") ?? slip.slipNo ?? slip.id
  const previousPolicyNo = slipExistingPolicyNo(slip)

  const created: string[] = []
  for (const part of missing) {
    const policy = await createPolicy(
      {
        ...policyFieldsFromSlip(slip, part, client),
        policyNo: provisionalPolicyNo(ciNo, part),
        type: previousPolicyNo ? "Renewal" : "Baru",
        parentPolicyId: null,
        previousPolicyNo,
        cobOjkClassId: null,
        placementLocationId: null,
        groupingInsured: "",
      },
      userId
    )
    created.push(policy.policyNo)
  }
  return { created, skipped: null }
}
