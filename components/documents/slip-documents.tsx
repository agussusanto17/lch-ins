"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { AttachmentContents } from "@/components/documents/attachment-contents"
import { DocumentShell } from "@/components/documents/document-shell"
import {
  BrokerageBlock,
  ClauseWordingAppendix,
  ClausesBlock,
  CoverageBlock,
  CoverNoteSignature,
  DeductibleBlock,
  DetailTable,
  DocTitle,
  ExclusionsBlock,
  HangingIndentText,
  InterestBlock,
  LocationPremiumAttached,
  LocationScheduleAppendix,
  ObjectPremiumSchedule,
  ParEqvetCalculationBlock,
  ParEqvetRateBlock,
  AttachmentList,
  OpenCoverRateBlock,
  ParticipantAppendix,
  PayableTable,
  PremiumTable,
  SectionHeading,
  SecurityPanelBlock,
  SignatureGrid,
  isParEqvetSlip,
  premiumRows,
  VehiclePremiumAttached,
  VehicleScheduleAppendix,
} from "@/components/documents/doc-blocks"
import { Letterhead } from "@/components/documents/letterhead"
import { derivedDocNumber } from "@/components/underwriting/slip-model"
import { Button } from "@/components/ui/button"
import { rateUnitFor } from "@/lib/calc"
import type { AttachmentPrints } from "@/lib/attachment-print"
import type { PlacingSlip } from "@/lib/data"
import { dateEn } from "@/lib/format"
import { isMultiLocation } from "@/lib/slip-locations"
import { isMultiItem } from "@/lib/slip-items"
import { usesOpenCover } from "@/lib/open-cover"
import { isMultiVehicle } from "@/lib/slip-vehicles"
import { useRecord } from "@/lib/store"

/*
 * Dokumen penutupan dirender dari store sesi, jadi perubahan yang disimpan di
 * form langsung terlihat di dokumen. Data server dipakai sebagai cadangan.
 */

type DocProps = {
  id: string
  initial: PlacingSlip | null
  /** Isi lampiran yang dicetak di halaman akhir, dimuat server. */
  prints?: AttachmentPrints
}

function useSlip({ id, initial }: DocProps) {
  const stored = useRecord("slips", id)
  // Daftar slip tidak memuat peserta PA grup dan lampiran; ambil dari detail
  // slip. Lampiran selalu dari server karena berubah lewat aksinya sendiri.
  return stored
    ? {
        ...stored,
        participants: stored.participants ?? initial?.participants,
        attachments: initial?.attachments ?? stored.attachments,
      }
    : initial
}

/** Asuransi penerima Closing Instruction: namanya hanya bila panel berisi satu asuransi. */
function acceptingInsurer(slip: PlacingSlip) {
  const insurers = (slip.securityPanel ?? []).filter((p) => p.insurer)
  return insurers.length === 1 ? insurers[0].insurer : null
}

function Missing() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Dokumen tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Placing slip untuk dokumen ini tidak ada atau belum disimpan.
      </p>
      <Button render={<Link href="/underwriting" />} nativeButton={false}>
        <ArrowLeft data-icon="inline-start" />
        Kembali ke Placement
      </Button>
    </div>
  )
}

/**
 * Brokerage tidak dicetak di bawah GRAND TOTAL PREMIUM (Harry, 5 November
 * 2026); Placing Slip dan Closing Instruction mencetaknya di BrokerageBlock.
 */
function SlipRateAndPremium({ slip }: { slip: PlacingSlip }) {
  // Open cover: rate per kategori, premi per deklarasi.
  if (usesOpenCover(slip)) return <OpenCoverRateBlock slip={slip} />
  // Slip multi lokasi mencetak jadwal premi per lokasi saja (Opsi B); slip
  // satu lokasi tetap mencetak bagian RATE.
  // Banyak lokasi atau kendaraan: badan dokumen menulis "As Attached", jadwal
  // premi dicetak di lampiran DAFTAR LOKASI atau DAFTAR UNIT KENDARAAN.
  if (isMultiLocation(slip)) return <LocationPremiumAttached slip={slip} />
  if (isMultiVehicle(slip)) return <VehiclePremiumAttached slip={slip} />
  // Slip multi objek COB lain: jadwal premi per objek, lalu diskon dan biaya.
  if (isMultiItem(slip)) {
    return (
      <>
        <ObjectPremiumSchedule slip={slip} />
        <PayableTable slip={slip} />
      </>
    )
  }
  if (isParEqvetSlip(slip)) {
    return (
      <>
        <SectionHeading>RATE</SectionHeading>
        <ParEqvetRateBlock slip={slip} />
        <SectionHeading>PREMIUM CALCULATION</SectionHeading>
        <ParEqvetCalculationBlock slip={slip} />
      </>
    )
  }

  return (
    <>
      <SectionHeading>RATE &amp; PREMIUM</SectionHeading>
      <PremiumTable
        slip={slip}
        rows={premiumRows(slip)}
        unitLabel={rateUnitFor(slip.cob)}
      />
      <PayableTable slip={slip} />
    </>
  )
}

export function PlacingSlipDocument(props: DocProps) {
  const slip = useSlip(props)
  if (!slip) return <Missing />
  return (
    <DocumentShell backHref={`/underwriting/edit/${slip.id}`}>
      <Letterhead />
      <DocTitle
        title="PLACING SLIP"
        number={
          slip.status === "Cancelled"
            ? `No. ${slip.slipNo} — DIBATALKAN`
            : slip.slipNo
              ? `No. ${slip.slipNo}`
              : "DRAFT — belum di-release"
        }
        muted={!slip.slipNo || slip.status === "Cancelled"}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <CoverageBlock slip={slip} />
      <DeductibleBlock slip={slip} />
      <ClausesBlock slip={slip} />
      <ExclusionsBlock slip={slip} />

      <SlipRateAndPremium slip={slip} />

      <BrokerageBlock slip={slip} />

      <SignatureGrid
        place={`Jakarta, ${dateEn(slip.updatedAt)}`}
        confirmationTitle="KONFIRMASI PENANGGUNG / INSURER CONFIRMATION"
        confirmationParty="Nama Perusahaan Asuransi & Authorized Signatory"
      />

      <AttachmentList slip={slip} />

      <ParticipantAppendix slip={slip} />

      <LocationScheduleAppendix slip={slip} />

      <VehicleScheduleAppendix slip={slip} />

      <ClauseWordingAppendix slip={slip} />

      <AttachmentContents slip={slip} prints={props.prints} />
    </DocumentShell>
  )
}

export function QuotationSlipDocument(props: DocProps) {
  const slip = useSlip(props)
  if (!slip) return <Missing />
  const number = derivedDocNumber(slip.slipNo, "QS")

  return (
    <DocumentShell backHref={`/underwriting/quotation/edit/${slip.id}`}>
      <Letterhead />
      <DocTitle
        title="QUOTATION SLIP"
        number={number ? `No. ${number}` : "DRAFT"}
        muted={!number}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <CoverageBlock slip={slip} />
      <DeductibleBlock slip={slip} />

      {slip.subjectivity ? (
        <>
          <SectionHeading>SUBJECTIVITY</SectionHeading>
          <HangingIndentText
            text={slip.subjectivity}
            className="text-[12.5px] leading-relaxed text-muted-foreground"
          />
        </>
      ) : null}

      {/* Same layout as Placing Slip: titles here, full wording in the appendix. */}
      <ClausesBlock slip={slip} />
      <ExclusionsBlock slip={slip} />

      <SlipRateAndPremium slip={slip} />

      <SecurityPanelBlock slip={slip} />

      <SignatureGrid
        place={`Jakarta, ${dateEn(slip.updatedAt)}`}
        confirmationTitle="KONFIRMASI TERTANGGUNG / INSURED CONFIRMATION"
      />

      <AttachmentList slip={slip} />

      <ParticipantAppendix slip={slip} />

      <LocationScheduleAppendix slip={slip} />

      <VehicleScheduleAppendix slip={slip} />

      <ClauseWordingAppendix slip={slip} />

      <AttachmentContents slip={slip} prints={props.prints} />
    </DocumentShell>
  )
}

export function CoverNoteDocument(props: DocProps) {
  const slip = useSlip(props)
  if (!slip) return <Missing />
  return (
    // Draft cover note prints without the LCH letterhead and number, following
    // the marked-up sample of 6 Nov 2026.
    <DocumentShell
      backHref={`/underwriting/quotation/edit/${slip.id}`}
      letterhead={false}
    >
      <DocTitle title="COVER NOTE" />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <CoverageBlock slip={slip} />
      <DeductibleBlock slip={slip} />
      <ClausesBlock slip={slip} />
      <ExclusionsBlock slip={slip} />

      <SlipRateAndPremium slip={slip} />

      <SecurityPanelBlock slip={slip} />

      {slip.coverNoteRemarks ? (
        <>
          <SectionHeading>REMARKS</SectionHeading>
          <HangingIndentText
            text={slip.coverNoteRemarks}
            className="text-[12.5px] leading-relaxed text-muted-foreground"
          />
        </>
      ) : null}

      <CoverNoteSignature slip={slip} place={`Jakarta, ${dateEn(slip.updatedAt)}`} />

      <AttachmentList slip={slip} />

      <ParticipantAppendix slip={slip} />

      <LocationScheduleAppendix slip={slip} />

      <VehicleScheduleAppendix slip={slip} />

      <ClauseWordingAppendix slip={slip} />

      <AttachmentContents slip={slip} prints={props.prints} />
    </DocumentShell>
  )
}

export function ClosingInstructionDocument(props: DocProps) {
  const slip = useSlip(props)
  if (!slip) return <Missing />
  const number = derivedDocNumber(slip.slipNo, "CI")

  return (
    <DocumentShell backHref={`/underwriting/closing/edit/${slip.id}`}>
      <Letterhead />
      <DocTitle
        title="CLOSING INSTRUCTION"
        number={number ? `No. ${number}` : "DRAFT"}
        muted={!number}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <CoverageBlock slip={slip} />
      <DeductibleBlock slip={slip} />

      {slip.subjectivity ? (
        <>
          <SectionHeading>SUBJECTIVITY</SectionHeading>
          <HangingIndentText
            text={slip.subjectivity}
            className="text-[12.5px] leading-relaxed text-muted-foreground"
          />
        </>
      ) : null}

      <ClausesBlock slip={slip} />
      <ExclusionsBlock slip={slip} />

      <SlipRateAndPremium slip={slip} />

      <BrokerageBlock slip={slip} />

      <SecurityPanelBlock slip={slip} />

      {slip.closingInstruction ? (
        <>
          <SectionHeading>INSTRUCTION</SectionHeading>
          <HangingIndentText
            text={slip.closingInstruction}
            className="text-[12.5px] leading-relaxed text-muted-foreground"
          />
        </>
      ) : null}

      <p className="mt-8 mb-1 break-after-avoid text-[13px]">
        Jakarta, {dateEn(slip.updatedAt)}
      </p>
      {/*
       * Closing Instruction dikirim ke masing-masing asuransi, jadi tanda
       * tangan asuransi cukup satu kolom di kanan blok LCH, seperti CI LCH
       * yang sudah ditandatangani (SISKA RAHARJA, TRUCKINDO). Tidak ada blok
       * per asuransi seperti Cover Note (Agus, 9 November 2026). Nama asuransi
       * dicetak bila hanya satu; co-insurance dibiarkan kosong untuk cap
       * asuransi penerima. Tanggal diisi asuransi saat menerima, seperti
       * "Date" di CI SISKA RAHARJA.
       */}
      <div className="avoid-break mt-4 grid grid-cols-1 gap-x-8 gap-y-10 text-[13px] sm:grid-cols-2">
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
          <p className="border-t pt-1 font-bold">{acceptingInsurer(slip) ?? " "}</p>
          <p className="text-xs text-muted-foreground">Authorized Signatory</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Tanggal: ...................
          </p>
        </div>
      </div>

      <AttachmentList slip={slip} />

      <ParticipantAppendix slip={slip} />

      <LocationScheduleAppendix slip={slip} />

      <VehicleScheduleAppendix slip={slip} />

      <ClauseWordingAppendix slip={slip} />

      <AttachmentContents slip={slip} prints={props.prints} />
    </DocumentShell>
  )
}
