"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FileDown, Loader2, Ship } from "lucide-react"
import { toast } from "sonner"

import { recordPoliciesFromClosingAction } from "@/app/(app)/placement/actions"
import { AttachmentContents } from "@/components/documents/attachment-contents"
import { DocumentShell } from "@/components/documents/document-shell"
import { HullInterestBlock, HullPremiumAttached } from "@/components/documents/hull-documents"
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
  MultiYearPremiumAppendix,
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
import { SignatureSlot } from "@/components/documents/signature"
import { derivedDocNumber } from "@/components/underwriting/slip-model"
import { Button } from "@/components/ui/button"
import { rateUnitFor } from "@/lib/calc"
import type { AttachmentPrints } from "@/lib/attachment-print"
import type { PlacingSlip } from "@/lib/data"
import { usesHullSchedule } from "@/lib/marine-hull"
import type { DocumentSignatory } from "@/lib/document-signatories"
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
import { isMultiYearMotor } from "@/lib/multi-year"
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
  /** Tanda tangan LCH yang bisa dipilih di halaman cetak (Harry, 19 November 2026). */
  signatories?: DocumentSignatory[]
}

/**
 * Polis yang tercatat otomatis di Policy Database saat CI terbit (LCH, 10 November 2026).
 * Kalau belum ada polis, user Policy Database bisa mencatatnya dari sini.
 */
function LinkedPoliciesNotice({
  slipId,
  policies,
  canRecord,
  openCover,
}: {
  slipId: string
  policies: string[]
  canRecord: boolean
  /** Slip open cover: polisnya polis induk MOP, deklarasinya dicatat dari polis itu. */
  openCover: boolean
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
          {openCover
            ? "Belum ada polis MOP di Policy Database untuk Closing Instruction ini."
            : "Belum ada polis di Policy Database untuk Closing Instruction ini."}{" "}
          <Link href="/policies" className="font-medium text-primary underline-offset-2 hover:underline">
            Buka Policy Database
          </Link>
        </p>
        {canRecord ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={record} disabled={isPending}>
              {isPending
                ? "Mencatat polis…"
                : openCover
                  ? "Catat polis MOP dari CI ini"
                  : "Catat polis dari CI ini"}
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
      {openCover ? "Polis MOP tercatat di Policy Database: " : "Polis tercatat di Policy Database: "}
      <span className="font-medium tabular">{policies.join(", ")}</span>.
      {provisional
        ? " Nomor sementara dari CI; ganti dengan nomor polis dari asuransi dan unggah polisnya."
        : null}
      {openCover
        ? " Deklarasi pengiriman dicatat dari polis itu lewat menu Tambah deklarasi."
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
function SlipRateAndPremium({
  slip,
  internal = false,
}: {
  slip: PlacingSlip
  /** Quotation Slip Internal LCH: perhitungan premi ikut additional discount (MoM poin 7). */
  internal?: boolean
}) {
  // Jadwal premi installment tidak dicetak di slip; tampil di Policy Database dan report
  // (Agus, 22 November 2026).
  return <SlipPremiumCalculation slip={slip} internal={internal} />
}

function SlipPremiumCalculation({
  slip,
  internal = false,
}: {
  slip: PlacingSlip
  internal?: boolean
}) {
  // Open cover: rate per kategori, premi per deklarasi.
  if (usesOpenCover(slip)) return <OpenCoverRateBlock slip={slip} />
  // Marine Hull jadwal kapal: rate "as per schedule attached", premi per section.
  if (usesHullSchedule(slip))
    return <HullPremiumAttached slip={slip} schedule={slip.hullSchedule} internal={internal} />
  // Multi lokasi atau kendaraan: badan dokumen menulis "As Attached" (Opsi B), jadwal premi
  // dicetak di lampiran DAFTAR LOKASI atau DAFTAR UNIT KENDARAAN.
  if (isMultiLocation(slip)) return <LocationPremiumAttached slip={slip} internal={internal} />
  // Polis multi tahun: premi per tahun polis ada di lampiran PERHITUNGAN PREMI PER TAHUN POLIS.
  if (isMultiVehicle(slip) || isMultiYearMotor(slip))
    return <VehiclePremiumAttached slip={slip} internal={internal} />
  // Slip multi objek COB lain: jadwal premi per objek, lalu diskon dan biaya.
  if (isMultiItem(slip)) {
    return (
      <>
        <ObjectPremiumSchedule slip={slip} />
        <PayableTable slip={slip} internal={internal} />
      </>
    )
  }
  if (isParEqvetSlip(slip)) {
    return (
      <>
        <SectionHeading>RATE</SectionHeading>
        <ParEqvetRateBlock slip={slip} />
        <SectionHeading>PREMIUM CALCULATION</SectionHeading>
        <ParEqvetCalculationBlock slip={slip} internal={internal} />
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
      <PayableTable slip={slip} internal={internal} />
    </>
  )
}

/** Interest slip; Marine Hull dengan jadwal kapal memakai kata-kata format Patria atau MHL. */
function SlipInterest({ slip }: { slip: PlacingSlip }) {
  if (usesHullSchedule(slip)) return <HullInterestBlock slip={slip} schedule={slip.hullSchedule} />
  return <InterestBlock slip={slip} />
}

/** Tombol ke dokumen Jadwal Kapal (lampiran landscape) untuk slip Marine Hull dengan jadwal. */
function VesselScheduleLink({ slip }: { slip: PlacingSlip }) {
  if (!usesHullSchedule(slip)) return null
  return (
    <Button
      variant="outline"
      size="sm"
      render={<Link href={`/placement/vessel-schedule/${slip.id}`} />}
      nativeButton={false}
    >
      <Ship data-icon="inline-start" />
      Jadwal Kapal
    </Button>
  )
}

export function PlacingSlipDocument(props: DocProps) {
  const slip = useSlip(props)
  if (!slip) return <Missing />
  // Tanggal release; dokumen sebelum 1 September 2025 memakai kop Lestari.
  const date = slipDocumentDate(slip, "placing")
  const kop = letterheadFor(date)
  return (
    <DocumentShell
      slip
      backHref={`/placement/edit/${slip.id}`}
      variant={kop}
      signatories={props.signatories}
      actions={<VesselScheduleLink slip={slip} />}
    >
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
      <SlipInterest slip={slip} />
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


      <MultiYearPremiumAppendix slip={slip} />

      <ClauseWordingAppendix slip={slip} />

      <AttachmentContents slip={slip} prints={props.prints} />
    </DocumentShell>
  )
}

/**
 * Quotation Slip. `internal` mencetak Quotation Slip Internal LCH: format yang sama, dengan
 * additional discount di PREMIUM CALCULATION (MoM review Phase 1, poin 7). Format biasa untuk
 * tertanggung tidak memuat additional discount.
 */
export function QuotationSlipDocument({
  internal = false,
  ...props
}: DocProps & { internal?: boolean }) {
  const slip = useSlip(props)
  if (!slip) return <Missing />
  const number = derivedDocNumber(slip.slipNo, "QS")
  const date = slipDocumentDate(slip, "quotation")
  const kop = letterheadFor(date)

  return (
    <DocumentShell
      slip
      backHref={`/placement/quotation/edit/${slip.id}`}
      variant={kop}
      signatories={props.signatories}
      actions={<VesselScheduleLink slip={slip} />}
    >
      <Letterhead variant={kop} />
      <DocTitle
        title={internal ? "QUOTATION SLIP — INTERNAL LCH" : "QUOTATION SLIP"}
        number={number ? `No. ${number}` : "DRAFT"}
        muted={!number}
      />
      <DetailTable slip={slip} />
      <CoverageBlock slip={slip} />
      <SlipInterest slip={slip} />
      <DeductibleBlock slip={slip} />

      {/* Same layout as Placing Slip: titles here, full wording in the appendix. */}
      <ClausesBlock slip={slip} />
      <ExclusionsBlock slip={slip} />

      <SlipRateAndPremium slip={slip} internal={internal} />

      <SubjectivityBlock slip={slip} />

      <SecurityPanelBlock slip={slip} />

      <SignatureGrid
        place={`Jakarta, ${dateEn(date)}`}
        company={LETTERHEAD_COMPANY[kop]}
        confirmationTitle="KONFIRMASI TERTANGGUNG / INSURED CONFIRMATION"
      />

      <AttachmentList slip={slip} />

      <ParticipantAppendix slip={slip} />

      <LocationScheduleAppendix slip={slip} internal={internal} />

      <VehicleScheduleAppendix slip={slip} internal={internal} />


      <MultiYearPremiumAppendix slip={slip} />

      <ClauseWordingAppendix slip={slip} />

      <AttachmentContents slip={slip} prints={props.prints} />
    </DocumentShell>
  )
}

function SaveCoverNoteWordButton({ slip }: { slip: PlacingSlip }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const { exportCoverNoteDocx } = await import("@/lib/cover-note-docx")
      await exportCoverNoteDocx(slip)
      toast.success("Dokumen Cover Note berhasil disimpan ke format Word (.docx)")
    } catch (err) {
      console.error(err)
      toast.error("Gagal menyimpan dokumen ke format Word")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={downloading}
      onClick={handleDownload}
    >
      {downloading ? (
        <Loader2 data-icon="inline-start" className="animate-spin" />
      ) : (
        <FileDown data-icon="inline-start" />
      )}
      {downloading ? "Menyiapkan Word…" : "Save Word"}
    </Button>
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
      actions={
        <>
          <VesselScheduleLink slip={slip} />
          <SaveCoverNoteWordButton slip={slip} />
        </>
      }
    >
      <DocTitle title="COVER NOTE" />
      <DetailTable slip={slip} />
      <CoverageBlock slip={slip} />
      <SlipInterest slip={slip} />
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


      <MultiYearPremiumAppendix slip={slip} />

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
      signatories={props.signatories}
      actions={<VesselScheduleLink slip={slip} />}
      notice={
        slip.status === "Closed" && props.linkedPolicies ? (
          <LinkedPoliciesNotice
            slipId={slip.id}
            policies={props.linkedPolicies}
            canRecord={props.canRecordPolicy ?? false}
            openCover={usesOpenCover(slip)}
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
      <SlipInterest slip={slip} />
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
          <p className="text-muted-foreground">Disiapkan oleh / Prepared by,</p>
          <SignatureSlot />
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


      <MultiYearPremiumAppendix slip={slip} />

      <ClauseWordingAppendix slip={slip} />

      <AttachmentContents slip={slip} prints={props.prints} />
    </DocumentShell>
  )
}
