import { notFound } from "next/navigation"

import { DocumentShell } from "@/components/documents/document-shell"
import {
  ClauseWordingAppendix,
  ClausesBlock,
  DeductibleBlock,
  DetailTable,
  DocTitle,
  InterestBlock,
  PayableTable,
  PremiumTable,
  SectionHeading,
  SecurityPanelBlock,
  SignatureGrid,
  premiumRows,
} from "@/components/documents/doc-blocks"
import { Letterhead } from "@/components/documents/letterhead"
import { SLIPS, slipById } from "@/lib/data"
import { dateLong } from "@/lib/format"

export function generateStaticParams() {
  return SLIPS.map((s) => ({ id: s.id }))
}

export default async function PlacingSlipDocument({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = slipById(id)
  if (!slip) notFound()

  const unit = slip.cob === "Motor Vehicle" ? "%" : "‰"

  return (
    <DocumentShell backHref={`/underwriting/edit/${slip.id}`}>
      <Letterhead withAddress />
      <DocTitle
        title="PLACING SLIP"
        number={slip.slipNo ? `No. ${slip.slipNo}` : "DRAFT — belum di-release"}
        muted={!slip.slipNo}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />
      <ClausesBlock slip={slip} />

      <SectionHeading>RATE &amp; PREMIUM</SectionHeading>
      <PremiumTable slip={slip} rows={premiumRows(slip)} unitLabel={unit} />
      <PayableTable slip={slip} />

      <SecurityPanelBlock slip={slip} />

      <SignatureGrid
        place={`Jakarta, ${dateLong(slip.updatedAt)}`}
        confirmationTitle="KONFIRMASI PENANGGUNG / INSURER CONFIRMATION"
        confirmationParty="Nama Perusahaan Asuransi & Authorized Signatory"
      />

      <ClauseWordingAppendix slip={slip} />
    </DocumentShell>
  )
}
