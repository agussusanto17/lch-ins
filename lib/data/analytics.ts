import { toIdr } from "../calc"
import { daysBetween } from "../date"
import { policyStatus } from "./policy-status"
import { OPEN_CLAIM_STATUSES } from "./reference"
import type { Claim, Client, PlacingSlip, Policy } from "./types"

/*
 * Semua agregasi menerima data dan tanggal "hari ini" sebagai argumen, jadi
 * bisa dipakai dari Server Component (query database) maupun Client Component
 * (store sesi) tanpa hasil yang berbeda.
 */

export function premiumIdr(p: { premium: number; currency: string }) {
  return toIdr(p.premium, p.currency)
}

export function brokerageIdr(p: {
  premium: number
  currency: string
  brokeragePct: number
}) {
  return (premiumIdr(p) * p.brokeragePct) / 100
}

/** Polis yang masih berjalan pada tanggal tertentu. */
export function inForcePolicies(policies: Policy[], today: string) {
  return policies.filter((p) => policyStatus(p.expiryDate, today) !== "Expired")
}

export function isOpenClaim(claim: Pick<Claim, "status">) {
  return OPEN_CLAIM_STATUSES.includes(claim.status)
}

export function computeTotals(
  data: {
    clients: Client[]
    policies: Policy[]
    claims: Claim[]
    slips: PlacingSlip[]
  },
  today: string
) {
  const active = inForcePolicies(data.policies, today)
  const openClaims = data.claims.filter(isOpenClaim)
  return {
    clients: data.clients.length,
    activeClients: data.clients.filter((c) => c.status === "Active").length,
    activePolicies: active.length,
    openClaims: openClaims.length,
    draftSlips: data.slips.filter((s) => s.status === "Draft").length,
    totalPremium: active.reduce((a, p) => a + premiumIdr(p), 0),
    totalBrokerage: active.reduce((a, p) => a + brokerageIdr(p), 0),
    totalSumInsured: active.reduce(
      (a, p) => a + toIdr(p.sumInsured, p.currency),
      0
    ),
    claimValue: data.claims.reduce(
      (a, c) => a + toIdr(c.claimedAmount || c.estimatedLoss, c.currency),
      0
    ),
    claimPaid: data.claims.reduce(
      (a, c) => a + toIdr(c.paidAmount, c.currency),
      0
    ),
    claimOutstanding: openClaims.reduce(
      (a, c) => a + toIdr(c.claimedAmount || c.estimatedLoss, c.currency),
      0
    ),
  }
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
]

/** Premium dan brokerage per bulan mulai polis (juta IDR) untuk satu tahun. */
export function monthlyProduction(policies: Policy[], year: number) {
  const rows = MONTHS_SHORT.map((month) => ({
    month,
    premium: 0,
    brokerage: 0,
    policies: 0,
  }))
  for (const p of policies) {
    const [y, m] = p.inceptionDate.split("-").map(Number)
    if (y !== year) continue
    const row = rows[m - 1]
    row.premium += premiumIdr(p) / 1_000_000
    row.brokerage += brokerageIdr(p) / 1_000_000
    row.policies += 1
  }
  return rows.map((r) => ({
    ...r,
    premium: Math.round(r.premium * 10) / 10,
    brokerage: Math.round(r.brokerage * 10) / 10,
  }))
}

export type MonthlyProductionRow = ReturnType<typeof monthlyProduction>[number]

interface Breakdown {
  premium: number
  brokerage: number
  policies: number
  sumInsured: number
}

function groupPolicies(policies: Policy[], keyOf: (p: Policy) => string) {
  const map = new Map<string, Breakdown>()
  for (const p of policies) {
    const key = keyOf(p)
    const cur = map.get(key) ?? {
      premium: 0,
      brokerage: 0,
      policies: 0,
      sumInsured: 0,
    }
    cur.premium += premiumIdr(p)
    cur.brokerage += brokerageIdr(p)
    cur.sumInsured += toIdr(p.sumInsured, p.currency)
    cur.policies += 1
    map.set(key, cur)
  }
  return [...map.entries()].sort((a, b) => b[1].premium - a[1].premium)
}

/** Distribusi premium per class of business dari daftar polis apa pun. */
export function breakdownByCob(policies: Policy[]) {
  return groupPolicies(policies, (p) => p.cob).map(([cob, v]) => ({
    cob,
    ...v,
  }))
}

/** Produksi per insurer leader dari daftar polis apa pun. */
export function breakdownByInsurer(policies: Policy[]) {
  return groupPolicies(policies, (p) => p.insurer).map(([insurer, v]) => ({
    insurer,
    ...v,
  }))
}

/** Porsi premium portofolio yang masih berjalan. */
export function premiumByCob(policies: Policy[], today: string) {
  return breakdownByCob(inForcePolicies(policies, today))
}

/** Polis yang jatuh tempo dalam N hari ke depan. */
export function upcomingRenewals(policies: Policy[], today: string, days = 60) {
  return policies
    .filter((p) => {
      const diff = daysBetween(today, p.expiryDate)
      return diff >= 0 && diff <= days
    })
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
}

export function claimsByStatus(claims: Claim[]) {
  const map = new Map<string, number>()
  for (const c of claims) map.set(c.status, (map.get(c.status) ?? 0) + 1)
  return [...map.entries()].map(([status, count]) => ({ status, count }))
}
