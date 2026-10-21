import type { Metadata } from "next"
import Link from "next/link"
import { FilePlus2 } from "lucide-react"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { SlipTable } from "@/components/underwriting/slip-table"
import { Button } from "@/components/ui/button"
import { listPlacingSlips } from "@/lib/server/placing-slips"

export const metadata: Metadata = { title: "Underwriting — LCH Insurance Brokers" }

export default async function UnderwritingPage() {
  const initialSlips = await listPlacingSlips()

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
      <SlipTable initialSlips={initialSlips} />
    </PageShell>
  )
}
