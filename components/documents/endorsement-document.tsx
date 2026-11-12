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
} from "@/lib/endorsement-slip"
import {
  DAYS_PER_YEAR,
  premiumBasis,
  prorataDays,
  totalPremium,
} from "@/lib/endorsement-premium"
import { dateLong, moneyCents, num } from "@/lib/format"
import type { EndorsementSlipData } from "@/lib/server/endorsement-slip"
import type { DeductibleGroupText } from "@/lib/slip-deductibles"

export type Row = { id: string; en: string; value: React.ReactNode }

/** Label dua bahasa seperti contoh EDM: Indonesia di atas, Inggris di bawahnya. */
export function BilingualTable({ rows }: { rows: Row[] }) {
  return (
    <table className="mb-6 w-full text-[13px]">
      <tbody>
        {rows.map((r) => (
          <tr key={r.en} className="align-top">
            <td className="w-[230px] py-1.5 pr-2">
              <span className="block">{r.id}</span>
              <span className="block text-[11px] italic text-muted-foreground">{r.en}</span>
            </td>
            <td className="w-3 py-1.5">:</td>
            <td className="py-1.5 text-justify">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function Deductibles({ groups }: { groups: DeductibleGroupText[] }) {
  return (
    <span className="flex flex-col gap-1">
      {groups.map((g, i) => (
        <span key={i} className="flex flex-col">
          {g.heading ? <span className="font-medium">{g.heading}</span> : null}
          {g.texts.map((t, j) => (
            <span key={j}>{t}</span>
          ))}
        </span>
      ))}
    </span>
  )
}

/**
 * Cetak endorsement dan pembatalan dari Policy Database (permintaan LCH,
 * 10 November 2026), mengikuti contoh EDM 01 dari asuransi: data polis yang
 * di-endorse, kalimat perubahan berisi Remarks, perhitungan premi, klausul
 * dari slip, dan tanda tangan LCH.
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
  // Admin cost dan stamp duty endorsement, seperti Policy Cost dan Stamp Duty
  // di rumus prorata LCH (11 November 2026).
  const charges = [
    { id: "Biaya Administrasi", en: "Administration Cost", amount: policy.adminCost ?? 0 },
    { id: "Bea Meterai", en: "Stamp Duty", amount: policy.stampDuty ?? 0 },
  ].filter((c) => c.amount !== 0)

  const rows: Row[] = [
    { id: "Lampiran No.", en: "Endorsement No.", value: endorsementNo(data.attachmentSeq) },
    {
      id: "Merupakan bagian yang tidak terpisahkan dari Polis No.",
      en: "Attaching to and forming part of Policy No.",
      value: parent?.policyNo ?? "—",
    },
    { id: "Nama Tertanggung", en: "Name of Insured", value: policy.insuredName },
    ...(data.address
      ? [
          {
            id: "Alamat Tertanggung",
            en: "Address of Insured",
            value: <span className="whitespace-pre-line">{data.address}</span>,
          },
        ]
      : []),
    {
      id: "Masa Pertanggungan",
      en: "Period of Insurance",
      value: `${dateLong(start)} - ${dateLong(end)}`,
    },
    {
      id: "Jenis Pertanggungan",
      en: "Type of Cover",
      value: policy.typeOfCover || policy.cob,
    },
    ...(data.sumInsuredBefore !== null
      ? [
          {
            id: "Nilai Pertanggungan",
            en: "Sum Insured",
            value: moneyCents(data.sumInsuredBefore, policy.currency),
          },
        ]
      : []),
    ...(changesSumInsured
      ? [
          {
            id: "Perubahan Nilai Pertanggungan",
            en: "Change of Sum Insured",
            value: signedMoney(policy.sumInsured, policy.currency),
          },
          {
            id: "Nilai Pertanggungan Setelah Perubahan",
            en: "Sum Insured after Endorsement",
            value: moneyCents((data.sumInsuredBefore ?? 0) + policy.sumInsured, policy.currency),
          },
        ]
      : []),
    ...(data.deductibles.length
      ? [{ id: "Risiko Sendiri", en: "Deductible", value: <Deductibles groups={data.deductibles} /> }]
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
      <BilingualTable rows={rows} />

      <div className="mb-6 text-[13px] leading-relaxed">
        <p className="mb-3 text-justify">{endorsementOpening(policy.type, policy.inceptionDate)}</p>
        {body ? (
          <div className="mb-3 pl-4">
            <HangingIndentText text={body} className="text-[13px] leading-relaxed" />
          </div>
        ) : null}
        <p>Semua syarat dan ketentuan lainnya tidak ada perubahan.</p>
        <p className="text-[11px] italic text-muted-foreground">
          All other terms and conditions remain unchanged.
        </p>
      </div>

      <SectionHeading>PERHITUNGAN PREMI / PREMIUM CALCULATION</SectionHeading>
      <p className="mb-2 text-[12px] text-muted-foreground">
        Periode / Period: {dateLong(policy.inceptionDate)} - {dateLong(policy.expiryDate)}
      </p>
      <table className="mb-6 w-full text-[13px]">
        <tbody>
          <tr className="border-b align-top">
            <td className="py-2">
              <span className="block">{adjustment.id}</span>
              <span className="block text-[11px] italic text-muted-foreground">{adjustment.en}</span>
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
            <tr key={c.en} className="border-b align-top">
              <td className="py-2">
                <span className="block">{c.id}</span>
                <span className="block text-[11px] italic text-muted-foreground">{c.en}</span>
              </td>
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
        place={`Jakarta, ${dateLong(data.recordedDate)}`}
        company={LETTERHEAD_COMPANY[kop]}
      />
    </DocumentShell>
  )
}
