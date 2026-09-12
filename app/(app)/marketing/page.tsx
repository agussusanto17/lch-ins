import { PageShell } from "@/components/layout/page-header"
import { MarketingTabs } from "@/components/marketing/marketing-tabs"

export const metadata = { title: "Marketing — LCH Insurance Brokers" }

export default function MarketingPage() {
  return (
    <PageShell>
      <MarketingTabs />
    </PageShell>
  )
}
