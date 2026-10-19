import { toIdr } from "../calc"
import { CLAIMS } from "./claims"
import { CLIENTS } from "./clients"
import { POLICIES } from "./policies"
import { TODAY } from "./reference"
import { SLIPS } from "./slips"

/** Klaim yang masih berjalan. Settled, Closed, dan Rejected sudah selesai. */
const isOpenClaim = (c: { status: string }) => c.status === "Outstanding"

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

export const TOTALS = {
  clients: CLIENTS.length,
  activeClients: CLIENTS.filter((c) => c.status === "Active").length,
  activePolicies: POLICIES.filter((p) => p.status !== "Expired").length,
  openClaims: CLAIMS.filter(isOpenClaim).length,
  draftSlips: SLIPS.filter((s) => s.status === "Draft").length,
  totalPremium: POLICIES.filter((p) => p.status !== "Expired").reduce(
    (a, p) => a + premiumIdr(p),
    0
  ),
  totalBrokerage: POLICIES.filter((p) => p.status !== "Expired").reduce(
    (a, p) => a + brokerageIdr(p),
    0
  ),
  totalSumInsured: POLICIES.filter((p) => p.status !== "Expired").reduce(
    (a, p) => a + toIdr(p.sumInsured, p.currency),
    0
  ),
  claimValue: CLAIMS.reduce(
    (a, c) => a + toIdr(c.claimedAmount || c.estimatedLoss, c.currency),
    0
  ),
  claimPaid: CLAIMS.reduce((a, c) => a + toIdr(c.paidAmount, c.currency), 0),
  claimOutstanding: CLAIMS.filter(isOpenClaim).reduce(
    (a, c) => a + toIdr(c.claimedAmount || c.estimatedLoss, c.currency),
    0
  ),
}

/** Premium & brokerage per bulan (juta IDR) untuk tahun berjalan. */
export const MONTHLY_PRODUCTION = [
  { month: "Jan", premium: 148, brokerage: 18.5, policies: 3 },
  { month: "Feb", premium: 96, brokerage: 11.2, policies: 2 },
  { month: "Mar", premium: 214, brokerage: 26.8, policies: 4 },
  { month: "Apr", premium: 187, brokerage: 24.1, policies: 3 },
  { month: "Mei", premium: 342, brokerage: 38.4, policies: 5 },
  { month: "Jun", premium: 268, brokerage: 30.2, policies: 4 },
  { month: "Jul", premium: 921, brokerage: 92.1, policies: 6 },
  { month: "Agu", premium: 486, brokerage: 58.9, policies: 5 },
  { month: "Sep", premium: 0, brokerage: 0, policies: 0 },
  { month: "Okt", premium: 0, brokerage: 0, policies: 0 },
  { month: "Nov", premium: 0, brokerage: 0, policies: 0 },
  { month: "Des", premium: 0, brokerage: 0, policies: 0 },
]

/** Distribusi premium per class of business. */
export function premiumByCob() {
  const map = new Map<
    string,
    {
      cob: string
      premium: number
      brokerage: number
      policies: number
      sumInsured: number
    }
  >()
  for (const p of POLICIES) {
    if (p.status === "Expired") continue
    const cur = map.get(p.cob) ?? {
      cob: p.cob,
      premium: 0,
      brokerage: 0,
      policies: 0,
      sumInsured: 0,
    }
    cur.premium += premiumIdr(p)
    cur.brokerage += brokerageIdr(p)
    cur.sumInsured += toIdr(p.sumInsured, p.currency)
    cur.policies += 1
    map.set(p.cob, cur)
  }
  return [...map.values()].sort((a, b) => b.premium - a.premium)
}

/** Produksi per insurer. */
export function premiumByInsurer() {
  const map = new Map<
    string,
    {
      insurer: string
      premium: number
      brokerage: number
      policies: number
      sumInsured: number
    }
  >()
  for (const p of POLICIES) {
    if (p.status === "Expired") continue
    const cur = map.get(p.insurer) ?? {
      insurer: p.insurer,
      premium: 0,
      brokerage: 0,
      policies: 0,
      sumInsured: 0,
    }
    cur.premium += premiumIdr(p)
    cur.brokerage += brokerageIdr(p)
    cur.sumInsured += toIdr(p.sumInsured, p.currency)
    cur.policies += 1
    map.set(p.insurer, cur)
  }
  return [...map.values()].sort((a, b) => b.premium - a.premium)
}

/** Polis yang jatuh tempo dalam N hari ke depan. */
export function upcomingRenewals(days = 60, from: Date = TODAY) {
  return POLICIES.filter((p) => {
    const exp = new Date(`${p.expiryDate}T00:00:00`)
    const diff = Math.ceil((exp.getTime() - from.getTime()) / 86_400_000)
    return diff >= 0 && diff <= days
  }).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
}

export function claimsByStatus() {
  const map = new Map<string, number>()
  for (const c of CLAIMS) map.set(c.status, (map.get(c.status) ?? 0) + 1)
  return [...map.entries()].map(([status, count]) => ({ status, count }))
}
