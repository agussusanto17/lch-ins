import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { FinanceDocsTab } from "@/components/master-data/finance-docs-tab"
import {
  listBankAccounts,
  listCurrencies,
  listLookupValues,
  listWordingForms,
} from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Keuangan & Wording — LCH Insurance Brokers",
}

export default async function MasterDataFinanceDocsPage() {
  await requireAccess("/master-data")

  const [initialBankAccounts, initialCurrencies, initialWordingForms, banks] =
    await Promise.all([
      listBankAccounts(),
      listCurrencies(),
      listWordingForms(),
      listLookupValues("bank"),
    ])

  return (
    <PageShell>
      <PageHeader title="Keuangan & Wording" />
      <FinanceDocsTab
        initialBankAccounts={initialBankAccounts}
        initialCurrencies={initialCurrencies}
        initialWordingForms={initialWordingForms}
        banks={banks}
      />
    </PageShell>
  )
}
