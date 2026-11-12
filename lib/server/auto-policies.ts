import "server-only"

import { derivedDocNumber } from "@/components/underwriting/slip-model"
import { slipPolicyParts } from "@/lib/calc"
import type { SlipPart } from "@/lib/data/types"
import { usesOpenCover } from "@/lib/open-cover"
import {
  changedSlipFields,
  isProvisionalPolicyNo,
  policyFieldsFromSlip,
  provisionalPolicyNo,
  slipExistingPolicyNo,
} from "@/lib/policy-from-slip"
import { prisma } from "@/lib/prisma"
import { getPlacingSlipById, type PlacingSlipRecord } from "@/lib/server/placing-slips"
import { createPolicy, getPolicyById, updatePolicy } from "@/lib/server/policies"
import { slipEndorsementAdjustment } from "@/lib/endorsement-calc"

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

/**
 * Revisi slip setelah Closing Instruction terbit ikut ke polis yang masih
 * bernomor sementara dari CI (laporan Agus, 10 November 2026: additional fee
 * yang diisi setelah CI terbit tidak masuk report produksi).
 *
 * - Hanya isian slip yang berubah pada revisi ini yang disalin, jadi isian
 *   yang diubah petugas polis di Policy Database tidak tertimpa.
 * - Polis yang nomornya sudah diganti nomor polis dari asuransi tidak
 *   disentuh, karena sejak itu datanya mengikuti polis asli.
 *
 * `before` adalah slip sebelum revisi disimpan. Mengembalikan nomor polis yang
 * ikut diperbarui.
 */
export async function syncPoliciesFromSlipRevision(
  before: PlacingSlipRecord,
  userId: string
): Promise<string[]> {
  const after = await getPlacingSlipById(before.id)
  if (!after || after.status !== "Closed") return []
  const policies = await prisma.policy.findMany({
    where: { placingSlipId: after.id },
    select: { id: true, policyNo: true, slipPart: true },
    orderBy: { createdAt: "asc" },
  })
  const targets = policies.filter((p) => isProvisionalPolicyNo(p.policyNo))
  if (!targets.length) return []

  const clientOf = (id: string | null | undefined) =>
    id
      ? prisma.client.findUnique({ where: { id }, select: { id: true, name: true } })
      : Promise.resolve(null)
  const clientAfter = await clientOf(after.clientId)
  const clientBefore =
    before.clientId === after.clientId ? clientAfter : await clientOf(before.clientId)

  const updated: string[] = []
  for (const target of targets) {
    const part: SlipPart | null =
      target.slipPart === "PAR" || target.slipPart === "EQVET" ? target.slipPart : null
    const changes = changedSlipFields(
      policyFieldsFromSlip(before, part, clientBefore),
      policyFieldsFromSlip(after, part, clientAfter)
    )
    if (!Object.keys(changes).length) continue
    const policy = await getPolicyById(target.id)
    if (!policy) continue
    const saved = await updatePolicy(policy.id, { ...policy, ...changes }, userId)
    updated.push(saved.policyNo)
  }
  return updated
}

/**
 * Endorsement atau cancellation slip yang Closed tercatat di Policy Database
 * sebagai Endorsement atau Cancellation polis induknya (Harry, 11 November
 * 2026). Selisih sum insured dan premi dihitung dari perhitungan sebelum dan
 * sesudah slip. Nomornya sementara memakai nomor ES/CS; petugas polis
 * menggantinya dengan nomor endorsement dari asuransi saat mengunggahnya.
 */
export async function recordEndorsementFromSlip(
  slipId: string,
  userId: string
): Promise<AutoPolicyResult> {
  const slip = await getPlacingSlipById(slipId)
  if (!slip || slip.status !== "Closed" || !slip.kind || slip.kind === "Placing") {
    return { created: [], skipped: null }
  }
  const recorded = await prisma.policy.findFirst({
    where: { placingSlipId: slip.dbId },
    select: { id: true },
  })
  if (recorded) return { created: [], skipped: null }
  const parent = slip.parentPolicyId ? await getPolicyById(slip.parentPolicyId) : null
  if (!parent) {
    return { created: [], skipped: "Polis induk endorsement slip ini tidak ditemukan di Policy Database." }
  }
  const adjustment = slipEndorsementAdjustment(slip)
  if (!adjustment || !slip.effectiveDate) {
    return { created: [], skipped: "Tanggal efektif endorsement slip belum diisi." }
  }
  const policy = await createPolicy(
    {
      ...parent,
      policyNo: slip.slipNo ?? slip.dbId,
      type: slip.kind,
      parentPolicyId: parent.id,
      previousPolicyNo: null,
      placingSlipId: slip.dbId,
      slipPart: null,
      inceptionDate: slip.effectiveDate,
      expiryDate: parent.expiryDate,
      sumInsured: adjustment.sumInsuredChange,
      premium: adjustment.premium,
      // Additional fee dihitung server: premi endorsement × fee (%) asuransi polis induk.
      rate: null,
      premiumBasis: null,
      adminCost: slip.adminCost ?? 0,
      stampDuty: slip.stampDuty ?? 0,
      premiumPaidDate: null,
      remarks: slip.changeDescription ?? null,
    },
    userId
  )
  return { created: [policy.policyNo], skipped: null }
}
