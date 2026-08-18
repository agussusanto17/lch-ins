import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ClientDialog } from "@/components/marketing/client-dialog"
import { MarketingTabs } from "@/components/marketing/marketing-tabs"

export const metadata = { title: "Marketing — LCH Insurance Brokers" }

export default function MarketingPage() {
  return (
    <PageShell>
      <PageHeader
        title="Marketing"
        description="Database klien dan renewal notice"
        actions={<ClientDialog />}
      />
      <MarketingTabs />
    </PageShell>
  )
}
