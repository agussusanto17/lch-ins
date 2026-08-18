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
  SecurityPanelBlock,
  SignedBlock,
  premiumRows,
} from "@/components/documents/doc-blocks"
import { DocumentFooter, Letterhead } from "@/components/documents/letterhead"
import { SLIPS, slipById } from "@/lib/data"
import { dateLong, romanMonth } from "@/lib/format"

export function generateStaticParams() {
  return SLIPS.map((s) => ({ id: s.id }))
}

/** Aplikasi lama tidak punya generator nomor cover note. Format ini diusulkan saat rebuild. */
function coverNoteNumber(
  seq: number,
  code: string | null,
  dateStr: string | null
) {
  if (!seq || !dateStr) return null
  const d = new Date(`${dateStr}T00:00:00`)
  const kind = code ? `CN-${code}` : "CN"
  return `${String(seq).padStart(3, "0")}/LCH-PLCMT/${kind}/${romanMonth(d.getMonth())}/${d.getFullYear()}`
}

export default async function CoverNoteDocument({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = slipById(id)
  if (!slip) notFound()

  const unit = slip.cob === "Motor Vehicle" ? "%" : "‰"
  const number = coverNoteNumber(slip.seq, slip.coverCode, slip.updatedAt)

  return (
    <DocumentShell backHref={`/underwriting/quotation/edit/${slip.id}`}>
      <Letterhead />
      <DocTitle
        title="COVER NOTE"
        number={
          number
            ? `No. ${number}`
            : "No. ................................................"
        }
        muted={!number}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />
      <ClausesBlock slip={slip} inline />

      <SectionHeading>RATE &amp; PREMIUM</SectionHeading>
      <PremiumTable slip={slip} rows={premiumRows(slip)} unitLabel={unit} />
      <PayableTable slip={slip} />

      <SecurityPanelBlock slip={slip} />

      {slip.coverNoteRemarks ? (
        <>
          <SectionHeading>REMARKS</SectionHeading>
          <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
            {slip.coverNoteRemarks}
          </p>
        </>
      ) : null}

      <SignedBlock label="Nama Perusahaan Asuransi" />
      <p className="mt-8 text-[13px]">Jakarta, {dateLong(slip.updatedAt)}</p>

      <DocumentFooter printedAt="18/08/2026 14:11" />
    </DocumentShell>
  )
}
