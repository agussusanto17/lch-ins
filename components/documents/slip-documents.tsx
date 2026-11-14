"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { recordPoliciesFromClosingAction } from "@/app/(app)/placement/actions"
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
import {
  LETTERHEAD_COMPANY,
  letterheadFor,
  slipDocumentDate,
} from "@/lib/document-dates"
import { dateEn } from "@/lib/format"
import { isProvisionalPolicyNo } from "@/lib/policy-from-slip"
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
  /** Nomor polis yang tercatat dari slip ini (Closing Instruction), dimuat server. */
  linkedPolicies?: string[]
  /** User boleh mengelola Policy Database, jadi tombol "Catat polis" tampil. */
  canRecordPolicy?: boolean
}

/**
 * Polis yang tercatat otomatis di Policy Database saat CI terbit (LCH, 10 November 2026).
 * Kalau belum ada polis, user Policy Database bisa mencatatnya dari sini.
 */
function LinkedPoliciesNotice({
  slipId,
  policies,
  canRecord,
}: {
  slipId: string
  policies: string[]
  canRecord: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const record = () => {
    setError(null)
    startTransition(async () => {
      const res = await recordPoliciesFromClosingAction(slipId)
      if (res.ok) router.refresh()
      else setError(res.error ?? "Gagal mencatat polis.")
    })
  }

  if (!policies.length) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground">
          Belum ada polis di Policy Database untuk Closing Instruction ini.{" "}
          <Link href="/policies" className="font-medium text-primary underline-offset-2 hover:underline">
            Buka Policy Database
          </Link>
        </p>
        {canRecord ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={record} disabled={isPending}>
              {isPending ? "Mencatat polis…" : "Catat polis dari CI ini"}
            </Button>
            {error ? (
              <span role="alert" className="text-destructive">
                Polis belum tercatat: {error}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }
  const provisional = policies.some(isProvisionalPolicyNo)
  return (
    <p>
      Polis tercatat di Policy Database:{" "}
      <span className="font-medium tabular">{policies.join(", ")}</span>.
      {provisional
        ? " Nomor sementara dari CI; ganti dengan nomor polis dari asuransi dan unggah polisnya."
        : null}{" "}
      <Link href="/policies" className="font-medium text-primary underline-offset-2 hover:underline">
        Buka Policy Database
      </Link>
    </p>
  )
}

/**
 * SUBJECTIVITY dicetak tepat di atas SECURITY di Quotation Slip, Cover Note,
 * dan Closing Instruction (permintaan LCH, 10 November 2026).
 */
function SubjectivityBlock({ slip }: { slip: PlacingSlip }) {
  if (!slip.subjectivity) return null
  return (
    <>
      <SectionHeading>SUBJECTIVITY</SectionHeading>
      <HangingIndentText
        text={slip.subjectivity}
        className="text-[12.5px] leading-relaxed"
      />
    </>
  )
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
      <Button render={<Link href="/placement" />} nativeButton={false}>
        <ArrowLeft data-icon="inline-start" />
        Kembali ke Placement
      </Button>
    </div>
  )
}

/**
 * Brokerage tidak dicetak di bawah GRAND TOTAL PREMIUM (Harry, 5 November 2026).
 * Placing Slip dan Closing Instruction mencetaknya di BrokerageBlock.
 */
function SlipRateAndPremium({ slip }: { slip: PlacingSlip }) {
  // Open cover: rate per kategori, premi per deklarasi.
  if (usesOpenCover(slip)) return <OpenCoverRateBlock slip={slip} />
  // Multi lokasi atau kendaraan: badan dokumen menulis "As Attached" (Opsi B), jadwal premi
  // dicetak di lampiran DAFTAR LOKASI atau DAFTAR UNIT KENDARAAN.
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
  // Tanggal release; dokumen sebelum 1 September 2025 memakai kop Lestari.
  const date = slipDocumentDate(slip, "placing")
  const kop = letterheadFor(date)
  return (
    <DocumentShell slip backHref={`/placement/edit/${slip.id}`} variant={kop}>
      <Letterhead variant={kop} />
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
      <CoverageBlock slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />
      <ClausesBlock slip={slip} />
      <ExclusionsBlock slip={slip} />

      <SlipRateAndPremium slip={slip} />

      <BrokerageBlock slip={slip} />

      <SignatureGrid
        place={`Jakarta, ${dateEn(date)}`}
        company={LETTERHEAD_COMPANY[kop]}
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
  const date = slipDocumentDate(slip, "quotation")
  const kop = letterheadFor(date)

  return (
    <DocumentShell slip backHref={`/placement/quotation/edit/${slip.id}`} variant={kop}>
      <Letterhead variant={kop} />
      <DocTitle
        title="QUOTATION SLIP"
        number={number ? `No. ${number}` : "DRAFT"}
        muted={!number}
      />
      <DetailTable slip={slip} />
      <CoverageBlock slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />

      {/* Same layout as Placing Slip: titles here, full wording in the appendix. */}
      <ClausesBlock slip={slip} />
      <ExclusionsBlock slip={slip} />

      <SlipRateAndPremium slip={slip} />

      <SubjectivityBlock slip={slip} />

      <SecurityPanelBlock slip={slip} />

      <SignatureGrid
        place={`Jakarta, ${dateEn(date)}`}
        company={LETTERHEAD_COMPANY[kop]}
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
  // Terbit setelah Closing Instruction, jadi memakai tanggal closing; footer ikut
  // kop pada tanggal itu.
  const date = slipDocumentDate(slip, "coverNote")
  return (
    // Draft cover note prints without the LCH letterhead and number (sample of 6 Nov 2026).
    // Isinya Closing Instruction tanpa brokerage dan instruksi ke asuransi (LCH, 10 November 2026).
    <DocumentShell
      slip
      backHref={`/placement/closing/edit/${slip.id}`}
      letterhead={false}
      variant={letterheadFor(date)}
    >
      <DocTitle title="COVER NOTE" />
      <DetailTable slip={slip} />
      <CoverageBlock slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />

      <ClausesBlock slip={slip} />
      <ExclusionsBlock slip={slip} />

      <SlipRateAndPremium slip={slip} />

      <SubjectivityBlock slip={slip} />

      <SecurityPanelBlock slip={slip} />

      {slip.coverNoteRemarks ? (
        <>
          <SectionHeading>REMARKS</SectionHeading>
          <HangingIndentText
            text={slip.coverNoteRemarks}
            className="text-[12.5px] leading-relaxed"
          />
        </>
      ) : null}

      <CoverNoteSignature slip={slip} place={`Jakarta, ${dateEn(date)}`} />

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
  const date = slipDocumentDate(slip, "closing")
  const kop = letterheadFor(date)

  return (
    <DocumentShell
      slip
      backHref={`/placement/closing/edit/${slip.id}`}
      variant={kop}
      notice={
        slip.status === "Closed" && props.linkedPolicies ? (
          <LinkedPoliciesNotice
            slipId={slip.id}
            policies={props.linkedPolicies}
            canRecord={props.canRecordPolicy ?? false}
          />
        ) : undefined
      }
    >
      <Letterhead variant={kop} />
      <DocTitle
        title="CLOSING INSTRUCTION"
        number={number ? `No. ${number}` : "DRAFT"}
        muted={!number}
      />
      <DetailTable slip={slip} />
      <CoverageBlock slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />

      <ClausesBlock slip={slip} />
      <ExclusionsBlock slip={slip} />

      <SlipRateAndPremium slip={slip} />

      <BrokerageBlock slip={slip} />

      <SubjectivityBlock slip={slip} />

      <SecurityPanelBlock slip={slip} />

      {slip.closingInstruction ? (
        <>
          <SectionHeading>INSTRUCTION</SectionHeading>
          <HangingIndentText
            text={slip.closingInstruction}
            className="text-[12.5px] leading-relaxed"
          />
        </>
      ) : null}

      <p className="mt-8 mb-1 break-after-avoid text-[13px]">
        Jakarta, {dateEn(date)}
      </p>
      {/*
       * CI dikirim per asuransi, jadi tanda tangan asuransi cukup satu kolom (Agus, 9 November 2026).
       * Nama asuransi dicetak bila hanya satu; co-insurance dikosongkan untuk cap dan tanggal penerima.
       */}
      <div className="avoid-break mt-4 grid grid-cols-1 gap-x-8 gap-y-10 text-[13px] sm:grid-cols-2">
        <div>
          <p className="mb-14 text-muted-foreground">
            Disiapkan oleh / Prepared by,
          </p>
          <p className="border-t pt-1 font-bold">{LETTERHEAD_COMPANY[kop]}</p>
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
