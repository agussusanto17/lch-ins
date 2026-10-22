import { PageShell } from "@/components/layout/page-header"
import { PolicyDatabase } from "@/components/policies/policy-database"
import { listClientOptions } from "@/lib/server/clients"
import { listPolicies } from "@/lib/server/policies"
import { requireAccess } from "@/lib/server/session"

export const metadata = { title: "Policy Database — LCH Insurance Brokers" }

export default async function PoliciesPage() {
  await requireAccess("/policies")
  // Sequential: both seed clients on an empty database, and parallel seeds would duplicate rows.
  const policies = await listPolicies()
  const clientOptions = await listClientOptions()

  return (
    <PageShell>
      <PolicyDatabase initialPolicies={policies} clientOptions={clientOptions} />
    </PageShell>
  )
}
