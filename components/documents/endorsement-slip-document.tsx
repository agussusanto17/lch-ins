import { DocumentShell } from "@/components/documents/document-shell"
import {
  ClausesBlock,
  DocTitle,
  HangingIndentText,
  SectionHeading,
  SecurityPanelBlock,
  SignatureGrid,
} from "@/components/documents/doc-blocks"
import {
  Deductibles,
  DetailTable,
  type Row,
} from "@/components/documents/endorsement-document"
import { Letterhead } from "@/components/documents/letterhead"
import { todayIso } from "@/lib/date"
import { LETTERHEAD_COMPANY, letterheadFor } from "@/lib/document-dates"
import {
  ENDORSEMENT_DAYS_PER_YEAR,
  slipEndorsementAdjustment,
  type ProratedLine,
} from "@/lib/endorsement-calc"
import {
  endorsementBody,
  endorsementNo,
  endorsementOpening,
  premiumAdjustmentLabel,
  signedMoney,
  TERMS_UNCHANGED,
} from "@/lib/endorsement-slip"
import { dateEn, moneyCents, num } from "@/lib/format"
import type { EndorsementSlipPrint } from "@/lib/server/endorsement-slip"

function CalcRows({
  lines,
  currency,
  prorata,
}: {
  lines: ProratedLine[]
  currency: string
  prorata: string
}) {
  return (
    <>
      {lines.map((l, i) => (
        <tr key={`${l.label}-${i}`} className="border-b align-top">
          <td className="py-1.5 pr-2">{l.label}</td>
          <td className="tabular py-1.5 pr-2 text-right whitespace-nowrap">
            {l.basis !== null && l.rate !== null
              ? `${moneyCents(l.basis, currency)} × ${num(l.rate, 0, 6)}${l.unit}`
              : "Flat"}
          </td>
          <td className="tabular py-1.5 pr-2 text-right whitespace-nowrap">{prorata}</td>
          <td className="tabular py-1.5 text-right whitespace-nowrap">
            {signedMoney(l.prorated, currency)}
          </td>
        </tr>
      ))}
    </>
  )
}

/**
 * Cetak endorsement/cancellation slip Placement, bahasa Inggris saja (Harry, 11-12 November 2026).
 * Premi sebelum (dikembalikan) dan sesudah (ditagihkan) dihitung prorata dari tanggal efektif.
 */
export function EndorsementSlipDocument({ data }: { data: EndorsementSlipPrint }) {
  const { slip } = data
  const cancellation = slip.kind === "Cancellation"
  const type = cancellation ? "Cancellation" : "Endorsement"
  const adj = slipEndorsementAdjustment(slip)
  const currency = slip.currency
  const docDate = slip.releaseDate ?? slip.closingDate ?? todayIso()
  const kop = letterheadFor(docDate)
  const body = endorsementBody(type, slip.changeDescription)
  const prorata = adj
    ? adj.fromStart
      ? "full"
      : `${adj.days}/${ENDORSEMENT_DAYS_PER_YEAR}`
    : "—"
  const adjustment = premiumAdjustmentLabel(adj?.premium ?? 0)
  const changesSumInsured = Boolean(adj && adj.sumInsuredChange !== 0 && !cancellation)

  const rows: Row[] = [
    { label: "Endorsement No.", value: endorsementNo(data.attachmentSeq) },
    { label: "Attaching to and forming part of Policy No.", value: slip.parentPolicyNo ?? "—" },
    { label: "Name of Insured", value: slip.insuredName },
    ...(data.address
      ? [
          {
            label: "Address of Insured",
            value: <span className="whitespace-pre-line">{data.address}</span>,
          },
        ]
      : []),
    {
      label: "Period of Insurance",
      value: `${dateEn(slip.inceptionDate)} - ${dateEn(slip.expiryDate)}`,
    },
    { label: "Type of Cover", value: slip.typeOfCover || slip.cob },
    ...(adj ? [{ label: "Sum Insured", value: moneyCents(adj.sumInsuredBefore, currency) }] : []),
    ...(changesSumInsured && adj
      ? [
          { label: "Change of Sum Insured", value: signedMoney(adj.sumInsuredChange, currency) },
          { label: "Sum Insured after Endorsement", value: moneyCents(adj.sumInsuredAfter, currency) },
        ]
      : []),
    ...(data.deductibles.length
      ? [{ label: "Deductible", value: <Deductibles groups={data.deductibles} /> }]
      : []),
  ]

  const notice =
    slip.status === "Closed" ? (
      <p className="text-muted-foreground">
        {data.recordedPolicyNo
          ? `Tercatat di Policy Database sebagai ${type} ${data.recordedPolicyNo}.`
          : `Belum tercatat di Policy Database.`}
      </p>
    ) : slip.status === "Draft" ? (
      <p className="text-muted-foreground">
        Draft. Nomor slip terbit saat {type.toLowerCase()} slip diterbitkan dari form slip.
      </p>
    ) : undefined

  return (
    <DocumentShell slip backHref={`/placement/edit/${slip.id}`} variant={kop} notice={notice}>
      <Letterhead variant={kop} />
      <DocTitle
        title={cancellation ? "CANCELLATION SLIP" : "ENDORSEMENT SLIP"}
        number={slip.slipNo ? `No. ${slip.slipNo}` : "DRAFT"}
        muted={!slip.slipNo}
      />
      <DetailTable rows={rows} />

      {/* Garis atas dan bawah memisahkan kalimat perubahan (Harry, 12 November 2026). */}
      <div className="mb-6 border-y py-4 text-[13px] leading-relaxed">
        <p className="mb-3 text-justify">
          {slip.effectiveDate
            ? endorsementOpening(type, slip.effectiveDate)
            : "The effective date has not been filled in."}
        </p>
        {body ? (
          <div className="mb-3 pl-4">
            <HangingIndentText text={body} className="text-[13px] leading-relaxed" />
          </div>
        ) : null}
        <p>{TERMS_UNCHANGED}</p>
      </div>

      {adj ? (
        <>
          <SectionHeading>PREMIUM CALCULATION</SectionHeading>
          <p className="mb-2 text-[12px] text-muted-foreground">
            Period: {dateEn(slip.effectiveDate)} - {dateEn(slip.expiryDate)}
            {adj.fromStart
              ? " · from inception, full premium"
              : ` · pro rata ${adj.days}/${ENDORSEMENT_DAYS_PER_YEAR} days`}
          </p>
          <table className="mb-6 w-full text-[12.5px]">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2 font-semibold">Cover</th>
                <th className="py-2 pr-2 text-right font-semibold">Value × Rate</th>
                <th className="py-2 pr-2 text-right font-semibold">Pro Rata</th>
                <th className="py-2 text-right font-semibold">Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="pt-3 pb-1 font-semibold">
                  Previous calculation (refunded)
                </td>
              </tr>
              <CalcRows lines={adj.before} currency={currency} prorata={prorata} />
              {cancellation ? null : (
                <>
                  <tr>
                    <td colSpan={4} className="pt-3 pb-1 font-semibold">
                      New calculation (charged)
                    </td>
                  </tr>
                  <CalcRows lines={adj.after} currency={currency} prorata={prorata} />
                </>
              )}
              <tr className="border-b align-top">
                <td colSpan={3} className="pt-3 pb-2 font-semibold">
                  {adjustment}
                </td>
                <td className="tabular pt-3 pb-2 text-right font-semibold whitespace-nowrap">
                  {signedMoney(adj.premium, currency)}
                </td>
              </tr>
              {adj.discount ? (
                <tr className="border-b">
                  <td colSpan={3} className="py-2">
                    Discount {num(adj.discountPct, 0, 2)}%
                  </td>
                  <td className="tabular py-2 text-right whitespace-nowrap">
                    {signedMoney(adj.discount, currency)}
                  </td>
                </tr>
              ) : null}
              {adj.adminCost ? (
                <tr className="border-b">
                  <td colSpan={3} className="py-2">
                    Administration Cost
                  </td>
                  <td className="tabular py-2 text-right whitespace-nowrap">
                    {signedMoney(adj.adminCost, currency)}
                  </td>
                </tr>
              ) : null}
              {adj.stampDuty ? (
                <tr className="border-b">
                  <td colSpan={3} className="py-2">
                    Stamp Duty
                  </td>
                  <td className="tabular py-2 text-right whitespace-nowrap">
                    {signedMoney(adj.stampDuty, currency)}
                  </td>
                </tr>
              ) : null}
              <tr className="font-semibold">
                <td colSpan={3} className="py-2">
                  Total
                </td>
                <td className="tabular py-2 text-right whitespace-nowrap">
                  {signedMoney(adj.total, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}

      <ClausesBlock slip={slip} />
      <SecurityPanelBlock slip={slip} />

      <SignatureGrid
        place={`Jakarta, ${dateEn(docDate)}`}
        company={LETTERHEAD_COMPANY[kop]}
        preparedBy="Prepared by,"
      />
    </DocumentShell>
  )
}
