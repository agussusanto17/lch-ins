import { PageShell } from "@/components/layout/page-header"
import { MasterClauses } from "@/components/underwriting/master-clauses"
import { canManage } from "@/lib/access"
import {
  listClauses,
  listCobOptions,
  listSourceGroups,
} from "@/lib/server/clauses"
import { currentUser } from "@/lib/server/session"

export const metadata = { title: "Master Clauses — LCH Insurance Brokers" }

/** Ambil satu nilai dari searchParams, abaikan bentuk array. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function MasterClausesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const filter = {
    query: one(sp.q) ?? "",
    sourceGroup: one(sp.group) ?? "",
    cobId: one(sp.cob) ?? "",
    page: Number(one(sp.page)) || 1,
  }

  const [result, groups, cobs, user] = await Promise.all([
    listClauses(filter),
    listSourceGroups(),
    listCobOptions(),
    currentUser(),
  ])

  const canManageClauses = user
    ? canManage(user.roles, "/underwriting/master-clauses")
    : false

  return (
    <PageShell>
      <MasterClauses
        result={result}
        groups={groups}
        cobs={cobs}
        filter={filter}
        canManage={canManageClauses}
      />
    </PageShell>
  )
}
