import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { InsurersAdjustersTab } from "@/components/master-data/insurers-adjusters-tab"
import {
  EF_SUB_ACCOUNT_TYPE,
  listAdjusters,
  listInsurers,
  listLookupValues,
} from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Asuransi & Adjuster — LCH Insurance Brokers",
}

export default async function MasterDataPartnersPage() {
  await requireAccess("/master-data")

  const [initialInsurers, initialAdjusters, feeSubAccounts] = await Promise.all([
    listInsurers(),
    listAdjusters(),
    listLookupValues(EF_SUB_ACCOUNT_TYPE),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Asuransi & Adjuster"
        description="Perusahaan asuransi rekanan dan loss adjuster."
      />
      <InsurersAdjustersTab
        initialInsurers={initialInsurers}
        initialAdjusters={initialAdjusters}
        feeSubAccounts={feeSubAccounts.map((l) => ({
          id: l.id,
          code: l.code,
          name: l.name,
          isActive: l.isActive,
        }))}
      />
    </PageShell>
  )
}
