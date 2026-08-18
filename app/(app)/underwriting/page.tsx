import Link from "next/link"
import { FilePlus2 } from "lucide-react"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { SlipTable } from "@/components/underwriting/slip-table"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Underwriting — LCH Insurance Brokers" }

export default function UnderwritingPage() {
  return (
    <PageShell>
      <PageHeader
        title="Underwriting"
        description="Placing slip management — draft, release, dan dokumen turunan"
        actions={
          <Button
            render={<Link href="/underwriting/new" />}
            nativeButton={false}
          >
            <FilePlus2 data-icon="inline-start" />
            Buat Placing Slip
          </Button>
        }
      />
      <SlipTable />
    </PageShell>
  )
}
