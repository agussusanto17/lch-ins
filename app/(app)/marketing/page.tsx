import type { Metadata } from "next"

import { PageShell } from "@/components/layout/page-header"
import { FormOptionsBoundary } from "@/components/shared/form-options-boundary"
import { MarketingTabs } from "@/components/marketing/marketing-tabs"
import { todayIso } from "@/lib/date"
import { listClients } from "@/lib/server/clients"
import { listRenewalPolicies } from "@/lib/server/policies"
import { listSppa } from "@/lib/server/sppa"
import { listVehicleOptions } from "@/lib/server/vehicles"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = { title: "Marketing — LCH Insurance Brokers" }

export default async function MarketingPage() {
  await requireAccess("/marketing")
  const [initialClients, initialSppa, initialPolicies, vehicleOptions] =
    await Promise.all([
      listClients(),
      listSppa(),
      listRenewalPolicies(todayIso()),
      listVehicleOptions(),
    ])

  return (
    <PageShell>
      <FormOptionsBoundary>
        <MarketingTabs
          initialClients={initialClients}
          initialSppa={initialSppa}
          initialPolicies={initialPolicies}
          vehicleOptions={vehicleOptions}
        />
      </FormOptionsBoundary>
    </PageShell>
  )
}
