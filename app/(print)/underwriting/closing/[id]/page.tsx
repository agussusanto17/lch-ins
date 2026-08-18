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
  type PremiumRow,
} from "@/components/documents/doc-blocks"
import { DocumentFooter, Letterhead } from "@/components/documents/letterhead"
import { brokerageAmount, netPremium } from "@/lib/calc"
import { SLIPS, slipById } from "@/lib/data"
import { dateLong, num, romanMonth } from "@/lib/format"

export function generateStaticParams() {
  return SLIPS.map((s) => ({ id: s.id }))
}

function closingNumber(seq: number, dateStr: string | null) {
  if (!seq || !dateStr) return null
  const d = new Date(`${dateStr}T00:00:00`)
  return `${String(seq).padStart(3, "0")}/LCH-PLCMT/CI/${romanMonth(d.getMonth())}/${d.getFullYear()}`
}

export default async function ClosingInstructionDocument({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = slipById(id)
  if (!slip) notFound()

  const unit = slip.cob === "Motor Vehicle" ? "%" : "‰"
  const number = closingNumber(slip.seq, slip.updatedAt)

  const rows: PremiumRow[] = [
    ...premiumRows(slip),
    {
      label: `Brokerage ${num(slip.brokeragePct, 2)}%`,
      rate: "",
      premium: brokerageAmount(slip),
      emphasis: "brokerage",
    },
    {
      label: "Net Premium (after Brokerage)",
      rate: "",
      premium: netPremium(slip),
      emphasis: "net",
    },
  ]

  return (
    <DocumentShell backHref={`/underwriting/quotation/edit/${slip.id}`}>
      <Letterhead />
      <DocTitle
        title="CLOSING INSTRUCTION"
        number={number ? `No. ${number}` : "DRAFT"}
        muted={!number}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />
      <ClausesBlock slip={slip} inline />

      <SectionHeading>RATE &amp; PREMIUM</SectionHeading>
      <PremiumTable slip={slip} rows={rows} unitLabel={unit} />
      <p className="mt-2 text-[11px] text-muted-foreground">
        Net Premium = Total Premium − (Total Premium × brokerage %) — dihitung
        dari Total Premium, bukan Total Payable.
      </p>
      <PayableTable slip={slip} />

      <SecurityPanelBlock slip={slip} />

      {slip.closingInstruction ? (
        <>
          <SectionHeading>INSTRUCTION</SectionHeading>
          <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
            {slip.closingInstruction}
          </p>
        </>
      ) : null}

      <SignedBlock label="Nama Perusahaan Asuransi" />

      <p className="mt-8 mb-1 text-[13px]">
        Jakarta, {dateLong(slip.updatedAt)}
      </p>
      <div className="avoid-break mt-4 grid gap-8 text-[13px] sm:grid-cols-2">
        <div>
          <p className="mb-14 text-muted-foreground">
            Disiapkan oleh / Prepared by,
          </p>
          <p className="border-t pt-1 font-bold">PT. LCH Insurance Brokers</p>
          <p className="text-xs text-muted-foreground">Authorized Signatory</p>
        </div>
        <div>
          <p className="mb-14 text-muted-foreground">
            Diterima &amp; Ditandatangani / Accepted &amp; Signed by,
          </p>
          <p className="border-t pt-1 font-bold">Nama Perusahaan Asuransi</p>
          <p className="text-xs text-muted-foreground">Authorized Signatory</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Tanggal: ...................
          </p>
        </div>
      </div>

      <DocumentFooter printedAt="18/08/2026 14:11" />
    </DocumentShell>
  )
}
