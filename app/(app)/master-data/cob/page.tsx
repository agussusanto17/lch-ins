import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { CobCoverTab } from "@/components/master-data/cob-cover-tab"
import { listLookupValues, listMasterCob } from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "COB & Cover Type — LCH Insurance Brokers",
}

export default async function MasterDataCobPage() {
  await requireAccess("/master-data")

  const [initialCobs, rateModes, formVariants] = await Promise.all([
    listMasterCob(),
    listLookupValues("rate_mode"),
    listLookupValues("form_variant"),
  ])

  return (
    <PageShell>
      <PageHeader title="COB & Cover Type" />
      <CobCoverTab
        initialCobs={initialCobs}
        rateModes={rateModes}
        formVariants={formVariants}
      />
    </PageShell>
  )
}
