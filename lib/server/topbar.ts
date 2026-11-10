import "server-only"

import { canAccess } from "@/lib/access"
import { EXPIRING_WINDOW_DAYS } from "@/lib/data/policy-status"
import { addDays } from "@/lib/date"
import { prisma } from "@/lib/prisma"
import type {
  TopbarClaimItem,
  TopbarData,
  TopbarPolicyItem,
  TopbarSlipItem,
} from "@/lib/topbar-types"

export type {
  TopbarClaimItem,
  TopbarData,
  TopbarPolicyItem,
  TopbarSlipItem,
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

async function fetchExpiringPolicies(today: string): Promise<TopbarPolicyItem[]> {
  const rows = await prisma.policy.findMany({
    where: {
      expiryDate: {
        gte: new Date(today),
        lte: new Date(addDays(today, EXPIRING_WINDOW_DAYS)),
      },
    },
    select: {
      id: true,
      policyNo: true,
      insuredName: true,
      expiryDate: true,
    },
    orderBy: { expiryDate: "asc" },
    take: 5,
  })
  return rows.map((r) => ({
    id: r.id,
    policyNo: r.policyNo,
    insuredName: r.insuredName,
    expiryDate: isoDate(r.expiryDate),
  }))
}

async function fetchOpenClaims(): Promise<TopbarClaimItem[]> {
  const rows = await prisma.claim.findMany({
    where: {
      status: {
        OR: [
          { name: { equals: "Outstanding", mode: "insensitive" } },
          { code: { equals: "outstanding", mode: "insensitive" } },
        ],
      },
    },
    select: {
      id: true,
      claimNo: true,
      lossDate: true,
      policy: {
        select: {
          insuredName: true,
        },
      },
    },
    orderBy: { lossDate: "desc" },
    take: 4,
  })
  return rows.map((r) => ({
    id: r.id,
    claimNo: r.claimNo,
    insuredName: r.policy.insuredName,
    lossDate: isoDate(r.lossDate),
  }))
}

async function fetchDraftSlips(): Promise<TopbarSlipItem[]> {
  const rows = await prisma.placingSlip.findMany({
    where: { status: "Draft" },
    select: {
      id: true,
      slipNo: true,
      insuredName: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 3,
  })
  return rows.map((r) => ({
    id: r.id,
    slipNo: r.slipNo,
    insuredName: r.insuredName,
    date: isoDate(r.updatedAt ?? r.createdAt),
  }))
}

async function fetchRecentSlips(): Promise<TopbarSlipItem[]> {
  const rows = await prisma.placingSlip.findMany({
    select: {
      id: true,
      slipNo: true,
      insuredName: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
  })
  return rows.map((r) => ({
    id: r.id,
    slipNo: r.slipNo,
    insuredName: r.insuredName,
  }))
}

/** Data ringkas untuk lonceng notifikasi dan CommandMenu (Ctrl+K). */
export async function getTopbarData(
  user: { roles: string[] },
  today: string
): Promise<TopbarData> {
  const canAccessMarketing =
    canAccess(user.roles, "/marketing") || canAccess(user.roles, "/policies")
  const canAccessClaims = canAccess(user.roles, "/claims")
  const canAccessUnderwriting = canAccess(user.roles, "/placement")

  const [expiringPolicies, openClaims, draftSlips, recentSlips] =
    await Promise.all([
      canAccessMarketing ? fetchExpiringPolicies(today) : Promise.resolve([]),
      canAccessClaims ? fetchOpenClaims() : Promise.resolve([]),
      canAccessUnderwriting ? fetchDraftSlips() : Promise.resolve([]),
      canAccessUnderwriting ? fetchRecentSlips() : Promise.resolve([]),
    ])

  return {
    expiringPolicies,
    openClaims,
    draftSlips,
    recentSlips,
  }
}
