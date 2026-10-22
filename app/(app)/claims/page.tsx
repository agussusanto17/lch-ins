import type { Metadata } from "next"

import { PageShell } from "@/components/layout/page-header"
import { ClaimsView } from "@/components/claims/claims-view"
import {
  listClaimFormOptions,
  listClaims,
  seedInitialClaimsIfEmpty,
} from "@/lib/server/claims"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = { title: "Klaim — LCH Insurance Brokers" }

export default async function ClaimsPage() {
  await requireAccess("/claims")
  await seedInitialClaimsIfEmpty()

  const [initialClaims, formOptions] = await Promise.all([
    listClaims(),
    listClaimFormOptions(),
  ])

  return (
    <PageShell>
      <ClaimsView initialClaims={initialClaims} formOptions={formOptions} />
    </PageShell>
  )
}
