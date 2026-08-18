import { notFound } from "next/navigation"

import { DocumentShell } from "@/components/documents/document-shell"
import {
  ClausesBlock,
  DeductibleBlock,
  DetailTable,
  DocTitle,
  InterestBlock,
  PayableTable,
  PremiumTable,
  SectionHeading,
  SignatureGrid,
  premiumRows,
} from "@/components/documents/doc-blocks"
import { DocumentFooter, Letterhead } from "@/components/documents/letterhead"
import { SLIPS, slipById } from "@/lib/data"
import { dateLong } from "@/lib/format"

export function generateStaticParams() {
  return SLIPS.map((s) => ({ id: s.id }))
}

export default async function QuotationSlipDocument({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = slipById(id)
  if (!slip) notFound()

  const unit = slip.cob === "Motor Vehicle" ? "%" : "‰"

  return (
    <DocumentShell backHref={`/underwriting/quotation/edit/${slip.id}`}>
      <Letterhead />
      <DocTitle
        title="QUOTATION SLIP"
        number={slip.slipNo ? `No. ${slip.slipNo}` : "DRAFT"}
        muted={!slip.slipNo}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />

      {slip.subjectivity ? (
        <>
          <SectionHeading>SUBJECTIVITY</SectionHeading>
          <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
            {slip.subjectivity}
          </p>
        </>
      ) : null}

      <ClausesBlock slip={slip} inline />

      <SectionHeading>RATE &amp; PREMIUM CALCULATION</SectionHeading>
      <PremiumTable slip={slip} rows={premiumRows(slip)} unitLabel={unit} />
      <PayableTable slip={slip} />

      <SignatureGrid
        place={`Jakarta, ${dateLong(slip.updatedAt)}`}
        confirmationTitle="KONFIRMASI TERTANGGUNG / INSURED CONFIRMATION"
      />

      <DocumentFooter printedAt="18/08/2026 14:11" />
    </DocumentShell>
  )
}
