import { PageShell } from "@/components/layout/page-header"
import { FormOptionsBoundary } from "@/components/shared/form-options-boundary"
import { PolicyDatabase } from "@/components/policies/policy-database"
import { countClaimsByPolicy } from "@/lib/server/claims"
import { listClientOptions } from "@/lib/server/clients"
import { listPlacingSlips } from "@/lib/server/placing-slips"
import { listPolicies, listPolicyFormOptions } from "@/lib/server/policies"
import { requireAccess } from "@/lib/server/session"

export const metadata = { title: "Policy Database — LCH Insurance Brokers" }

export default async function PoliciesPage() {
  await requireAccess("/policies")
  // listPolicies runs first: it and listClientOptions both seed clients on an empty database.
  const policies = await listPolicies()
  const [clientOptions, formOptions, slips, claimCounts] = await Promise.all([
    listClientOptions(),
    listPolicyFormOptions(),
    listPlacingSlips(),
    countClaimsByPolicy(),
  ])

  return (
    <PageShell>
      <FormOptionsBoundary>
        <PolicyDatabase
          initialPolicies={policies}
          clientOptions={clientOptions}
          formOptions={formOptions}
          slips={slips.filter((s) => s.status === "Quoted" || s.status === "Closed")}
          claimCounts={claimCounts}
        />
      </FormOptionsBoundary>
    </PageShell>
  )
}
