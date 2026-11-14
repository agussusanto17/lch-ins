import { DocumentShell } from "@/components/documents/document-shell"
import {
  ClausesBlock,
  DocTitle,
  HangingIndentText,
  SectionHeading,
  SecurityTable,
  SignatureGrid,
} from "@/components/documents/doc-blocks"
import { Letterhead } from "@/components/documents/letterhead"
import { LETTERHEAD_COMPANY, letterheadFor } from "@/lib/document-dates"
import {
  endorsementBody,
  endorsementNo,
  endorsementOpening,
  endorsementTitle,
  premiumAdjustmentLabel,
  signedMoney,
  TERMS_UNCHANGED,
} from "@/lib/endorsement-slip"
import {
  DAYS_PER_YEAR,
  premiumBasis,
  prorataDays,
  totalPremium,
} from "@/lib/endorsement-premium"
import { dateEn, moneyCents, num } from "@/lib/format"
import type { EndorsementSlipData } from "@/lib/server/endorsement-slip"
import { deductiblesByUnit, type DeductibleGroupText } from "@/lib/deductible-text"

export type Row = { label: string; value: React.ReactNode }

/** Data polis endorsement dan cancellation slip, label bahasa Inggris saja (Harry, 12 November 2026). */
export function DetailTable({ rows }: { rows: Row[] }) {
  return (
    <table className="mb-6 w-full text-[13px]">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="align-top">
            <td className="w-[230px] py-1.5 pr-2">{r.label}</td>
            <td className="w-3 py-1.5">:</td>
            <td className="py-1.5 text-justify">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function Deductibles({ groups }: { groups: DeductibleGroupText[] }) {
  const list = (items: DeductibleGroupText[]) =>
    items.map((g, i) => (
      <span key={i} className="flex flex-col">
        {g.heading ? <span className="font-medium">{g.heading}</span> : null}
        {g.texts.map((t, j) => (
          <span key={j}>{t}</span>
        ))}
      </span>
    ))
  // Deductible per unit: judul unit sekali, lalu kelompoknya menjorok (13 November 2026).
  return (
    <span className="flex flex-col gap-1">
      {deductiblesByUnit(groups).map((block, i) =>
        block.unit ? (
          <span key={i} className="flex flex-col gap-0.5">
            <span className="font-semibold">{block.unit}</span>
            <span className="flex flex-col gap-1 pl-3">{list(block.groups)}</span>
          </span>
        ) : (
          list(block.groups)
        )
      )}
    </span>
  )
}

/**
 * Cetak endorsement dan pembatalan dari Policy Database, format EDM 01 (LCH, 10 November 2026).
 * Kalimat perubahan berisi Remarks; klausul diambil dari slip.
 */
export function EndorsementDocument({ data }: { data: EndorsementSlipData }) {
  const { policy, parent, slip } = data
  const kop = letterheadFor(data.recordedDate)
  const start = parent?.inceptionDate ?? policy.inceptionDate
  const end = parent?.expiryDate ?? policy.expiryDate
  const body = endorsementBody(policy.type, policy.remarks)
  const adjustment = premiumAdjustmentLabel(policy.premium)
  const insurers = policy.insurers?.length ? policy.insurers : (parent?.insurers ?? [])
  const changesSumInsured = data.sumInsuredBefore !== null && policy.sumInsured !== 0
  // Admin cost dan stamp duty endorsement mengikuti rumus prorata LCH (11 November 2026).
  const charges = [
    { label: "Administration Cost", amount: policy.adminCost ?? 0 },
    { label: "Stamp Duty", amount: policy.stampDuty ?? 0 },
  ].filter((c) => c.amount !== 0)

  const rows: Row[] = [
    { label: "Endorsement No.", value: endorsementNo(data.attachmentSeq) },
    { label: "Attaching to and forming part of Policy No.", value: parent?.policyNo ?? "—" },
    { label: "Name of Insured", value: policy.insuredName },
    ...(data.address
      ? [
          {
            label: "Address of Insured",
            value: <span className="whitespace-pre-line">{data.address}</span>,
          },
        ]
      : []),
    { label: "Period of Insurance", value: `${dateEn(start)} - ${dateEn(end)}` },
    { label: "Type of Cover", value: policy.typeOfCover || policy.cob },
    ...(data.sumInsuredBefore !== null
      ? [{ label: "Sum Insured", value: moneyCents(data.sumInsuredBefore, policy.currency) }]
      : []),
    ...(changesSumInsured
      ? [
          {
            label: "Change of Sum Insured",
            value: signedMoney(policy.sumInsured, policy.currency),
          },
          {
            label: "Sum Insured after Endorsement",
            value: moneyCents((data.sumInsuredBefore ?? 0) + policy.sumInsured, policy.currency),
          },
        ]
      : []),
    ...(data.deductibles.length
      ? [{ label: "Deductible", value: <Deductibles groups={data.deductibles} /> }]
      : []),
  ]

  const notice =
    !body || !parent ? (
      <p className="text-muted-foreground">
        {!parent ? "Polis induk endorsement ini tidak ditemukan di Policy Database. " : null}
        {!body
          ? "Remarks endorsement ini masih kosong, jadi isi perubahannya belum tercetak. Isi lewat Edit polis di Policy Database."
          : null}
      </p>
    ) : undefined

  return (
    <DocumentShell backHref="/policies" variant={kop} notice={notice}>
      <Letterhead variant={kop} />
      <DocTitle title={endorsementTitle(policy.type)} number={`No. ${policy.policyNo}`} />
      <DetailTable rows={rows} />

      {/* Garis atas dan bawah memisahkan kalimat perubahan (Harry, 12 November 2026). */}
      <div className="mb-6 border-y py-4 text-[13px] leading-relaxed">
        <p className="mb-3 text-justify">{endorsementOpening(policy.type, policy.inceptionDate)}</p>
        {body ? (
          <div className="mb-3 pl-4">
            <HangingIndentText text={body} className="text-[13px] leading-relaxed" />
          </div>
        ) : null}
        <p>{TERMS_UNCHANGED}</p>
      </div>

      <SectionHeading>PREMIUM CALCULATION</SectionHeading>
      <p className="mb-2 text-[12px] text-muted-foreground">
        Period: {dateEn(policy.inceptionDate)} - {dateEn(policy.expiryDate)}
      </p>
      <table className="mb-6 w-full text-[13px]">
        <tbody>
          <tr className="border-b align-top">
            <td className="py-2">
              <span className="block">{adjustment}</span>
              {policy.rate ? (
                <span className="tabular mt-0.5 block text-[12px] text-muted-foreground">
                  {moneyCents(premiumBasis(policy), policy.currency)} × {num(policy.rate, 0, 6)}% ×{" "}
                  {prorataDays(policy.inceptionDate, policy.expiryDate)}/{DAYS_PER_YEAR}
                </span>
              ) : null}
            </td>
            <td className="tabular py-2 text-right">
              {signedMoney(policy.premium, policy.currency)}
            </td>
          </tr>
          {charges.map((c) => (
            <tr key={c.label} className="border-b align-top">
              <td className="py-2">{c.label}</td>
              <td className="tabular py-2 text-right">
                {signedMoney(c.amount, policy.currency)}
              </td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2">Total</td>
            <td className="tabular py-2 text-right">
              {signedMoney(totalPremium(policy), policy.currency)}
            </td>
          </tr>
        </tbody>
      </table>

      {slip ? <ClausesBlock slip={slip} /> : null}
      <SecurityTable rows={insurers} />

      <SignatureGrid
        place={`Jakarta, ${dateEn(data.recordedDate)}`}
        company={LETTERHEAD_COMPANY[kop]}
        preparedBy="Prepared by,"
      />
    </DocumentShell>
  )
}
