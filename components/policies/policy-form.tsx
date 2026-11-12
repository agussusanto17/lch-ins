"use client"

import * as React from "react"
import { FileUp, Link2 } from "lucide-react"
import { toast } from "sonner"
import * as z from "zod"

import {
  attachPolicyFileAction,
  createPolicyAction,
  updatePolicyAction,
} from "@/app/(app)/policies/actions"
import { FormDrawer } from "@/components/shared/form-drawer"
import { useFormOptions } from "@/components/shared/form-options-provider"
import {
  NumberField,
  SearchSelect,
  SelectInput,
  TextField,
  type Option,
} from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"
import { EndorsementParticipants } from "@/components/policies/endorsement-participants"
import { brokerageCapFor, slipPolicyParts, sumPercent } from "@/lib/calc"
import {
  POLICY_TYPES,
  POLICY_TYPES_WITH_PARENT,
  type ClassOfBusiness,
  type PlacingSlip,
  type Policy,
  type PolicyFileKind,
  type PolicyType,
  type SlipPart,
  type SlipParticipant,
} from "@/lib/data"
import { addMonths } from "@/lib/date"
import {
  POLICY_TYPE_CODES,
  cobLabels,
  coversFor,
  fixedLookupItems,
} from "@/lib/form-options"
import { dateShort, money, num } from "@/lib/format"
import {
  DAYS_PER_YEAR,
  endorsementPremium,
  premiumBasis,
  prorataDays,
  totalPremium,
} from "@/lib/endorsement-premium"
import { openCoverRateText, usesOpenCover } from "@/lib/open-cover"
import { parentPolicyIssue, parentPolicyLabel } from "@/lib/policy-parent"
import { cancellationSuggestion } from "@/lib/policy-cancellation"
import { isProvisionalPolicyNo, policyFieldsFromSlip } from "@/lib/policy-from-slip"
import {
  POLICY_FILE_KINDS,
  latestPolicyFile,
  policyFileKindsFor,
} from "@/lib/policy-files"
import { rosterPolicy } from "@/lib/policy-participants"
import type { ClientOption } from "@/lib/server/clients"
import type { PolicyFormOptions, PolicyInput } from "@/lib/server/policies"
import { newId, store } from "@/lib/store"
import { uploadInParts } from "@/lib/upload-client"
import {
  MAX_POLICY_FILE_BYTES,
  POLICY_FILE_HINT,
  UPLOAD_ACCEPT,
  uploadProblem,
} from "@/lib/uploads"
import { requiredText, validate, type FieldErrors } from "@/lib/validation"

type Draft = Omit<Policy, "id" | "files"> & { id: string | null }

function emptyDraft(): Draft {
  return {
    id: null,
    policyNo: "",
    clientId: null,
    placingSlipId: null,
    parentPolicyId: null,
    previousPolicyNo: null,
    insuredName: "",
    insurer: "",
    insurers: [],
    cob: "Property",
    typeOfCover: "",
    inceptionDate: "",
    expiryDate: "",
    currency: "IDR",
    sumInsured: 0,
    premium: 0,
    brokeragePct: 0,
    additionalFee: 0,
    rate: null,
    premiumBasis: null,
    adminCost: 0,
    stampDuty: 0,
    slipPart: null,
    type: "Baru",
    riskLocation: "",
    cobOjkClassId: null,
    placementLocationId: null,
    groupingInsured: "",
    premiumPaidDate: null,
    remarks: null,
  }
}

// Keeps a saved value selectable after it is deactivated or renamed in master data.
function withCurrent(items: Option[], value: string | null | undefined): Option[] {
  return value && !items.some((i) => i.value === value)
    ? [...items, { label: value, value }]
    : items
}

/**
 * Premi endorsement dengan rate dihitung dari sum insured × rate × hari
 * prorata / 365 (Harry, 11 November 2026). Tanpa rate, premi tetap manual.
 */
function withProrataPremium(d: Draft): Draft {
  const premium = endorsementPremium(d)
  return premium === null || premium === d.premium ? d : { ...d, premium }
}

const schema = z
  .object({
    policyNo: requiredText("No. polis"),
    type: z.enum(POLICY_TYPES as [PolicyType, ...PolicyType[]]),
    parentPolicyId: z.string().nullable(),
    previousPolicyNo: z.string().nullable().optional(),
    clientId: z
      .string({ error: "Klien wajib dipilih" })
      .min(1, "Klien wajib dipilih"),
    insuredName: requiredText("Nama tertanggung"),
    insurer: requiredText("Asuransi"),
    cob: z.string().min(1),
    currency: z.string().min(1),
    inceptionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai wajib diisi"),
    expiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal berakhir wajib diisi"),
    // Endorsement mencatat selisih: pengurangan UP negatif, seperti premi dan fee.
    sumInsured: z.number(),
    premium: z.number(),
    brokeragePct: z
      .number()
      .min(0, "Brokerage tidak boleh negatif")
      .max(100, "Brokerage maksimal 100%"),
    additionalFee: z.number().optional(),
    rate: z.number().min(0, "Rate tidak boleh negatif").max(100, "Rate maksimal 100%").nullable().optional(),
    premiumBasis: z.number().nullable().optional(),
    adminCost: z.number().min(0, "Admin cost tidak boleh negatif").optional(),
    stampDuty: z.number().min(0, "Stamp duty tidak boleh negatif").optional(),
  })
  .superRefine((d, ctx) => {
    // Tanggal sama boleh: polis acara satu hari, misalnya Hole in One.
    if (d.expiryDate && d.inceptionDate && d.expiryDate < d.inceptionDate) {
      ctx.addIssue({
        code: "custom",
        path: ["expiryDate"],
        message: "Tanggal berakhir tidak boleh sebelum tanggal mulai",
      })
    }
    // Renewal boleh tanpa polis di sistem asal nomornya diisi.
    const parentIssue = parentPolicyIssue(d)
    if (parentIssue) {
      ctx.addIssue({ code: "custom", path: ["parentPolicyId"], message: parentIssue })
    }
    if ((d.type === "Baru" || d.type === "Renewal") && d.premium <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["premium"],
        message: "Premi polis baru dan renewal harus lebih dari 0",
      })
    }
    if ((d.type === "Baru" || d.type === "Renewal") && d.sumInsured < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["sumInsured"],
        message: "Sum insured polis baru dan renewal tidak boleh negatif",
      })
    }
    if (
      (d.type === "Baru" || d.type === "Renewal") &&
      (d.additionalFee ?? 0) < 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["additionalFee"],
        message: "Additional fee polis baru dan renewal tidak boleh negatif",
      })
    }
    if (d.type === "Cancellation" && d.premium > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["premium"],
        message:
          "Pembatalan mencatat pengembalian premi, isi dengan nilai negatif",
      })
    }
  })

export function PolicyForm({
  open,
  onOpenChange,
  policy,
  preset,
  clientOptions,
  formOptions,
  policies,
  slips,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Polis yang diedit. Kosong berarti tambah polis baru. */
  policy?: Policy | null
  /** Isian awal, misalnya endorsement dari polis induk. */
  preset?: Partial<Draft>
  clientOptions: ClientOption[]
  formOptions: PolicyFormOptions
  /** Daftar polis untuk pilihan polis induk dan cek nomor ganda. */
  policies: Policy[]
  /** Slip berstatus Quoted atau Closed dari database. */
  slips: PlacingSlip[]
}) {

  // Parent memberi `key` baru setiap drawer dibuka, jadi state awal cukup
  // diambil dari props di sini tanpa effect.
  const [draft, setDraft] = React.useState<Draft>(() =>
    policy ? { ...policy } : { ...emptyDraft(), ...preset }
  )
  const [errors, setErrors] = React.useState<FieldErrors>({})
  // Berkas yang dipilih per jenis: Polis, Premium Note, Commission Note.
  const [pickedFiles, setPickedFiles] = React.useState<
    Partial<Record<PolicyFileKind, File>>
  >({})
  // Perubahan peserta PA grup, hanya untuk endorsement baru.
  const [addedParticipants, setAddedParticipants] = React.useState<SlipParticipant[]>([])
  const [removedParticipantIds, setRemovedParticipantIds] = React.useState<string[]>([])

  // Endorsement dengan rate: premi ikut dihitung ulang setiap isian berubah.
  const set = (patch: Partial<Draft>) =>
    setDraft((d) => withProrataPremium({ ...d, ...patch }))
  // Pesan polis rujukan dari simpan sebelumnya tidak berlaku lagi setelah
  // tipe, polis rujukan, atau no. polis sebelumnya diubah.
  const setParent = (patch: Partial<Draft>) => {
    set(patch)
    setErrors((e) => {
      if (!e.parentPolicyId) return e
      const rest = { ...e }
      delete rest.parentPolicyId
      return rest
    })
  }

  const clientItems = clientOptions.map((c) => ({ label: c.name, value: c.id }))
  const clientOptionFor = (id: string | null) =>
    clientOptions.find((c) => c.id === id)
  // Polis yang sudah dibatalkan tidak bisa dipilih lagi, kecuali induk yang
  // tersimpan pada record ini, misalnya saat mengedit pembatalannya sendiri.
  const parentItems = policies
    .filter(
      (p) =>
        p.id !== draft.id &&
        p.type !== "Cancellation" &&
        (!p.cancelled || p.id === policy?.parentPolicyId)
    )
    .map((p) => ({ label: `${p.policyNo} — ${p.insuredName}`, value: p.id }))
  // Slip yang sudah menjadi polis tidak muncul lagi; slip PAR + EQVET muncul
  // sampai kedua bagiannya punya polis. Polis lama tanpa bagian memakai seluruh
  // slip. Hasil kosong berarti slip habis; [null] berarti slip utuh tersedia.
  function freeSlipParts(slip: PlacingSlip): (SlipPart | null)[] {
    // Slip open cover menerbitkan satu polis per deklarasi (Harry, 6 November 2026).
    if (usesOpenCover(slip)) return [null]
    const used = policies.filter(
      (p) => p.placingSlipId === slip.id && p.id !== draft.id
    )
    const parts = slipPolicyParts(slip)
    if (!parts.length) return used.length ? [] : [null]
    if (used.some((p) => !p.slipPart)) return []
    return parts.filter((part) => !used.some((p) => p.slipPart === part))
  }
  const slipItems = slips
    .filter(
      (s) =>
        (s.status === "Quoted" || s.status === "Closed") &&
        (s.id === draft.placingSlipId || freeSlipParts(s).length > 0)
    )
    .map((s) => ({
      label: `${s.slipNo ?? "Draft"} — ${s.insuredName}`,
      value: s.id,
    }))
  const needsParent = POLICY_TYPES_WITH_PARENT.includes(draft.type)
  const parentPolicy = draft.parentPolicyId
    ? (policies.find((p) => p.id === draft.parentPolicyId) ?? null)
    : null
  // Daftar peserta dan rate milik polis asal, walau induknya endorsement lain.
  const rosterOwner = parentPolicy ? rosterPolicy(parentPolicy, policies) : null
  const participantChangesOn =
    !policy && draft.type === "Endorsement" && rosterOwner?.cob === "General Accident"
  // Endorsement dan pembatalan: tanggal mulai adalah tanggal efektif perubahan.
  const changesParent = draft.type === "Endorsement" || draft.type === "Cancellation"
  // Premi prorata hari endorsement (Harry, 11 November 2026).
  const isEndorsement = draft.type === "Endorsement"
  const endorsementDays = prorataDays(draft.inceptionDate, draft.expiryDate)
  const prorataOn = isEndorsement && Boolean(draft.rate)
  // Usulan pengembalian premi prorata untuk pembatalan, dari polis asal beserta
  // endorsement-nya, seperti dokumen pembatalan asuransi dari Harry (10 November 2026).
  const cancelledPolicy = draft.type === "Cancellation" ? (rosterOwner ?? parentPolicy) : null
  const cancellation =
    cancelledPolicy && /^\d{4}-\d{2}-\d{2}$/.test(draft.inceptionDate)
      ? cancellationSuggestion({
          policy: cancelledPolicy,
          endorsements: policies.filter(
            (p) =>
              p.type === "Endorsement" &&
              p.id !== draft.id &&
              rosterPolicy(p, policies)?.id === cancelledPolicy.id
          ),
          effectiveDate: draft.inceptionDate,
        })
      : null
  // Polis dari placing slip: data penempatan mengikuti slip dan dikunci.
  // Polis baru bisa dilepas dari slip untuk diisi manual; perubahan sesudah
  // polis terbit lewat endorsement. Periode slip yang TBA tetap diisi di sini.
  const linkedSlip = draft.placingSlipId
    ? (slips.find((s) => s.id === draft.placingSlipId) ?? null)
    : null
  const slipLocked = Boolean(draft.placingSlipId)
  // Polis dari slip open cover adalah satu deklarasi: nilai, premi, dan
  // periodenya diisi per deklarasi; data lain tetap dari slip.
  const openCoverSlip = linkedSlip ? usesOpenCover(linkedSlip) : false
  const periodLocked =
    Boolean(linkedSlip?.inceptionDate && linkedSlip.expiryDate) && !openCoverSlip
  // COB dan type of cover dari master data. Nilai polis lama yang sudah tidak
  // ada di master tetap tampil supaya tidak hilang saat diedit.
  const masterOptions = useFormOptions()
  const cobItems = withCurrent(
    cobLabels(masterOptions).map((c) => ({ label: c, value: c })),
    draft.cob
  ).map((i) => i.value)
  const coverItems = withCurrent(
    coversFor(masterOptions, draft.cob).map((c) => ({
      label: c.name,
      value: c.name,
    })),
    draft.typeOfCover
  ).map((i) => i.value)
  // Type of cover tanpa tarif OJK, misalnya Heavy Equipment, tanpa batas brokerage.
  const brokerageCap = brokerageCapFor(
    draft.cob,
    coversFor(masterOptions, draft.cob).find((c) => c.name === draft.typeOfCover)
      ?.ojkTariff
  )
  const insurerItems = withCurrent(
    formOptions.insurers.map((name) => ({ label: name, value: name })),
    draft.insurer
  )
  const currencyItems = withCurrent(
    formOptions.currencies.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.code })),
    draft.currency
  )
  const placementItems = formOptions.placementLocations
    .filter((l) => l.isActive || l.id === draft.placementLocationId)
    .map((l) => ({ label: l.name, value: l.id }))
  const ojkClassItems = formOptions.cobOjkClasses
    .filter((c) => c.isActive || c.id === draft.cobOjkClassId)
    .map((c) => ({ label: c.name, value: c.id }))

  // Aturan salin sama dengan polis otomatis saat Closing Instruction terbit.
  function slipPatch(slip: PlacingSlip, part: SlipPart | null): Partial<Draft> {
    return policyFieldsFromSlip(slip, part, clientOptionFor(slip.clientId))
  }

  function fromSlip(slipId: string | null) {
    const slip = slipId ? slips.find((s) => s.id === slipId) : null
    if (!slip) {
      set({ placingSlipId: null, slipPart: null })
      return
    }
    set(slipPatch(slip, freeSlipParts(slip)[0] ?? null))
  }

  function fromParent(parentId: string | null) {
    const parent = parentId ? policies.find((p) => p.id === parentId) : null
    if (!parent) {
      setParent({ parentPolicyId: null })
      return
    }
    // Polis sebelumnya dari sistem menggantikan nomor yang diketik.
    setParent({ previousPolicyNo: null })
    // Polis dari slip hanya menautkan polis induk; datanya tetap dari slip.
    if (draft.placingSlipId) {
      set({ parentPolicyId: parent.id })
      return
    }
    const renewal = draft.type === "Renewal"
    set({
      parentPolicyId: parent.id,
      clientId: parent.clientId,
      insuredName: parent.insuredName,
      insurer: parent.insurer,
      insurers: parent.insurers,
      cob: parent.cob,
      typeOfCover: parent.typeOfCover ?? "",
      currency: parent.currency,
      riskLocation: parent.riskLocation,
      brokeragePct: parent.brokeragePct,
      cobOjkClassId: parent.cobOjkClassId,
      placementLocationId: parent.placementLocationId,
      groupingInsured: parent.groupingInsured,
      sumInsured: renewal ? parent.sumInsured : draft.sumInsured,
      // Renewal melanjutkan periode; endorsement dan pembatalan ikut sisa periode induk.
      inceptionDate: renewal ? parent.expiryDate : draft.inceptionDate,
      expiryDate: renewal
        ? addMonths(parent.expiryDate, 12)
        : parent.expiryDate,
    })
  }

  async function submit() {
    const result = validate(schema, draft)
    const errs = { ...result.errors }
    const duplicate = policies.find(
      (p) =>
        p.id !== draft.id &&
        p.policyNo.trim().toLowerCase() === draft.policyNo.trim().toLowerCase()
    )
    if (duplicate) errs.policyNo = "No. polis sudah terdaftar"
    setErrors(errs)
    if (!result.ok || duplicate) return false
    const incomplete = participantChangesOn
      ? addedParticipants.findIndex((p) => !p.name.trim() || !(p.sumInsured > 0))
      : -1
    if (incomplete >= 0) {
      toast.error("Peserta tambahan belum lengkap", {
        description: `Isi nama dan sum insured peserta tambahan nomor ${incomplete + 1}.`,
      })
      return false
    }

    const insurers =
      draft.insurers.length &&
      draft.insurers.some((r) => r.insurer === draft.insurer)
        ? draft.insurers
        : [
            {
              id: newId("pi"),
              insurer: draft.insurer,
              share: 100,
              role: "As Leader" as const,
            },
          ]
    const { id, ...fields } = draft
    const input: PolicyInput = {
      ...fields,
      policyNo: draft.policyNo.trim(),
      insuredName: draft.insuredName.trim(),
      insurers,
      participantChanges: participantChangesOn
        ? { added: addedParticipants, removedIds: removedParticipantIds }
        : undefined,
    }
    const res = id ? await updatePolicyAction(id, input) : await createPolicyAction(input)
    if (!res.ok || !res.data) {
      toast.error("Gagal menyimpan polis", { description: res.error })
      return false
    }

    let record: Policy = res.data
    for (const { kind, label } of POLICY_FILE_KINDS) {
      const picked = pickedFiles[kind]
      if (!picked) continue
      // Polis sudah tersimpan; berkas yang gagal bisa diunggah ulang dari
      // menu Berkas polis.
      const progress = toast.loading(`Mengunggah ${label}…`, { description: picked.name })
      const staged = await uploadInParts(picked, "policy_file", (sent, total) => {
        if (total > 1) {
          toast.loading(`Mengunggah ${label} ${Math.round((sent / total) * 100)}%…`, {
            id: progress,
            description: picked.name,
          })
        }
      })
      const attached =
        staged.ok && staged.data
          ? await attachPolicyFileAction(record.id, staged.data.id, kind)
          : { ok: false as const, error: staged.error, data: undefined }
      toast.dismiss(progress)
      if (attached.ok && attached.data) {
        record = attached.data
      } else {
        toast.error(`${label} ${picked.name} gagal diunggah`, {
          description: attached.error,
        })
      }
    }
    store.upsert("policies", record)
    toast.success(id ? "Polis diperbarui" : "Polis tersimpan", {
      description: `${record.policyNo} · ${record.insuredName}`,
    })
    onOpenChange(false)
  }

  const coShare = sumPercent(draft.insurers.map((r) => r.share))

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={policy ? "Edit Polis" : "Tambah Polis"}
      description="Data polis yang sudah terbit dari perusahaan asuransi. Field bertanda * wajib diisi."
      onSubmit={submit}
    >
      <FieldGroup>
        {!policy ? (
          <SearchSelect
            label="Ambil dari placing slip"
            items={slipItems}
            value={draft.placingSlipId}
            onValueChange={fromSlip}
            placeholder="Pilih slip Quoted atau Closed (opsional)"
            emptyMessage="Tidak ada slip Quoted atau Closed yang belum menjadi polis"
            description={
              slipLocked
                ? "Data dari slip dikunci. Kosongkan pilihan slip untuk mengisi manual."
                : "Tertanggung, COB, periode, nilai, dan panel asuransi terisi dari slip."
            }
          />
        ) : draft.placingSlipId ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link2 className="size-3.5" />
            Terhubung ke placing slip{" "}
            {linkedSlip?.slipNo ?? policy.placingSlipNo}
            {draft.slipPart ? `, bagian ${draft.slipPart}` : ""}. Data dari
            slip dikunci; perubahan sesudah polis terbit lewat endorsement.
          </p>
        ) : null}

        {!policy && linkedSlip && slipPolicyParts(linkedSlip).length ? (
          <SelectInput
            label="Bagian Slip"
            required
            items={freeSlipParts(linkedSlip).filter(
              (p): p is SlipPart => p !== null
            )}
            value={draft.slipPart ?? ""}
            onValueChange={(v) => set(slipPatch(linkedSlip, v as SlipPart))}
            description="Slip PAR + EQVET terbit sebagai dua polis. Premium terisi sesuai bagian; additional fee ikut polis PAR."
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="No. Polis"
            required
            value={draft.policyNo}
            onChange={(v) => set({ policyNo: v })}
            placeholder="PAR/2026/JKT/…"
            error={errors.policyNo}
            description={
              isProvisionalPolicyNo(draft.policyNo)
                ? "Nomor sementara dari Closing Instruction. Ganti dengan nomor polis dari asuransi."
                : undefined
            }
          />
          <SelectInput
            label="Tipe Polis"
            required
            items={fixedLookupItems(
              masterOptions.systemLookups.policy_type,
              POLICY_TYPE_CODES,
              draft.type
            )}
            value={draft.type}
            onValueChange={(v) => setParent({ type: v as PolicyType })}
            error={errors.type}
            description={
              draft.type !== "Endorsement"
                ? undefined
                : policy?.endorsementSeq && policy.parentPolicyId === draft.parentPolicyId
                  ? `Endorsement ke-${policy.endorsementSeq} pada polis yang di-endorse.`
                  : "Nomor urut endorsement diisi otomatis saat disimpan."
            }
          />
          {needsParent ? (
            <SearchSelect
              className="sm:col-span-2"
              label={parentPolicyLabel(draft.type)}
              // Renewal boleh diganti nomor polis sebelumnya di bawah.
              required={draft.type !== "Renewal"}
              items={parentItems}
              value={draft.parentPolicyId}
              onValueChange={fromParent}
              placeholder="Cari no. polis atau tertanggung"
              error={errors.parentPolicyId}
              description={
                draft.type === "Renewal"
                  ? "Data dan periode baru mengikuti polis sebelumnya. Belum ada di sistem? Isi nomornya di bawah."
                  : "Tertanggung, asuransi, dan share mengikuti polis ini."
              }
            />
          ) : null}
          {draft.type === "Renewal" && !draft.parentPolicyId ? (
            <TextField
              className="sm:col-span-2"
              label="No. Polis Sebelumnya"
              value={draft.previousPolicyNo ?? ""}
              onChange={(v) => setParent({ previousPolicyNo: v })}
              placeholder="PAR/2025/JKT/…"
              description="Isi bila polis sebelumnya belum ada di sistem. Data polis diisi manual."
            />
          ) : null}
          {draft.type === "Endorsement" || draft.type === "Cancellation" ? (
            <TextField
              className="sm:col-span-2"
              label="Remarks"
              multiline
              rows={3}
              value={draft.remarks ?? ""}
              onChange={(v) => set({ remarks: v })}
              // Kalimat contoh mengikuti dokumen endorsement dan pembatalan asuransi
              // yang dikirim Harry (10 November 2026).
              placeholder={
                draft.type === "Endorsement"
                  ? "Contoh: efektif per awal periode, perubahan harga pertanggungan dari Rp 223.500.000 menjadi Rp 200.000.000 dan rate TPL dari 0,75% menjadi 1,125%."
                  : "Contoh: efektif per 22 Mei 2026, polis ini dibatalkan secara prorata. Subject to no claim."
              }
              description={
                draft.type === "Endorsement"
                  ? "Uraian perubahan pada endorsement ini."
                  : "Alasan dan ketentuan pembatalan."
              }
            />
          ) : null}
        </div>

        <FieldSeparator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <fieldset disabled={slipLocked} className="contents">
            <SearchSelect
              className="sm:col-span-2"
              label="Klien"
              required
              disabled={slipLocked}
              items={clientItems}
              value={draft.clientId}
              onValueChange={(id) => {
                const client = clientOptions.find((c) => c.id === id)
                set({
                  clientId: id,
                  insuredName: client?.name ?? draft.insuredName,
                })
              }}
              placeholder="Cari nama klien"
              emptyMessage="Klien belum terdaftar. Tambahkan dulu di menu Marketing."
              error={errors.clientId}
            />
            <TextField
              className="sm:col-span-2"
              label="Nama Tertanggung"
              required
              placeholder="PT Nama Klien / Perorangan"
              value={draft.insuredName}
              onChange={(v) => set({ insuredName: v })}
              description={
                slipLocked
                  ? undefined
                  : "Disalin dari klien, boleh ditambah misalnya “and/or Subsidiary Companies”."
              }
              error={errors.insuredName}
            />
            {/* Bisa diketik untuk mencari, seperti panel security di slip. */}
            <SearchSelect
              className="sm:col-span-2"
              label="Asuransi (Leader)"
              required
              items={insurerItems}
              value={draft.insurer || null}
              onValueChange={(v) => set({ insurer: v ?? "" })}
              placeholder="Ketik atau pilih asuransi…"
              emptyMessage="Asuransi tidak ada di Master Data."
              error={errors.insurer}
            />
            {draft.insurers.length > 1 ? (
              <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs sm:col-span-2">
                <p className="mb-1 font-medium">
                  Co-insurance dari slip · total {coShare}%
                </p>
                {draft.insurers.map((r) => (
                  <p key={r.id} className="flex justify-between gap-3">
                    <span className="truncate">{r.insurer}</span>
                    <span className="tabular shrink-0">
                      {r.share}% · {r.role.replace("As ", "")}
                    </span>
                  </p>
                ))}
              </div>
            ) : null}
            <SelectInput
              label="Class of Business"
              required
              items={cobItems}
              value={draft.cob}
              onValueChange={(v) =>
                set({ cob: v as ClassOfBusiness, typeOfCover: "" })
              }
            />
            <SelectInput
              label="Type of Cover"
              items={coverItems}
              value={draft.typeOfCover ?? ""}
              onValueChange={(v) => set({ typeOfCover: v })}
            />
          </fieldset>
          <fieldset disabled={periodLocked} className="contents">
            <TextField
              label={changesParent ? "Tanggal Efektif" : "Tanggal Mulai"}
              required
              type="date"
              value={draft.inceptionDate}
              onChange={(v) => set({ inceptionDate: v })}
              error={errors.inceptionDate}
              description={
                draft.type === "Cancellation"
                  ? "Polis dibatalkan terhitung sejak tanggal ini."
                  : draft.type === "Endorsement"
                    ? "Perubahan berlaku terhitung sejak tanggal ini."
                    : undefined
              }
            />
            <TextField
              label="Tanggal Berakhir"
              required
              type="date"
              value={draft.expiryDate}
              onChange={(v) => set({ expiryDate: v })}
              error={errors.expiryDate}
            />
          </fieldset>
        </div>

        <FieldSeparator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <fieldset disabled={slipLocked} className="contents">
            <SelectInput
              label="Mata Uang"
              required
              items={currencyItems}
              value={draft.currency}
              onValueChange={(v) => set({ currency: v })}
            />
          </fieldset>
          <fieldset disabled={slipLocked && !openCoverSlip} className="contents">
            <NumberField
              label="Total Sum Insured"
              value={draft.sumInsured}
              onValueChange={(v) => set({ sumInsured: v ?? 0 })}
              error={errors.sumInsured}
              description={
                draft.type === "Endorsement" || draft.type === "Cancellation"
                  ? "Tambahan UP positif, pengurangan UP negatif."
                  : openCoverSlip
                    ? "Nilai deklarasi ini."
                    : undefined
              }
            />
            {isEndorsement ? (
              <>
                <NumberField
                  label="TSI Dasar Premi"
                  value={draft.premiumBasis ?? null}
                  onValueChange={(v) => set({ premiumBasis: v })}
                  error={errors.premiumBasis}
                  description="Kosongkan kalau sama dengan Total Sum Insured. Isi UP penuh kalau rate atau jaminan berubah tanpa mengubah UP."
                />
                <NumberField
                  label="Rate (%)"
                  preset="rate"
                  min={0}
                  max={100}
                  value={draft.rate ?? null}
                  onValueChange={(v) => set({ rate: v })}
                  error={errors.rate}
                  description="Isi untuk menghitung premi prorata. Kosongkan kalau premi diisi manual."
                />
                <NumberField
                  label="Prorata Hari"
                  preset="integer"
                  readOnly
                  value={endorsementDays}
                  onValueChange={() => {}}
                  description={`Tanggal efektif s/d tanggal berakhir, dibagi ${DAYS_PER_YEAR} hari.`}
                />
              </>
            ) : null}
            <NumberField
              label="Premium"
              required
              readOnly={prorataOn}
              value={draft.premium}
              onValueChange={(v) => set({ premium: v ?? 0 })}
              error={errors.premium}
              description={
                prorataOn
                  ? `${money(premiumBasis(draft), draft.currency)} × ${num(draft.rate ?? 0, 0, 6)}% × ${endorsementDays}/${DAYS_PER_YEAR} = ${money(draft.premium, draft.currency)}`
                  : draft.type === "Endorsement" || draft.type === "Cancellation"
                  ? "Tambahan premi positif, pengembalian premi negatif."
                  : openCoverSlip && linkedSlip
                    ? `Rate open cover: ${(linkedSlip.openCoverRates ?? [])
                        .filter((r) => r.rate != null)
                        .map((r) => `${r.label} ${openCoverRateText(r, draft.currency)}`)
                        .join(" · ")}.`
                    : money(draft.premium, draft.currency)
              }
            />
            {isEndorsement ? (
              <>
                <NumberField
                  label="Admin Cost"
                  min={0}
                  value={draft.adminCost ?? 0}
                  onValueChange={(v) => set({ adminCost: v ?? 0 })}
                  error={errors.adminCost}
                />
                <NumberField
                  label="Stamp Duty"
                  min={0}
                  value={draft.stampDuty ?? 0}
                  onValueChange={(v) => set({ stampDuty: v ?? 0 })}
                  error={errors.stampDuty}
                />
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm sm:col-span-2">
                  <p>
                    Total Premi
                    <span className="block text-xs text-muted-foreground">
                      Premi + Admin Cost + Stamp Duty
                    </span>
                  </p>
                  <span className="tabular font-semibold">
                    {money(totalPremium(draft), draft.currency)}
                  </span>
                </div>
              </>
            ) : null}
          </fieldset>
          {cancellation ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm sm:col-span-2">
              <p className="mr-auto">
                Usulan pengembalian premi prorata{" "}
                <span className="tabular font-medium">
                  {money(cancellation.premium, draft.currency)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Premi {money(cancellation.basePremium, draft.currency)} × sisa{" "}
                  {cancellation.remainingDays}/{cancellation.periodDays} hari, seperti
                  perhitungan pembatalan asuransi. Biaya pembatalan dari asuransi, kalau
                  ada, ditambahkan sendiri.
                </span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  set({
                    premium: cancellation.premium,
                    sumInsured: cancellation.sumInsured,
                  })
                }
              >
                Pakai usulan
              </Button>
            </div>
          ) : null}
          <fieldset disabled={slipLocked} className="contents">
            <NumberField
              label="Brokerage (%)"
              preset="percent"
              value={draft.brokeragePct}
              onValueChange={(v) => set({ brokeragePct: v ?? 0 })}
              error={errors.brokeragePct}
              description={
                brokerageCap != null && draft.brokeragePct > brokerageCap
                  ? `Melebihi batas biaya akuisisi OJK ${brokerageCap}% untuk ${draft.cob}.`
                  : undefined
              }
            />
            <NumberField
              label="Additional Fee"
              value={draft.additionalFee ?? 0}
              onValueChange={(v) => set({ additionalFee: v ?? 0 })}
              error={errors.additionalFee}
              description={
                draft.type === "Endorsement" || draft.type === "Cancellation"
                  ? "Tambahan fee positif, pengembalian fee negatif."
                  : draft.additionalFee
                    ? money(draft.additionalFee, draft.currency)
                    : "Opsional, fee di luar brokerage."
              }
            />
            <TextField
              className="sm:col-span-2"
              label="Risk Location"
              multiline
              rows={2}
              placeholder="Alamat objek / lokasi pertanggungan"
              value={draft.riskLocation}
              onChange={(v) => set({ riskLocation: v })}
            />
          </fieldset>
        </div>

        {participantChangesOn && rosterOwner ? (
          <>
            <FieldSeparator />
            <EndorsementParticipants
              parent={rosterOwner}
              effectiveDate={draft.inceptionDate}
              currency={draft.currency}
              added={addedParticipants}
              removedIds={removedParticipantIds}
              onAddedChange={setAddedParticipants}
              onRemovedChange={setRemovedParticipantIds}
              onApply={(v) => set(v)}
            />
          </>
        ) : null}

        <FieldSeparator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectInput
            label="Klasifikasi OJK"
            items={ojkClassItems}
            value={draft.cobOjkClassId}
            onValueChange={(v) => set({ cobOjkClassId: v || null })}
            placeholder={ojkClassItems.length ? "Pilih klasifikasi" : "Belum ada data"}
            description={
              ojkClassItems.length
                ? "Untuk laporan produksi OJK, terpisah dari COB internal."
                : "Isi daftarnya di Master Data, tab Klasifikasi OJK."
            }
          />
          <SelectInput
            label="Lokasi Penempatan"
            items={placementItems}
            value={draft.placementLocationId}
            onValueChange={(v) => set({ placementLocationId: v || null })}
          />
          <TextField
            className="sm:col-span-2"
            label="Grouping Insured"
            placeholder="Contoh: Grup Sinar Mas"
            value={draft.groupingInsured ?? ""}
            onChange={(v) => set({ groupingInsured: v })}
            description="Pengelompokan klien untuk laporan produksi."
          />
          <TextField
            label="Tanggal Premi Dibayar"
            type="date"
            value={draft.premiumPaidDate ?? ""}
            onChange={(v) => set({ premiumPaidDate: v || null })}
            description="Kosongkan kalau premi belum dibayar. Tampil sebagai info saat klaim dicatat."
          />
        </div>

        <FieldSeparator />

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">Berkas Polis</p>
            <p className="text-xs text-muted-foreground">
              {POLICY_FILE_HINT} File baru disimpan sebagai versi berikutnya.
              {draft.placingSlipId
                ? null
                : " Slip diisi dokumen slip kalau slipnya dibuat di luar sistem."}
            </p>
          </div>
          {policyFileKindsFor({
            placingSlipId: draft.placingSlipId,
            files: policy?.files,
          }).map(({ kind, label }) => {
            const picked = pickedFiles[kind]
            const latest = policy ? latestPolicyFile(policy.files, kind) : undefined
            return (
              <div
                key={kind}
                className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3"
              >
                <p className="text-sm sm:pt-1.5">{label}</p>
                <div className="flex min-w-0 flex-col gap-1">
                  <label className="flex w-fit max-w-full cursor-pointer items-center gap-2 rounded-lg has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30">
                    <input
                      type="file"
                      accept={UPLOAD_ACCEPT}
                      className="sr-only"
                      aria-label={`Pilih file ${label}`}
                      onChange={(e) => {
                        const next = e.target.files?.[0] ?? null
                        const problem = next
                          ? uploadProblem(next, MAX_POLICY_FILE_BYTES)
                          : null
                        if (problem) {
                          toast.error(problem, { description: next?.name })
                          e.target.value = ""
                          return
                        }
                        setPickedFiles((f) => ({ ...f, [kind]: next ?? undefined }))
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      render={<span />}
                      nativeButton={false}
                    >
                      <FileUp data-icon="inline-start" />
                      {picked ? "Ganti file" : "Pilih file"}
                    </Button>
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {picked ? picked.name : "Belum ada file dipilih"}
                    </span>
                  </label>
                  {latest ? (
                    <p className="truncate text-xs text-muted-foreground">
                      Tersimpan v{latest.version} · {latest.fileName} ·{" "}
                      {dateShort(latest.uploadedAt)}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </FieldGroup>
    </FormDrawer>
  )
}
