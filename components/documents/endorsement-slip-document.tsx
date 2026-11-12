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
  BilingualTable,
  Deductibles,
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
} from "@/lib/endorsement-slip"
import { dateLong, moneyCents, num } from "@/lib/format"
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
 * Cetak endorsement dan cancellation slip dari Placement (Harry, 11 November
 * 2026). Bagian atas mengikuti contoh EDM 01. Perhitungan premi memuat
 * perhitungan sebelum (dikembalikan) dan sesudah (ditagihkan), prorata dari
 * tanggal efektif, lalu premi tambahan atau refund premi.
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
      ? "penuh"
      : `${adj.days}/${ENDORSEMENT_DAYS_PER_YEAR}`
    : "—"
  const adjustment = premiumAdjustmentLabel(adj?.premium ?? 0)
  const changesSumInsured = Boolean(adj && adj.sumInsuredChange !== 0 && !cancellation)

  const rows: Row[] = [
    { id: "Lampiran No.", en: "Endorsement No.", value: endorsementNo(data.attachmentSeq) },
    {
      id: "Merupakan bagian yang tidak terpisahkan dari Polis No.",
      en: "Attaching to and forming part of Policy No.",
      value: slip.parentPolicyNo ?? "—",
    },
    { id: "Nama Tertanggung", en: "Name of Insured", value: slip.insuredName },
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
      value: `${dateLong(slip.inceptionDate)} - ${dateLong(slip.expiryDate)}`,
    },
    { id: "Jenis Pertanggungan", en: "Type of Cover", value: slip.typeOfCover || slip.cob },
    ...(adj
      ? [
          {
            id: "Nilai Pertanggungan",
            en: "Sum Insured",
            value: moneyCents(adj.sumInsuredBefore, currency),
          },
        ]
      : []),
    ...(changesSumInsured && adj
      ? [
          {
            id: "Perubahan Nilai Pertanggungan",
            en: "Change of Sum Insured",
            value: signedMoney(adj.sumInsuredChange, currency),
          },
          {
            id: "Nilai Pertanggungan Setelah Perubahan",
            en: "Sum Insured after Endorsement",
            value: moneyCents(adj.sumInsuredAfter, currency),
          },
        ]
      : []),
    ...(data.deductibles.length
      ? [{ id: "Risiko Sendiri", en: "Deductible", value: <Deductibles groups={data.deductibles} /> }]
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
    <DocumentShell backHref={`/placement/edit/${slip.id}`} variant={kop} notice={notice}>
      <Letterhead variant={kop} />
      <DocTitle
        title={cancellation ? "CANCELLATION SLIP" : "ENDORSEMENT SLIP"}
        number={slip.slipNo ? `No. ${slip.slipNo}` : "DRAFT"}
        muted={!slip.slipNo}
      />
      <BilingualTable rows={rows} />

      <div className="mb-6 text-[13px] leading-relaxed">
        <p className="mb-3 text-justify">
          {slip.effectiveDate ? endorsementOpening(type, slip.effectiveDate) : "Tanggal efektif belum diisi."}
        </p>
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

      {adj ? (
        <>
          <SectionHeading>PERHITUNGAN PREMI / PREMIUM CALCULATION</SectionHeading>
          <p className="mb-2 text-[12px] text-muted-foreground">
            Periode / Period: {dateLong(slip.effectiveDate)} - {dateLong(slip.expiryDate)}
            {adj.fromStart
              ? " · per awal polis, premi penuh"
              : ` · prorata ${adj.days}/${ENDORSEMENT_DAYS_PER_YEAR} hari`}
          </p>
          <table className="mb-6 w-full text-[12.5px]">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2 font-semibold">Jaminan / Cover</th>
                <th className="py-2 pr-2 text-right font-semibold">Nilai × Rate</th>
                <th className="py-2 pr-2 text-right font-semibold">Prorata</th>
                <th className="py-2 text-right font-semibold">Premi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="pt-3 pb-1 font-semibold">
                  Perhitungan sebelumnya (dikembalikan)
                  <span className="block text-[11px] font-normal italic text-muted-foreground">
                    Previous calculation (refunded)
                  </span>
                </td>
              </tr>
              <CalcRows lines={adj.before} currency={currency} prorata={prorata} />
              {cancellation ? null : (
                <>
                  <tr>
                    <td colSpan={4} className="pt-3 pb-1 font-semibold">
                      Perhitungan sesudah (ditagihkan)
                      <span className="block text-[11px] font-normal italic text-muted-foreground">
                        New calculation (charged)
                      </span>
                    </td>
                  </tr>
                  <CalcRows lines={adj.after} currency={currency} prorata={prorata} />
                </>
              )}
              <tr className="border-b align-top">
                <td colSpan={3} className="pt-3 pb-2">
                  <span className="block font-semibold">{adjustment.id}</span>
                  <span className="block text-[11px] italic text-muted-foreground">{adjustment.en}</span>
                </td>
                <td className="tabular pt-3 pb-2 text-right font-semibold whitespace-nowrap">
                  {signedMoney(adj.premium, currency)}
                </td>
              </tr>
              {adj.discount ? (
                <tr className="border-b">
                  <td colSpan={3} className="py-2">
                    Diskon / Discount {num(adj.discountPct, 0, 2)}%
                  </td>
                  <td className="tabular py-2 text-right whitespace-nowrap">
                    {signedMoney(adj.discount, currency)}
                  </td>
                </tr>
              ) : null}
              {adj.adminCost ? (
                <tr className="border-b">
                  <td colSpan={3} className="py-2">
                    Biaya Administrasi / Administration Cost
                  </td>
                  <td className="tabular py-2 text-right whitespace-nowrap">
                    {signedMoney(adj.adminCost, currency)}
                  </td>
                </tr>
              ) : null}
              {adj.stampDuty ? (
                <tr className="border-b">
                  <td colSpan={3} className="py-2">
                    Bea Meterai / Stamp Duty
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
        place={`Jakarta, ${dateLong(docDate)}`}
        company={LETTERHEAD_COMPANY[kop]}
      />
    </DocumentShell>
  )
}
