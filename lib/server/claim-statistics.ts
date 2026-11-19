import "server-only"

import type { ClaimStatisticsData, ClaimStatRow } from "@/lib/claim-statistics"
import { CLAIM_STATUSES } from "@/lib/data/reference"
import type { ClaimStatus } from "@/lib/data/types"
import { CLAIM_STATUS_CODES, systemValueFromRow } from "@/lib/form-options"
import { normalizeCob } from "@/lib/format"
import { prisma } from "@/lib/prisma"

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Klaim untuk Statistik Klaim per Status (MoM review Phase 1, poin 17): tanggal lapor dalam
 * periode, atau tanggal kejadian bila tanggal lapor kosong.
 */
export async function listClaimStatistics(start: string, end: string): Promise<ClaimStatisticsData> {
  const range = { gte: new Date(start), lte: new Date(end) }
  const [claims, statusLookups, stageLookups] = await Promise.all([
    prisma.claim.findMany({
      where: {
        OR: [{ reportedDate: range }, { reportedDate: null, lossDate: range }],
      },
      select: {
        claimNo: true,
        currencyCode: true,
        estimatedLoss: true,
        claimedAmount: true,
        paidAmount: true,
        adjusterFeeAmount: true,
        salvageAmount: true,
        lossDate: true,
        reportedDate: true,
        documentCompleteDate: true,
        spkDate: true,
        lossDescription: true,
        notes: true,
        status: { select: { code: true, name: true } },
        stage: { select: { code: true, name: true } },
        adjuster: { select: { name: true } },
        policy: {
          select: {
            policyNo: true,
            insuredName: true,
            sumInsured: true,
            cob: { select: { name: true } },
            insurers: {
              select: {
                insurer: { select: { name: true } },
                position: { select: { code: true } },
              },
              orderBy: { sharePct: "desc" },
            },
          },
        },
        followups: {
          select: { followupDate: true, note: true },
          orderBy: [{ followupDate: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
      orderBy: [{ reportedDate: "asc" }, { lossDate: "asc" }, { claimNo: "asc" }],
    }),
    prisma.lookupValue.findMany({
      where: { lookupType: "claim_status" },
      select: { code: true, name: true },
    }),
    prisma.lookupValue.findMany({
      where: { lookupType: "claim_stage", isActive: true },
      select: { name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ])

  // Nama status dari Master Data, dicocokkan lewat kode seperti daftar klaim.
  const statusLabels = Object.fromEntries(
    CLAIM_STATUSES.map((s) => [
      s,
      statusLookups.find((l) => l.code === CLAIM_STATUS_CODES[s])?.name ?? s,
    ])
  ) as Record<ClaimStatus, string>

  const rows: ClaimStatRow[] = claims.map((c) => {
    const insurers = c.policy.insurers
    const leader = insurers.find((i) => i.position.code === "leader")?.insurer.name
    const followup = c.followups[0]
    return {
      claimNo: c.claimNo,
      insuredName: c.policy.insuredName,
      insurer: leader || insurers[0]?.insurer.name || "",
      policyNo: c.policy.policyNo,
      cob: normalizeCob(c.policy.cob.name),
      currency: c.currencyCode,
      sumInsured: Number(c.policy.sumInsured),
      estimatedLoss: Number(c.estimatedLoss),
      claimedAmount: Number(c.claimedAmount),
      paidAmount: Number(c.paidAmount),
      adjusterFeeAmount: Number(c.adjusterFeeAmount),
      salvageAmount: Number(c.salvageAmount),
      lossDate: isoDate(c.lossDate),
      reportedDate: c.reportedDate ? isoDate(c.reportedDate) : null,
      documentCompleteDate: c.documentCompleteDate ? isoDate(c.documentCompleteDate) : null,
      spkDate: c.spkDate ? isoDate(c.spkDate) : null,
      status: systemValueFromRow(CLAIM_STATUS_CODES, c.status, "Outstanding"),
      stage: c.stage?.name || "Tunggu Dokumen",
      adjuster: c.adjuster?.name ?? "",
      lossDescription: c.lossDescription ?? "",
      notes: c.notes ?? "",
      lastFollowup: followup
        ? { date: isoDate(followup.followupDate), note: followup.note }
        : null,
    }
  })

  return { claims: rows, statusLabels, stages: stageLookups.map((s) => s.name) }
}
