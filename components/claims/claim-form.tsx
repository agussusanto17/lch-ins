"use client"

import * as React from "react"
import { toast } from "sonner"
import * as z from "zod"

import {
  createClaimAction,
  updateClaimAction,
} from "@/app/(app)/claims/actions"
import { FormDrawer } from "@/components/shared/form-drawer"
import {
  NumberField,
  SearchSelect,
  SelectInput,
  TextField,
} from "@/components/shared/form-fields"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"
import {
  CLAIM_STAGES,
  CLAIM_STATUSES,
  type Claim,
  type ClaimStage,
  type ClaimStatus,
} from "@/lib/data"
import type { ClaimFormOptions, ClaimInput, ClaimRecord } from "@/lib/server/claims"
import { store } from "@/lib/store"
import { requiredText, validate, type FieldErrors } from "@/lib/validation"

type Draft = Omit<Claim, "id" | "claimNo"> & {
  id: string | null
  claimNo: string
}

const EMPTY: Draft = {
  id: null,
  claimNo: "",
  policyId: null,
  policyNo: "",
  insuredName: "",
  insurer: "",
  cob: "Property",
  currency: "IDR",
  lossDate: "",
  reportedDate: null,
  documentCompleteDate: null,
  spkDate: null,
  location: "",
  lossDescription: "",
  assetDescription: "",
  estimatedLoss: 0,
  claimedAmount: 0,
  paidAmount: 0,
  adjuster: "",
  status: "Outstanding",
  stage: "Tunggu Dokumen",
  notes: "",
}

const dateOrEmpty = z.string().nullable()

const schema = z
  .object({
    policyId: z
      .string({ error: "Polis wajib dipilih" })
      .min(1, "Polis wajib dipilih"),
    lossDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal kejadian wajib diisi"),
    reportedDate: dateOrEmpty,
    documentCompleteDate: dateOrEmpty,
    spkDate: dateOrEmpty,
    lossDescription: requiredText("Deskripsi kerugian"),
    estimatedLoss: z.number().nonnegative("Tidak boleh negatif"),
    claimedAmount: z.number().nonnegative("Tidak boleh negatif"),
    paidAmount: z.number().nonnegative("Tidak boleh negatif"),
  })
  .refine(
    (d) => !d.reportedDate || d.reportedDate >= d.lossDate,
    {
      message: "Tanggal lapor tidak boleh mendahului tanggal kejadian",
      path: ["reportedDate"],
    }
  )
  .refine(
    (d) =>
      !d.documentCompleteDate ||
      !d.reportedDate ||
      d.documentCompleteDate >= d.reportedDate,
    {
      message: "Dokumen lengkap tidak boleh mendahului tanggal lapor",
      path: ["documentCompleteDate"],
    }
  )
  .refine(
    (d) =>
      !d.spkDate ||
      !d.documentCompleteDate ||
      d.spkDate >= d.documentCompleteDate,
    {
      message: "SPK/SPGR tidak boleh mendahului dokumen lengkap",
      path: ["spkDate"],
    }
  )

export interface ClaimFormProps {
  claim?: Claim | ClaimRecord | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  formOptions: ClaimFormOptions
  onSaved?: (savedClaim: ClaimRecord) => void
}

export function ClaimForm({
  claim,
  open,
  onOpenChange,
  formOptions,
  onSaved,
}: ClaimFormProps) {
  const [draft, setDraft] = React.useState<Draft>(() =>
    claim ? { ...claim, id: claim.id } : { ...EMPTY }
  )
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const policies = formOptions.policies
  const policy = policies.find((p) => p.id === draft.policyId) ?? null
  const policyItems = policies.map((p) => ({
    label: `${p.policyNo} — ${p.insuredName}`,
    value: p.id,
  }))

  const adjusterOptions = formOptions.adjusters.map((a) => a.name)
  const adjusterItems =
    draft.adjuster && !adjusterOptions.includes(draft.adjuster)
      ? [draft.adjuster, ...adjusterOptions]
      : adjusterOptions

  function pickPolicy(id: string | null) {
    const p = policies.find((x) => x.id === id)
    set(
      p
        ? {
            policyId: p.id,
            policyNo: p.policyNo,
            insuredName: p.insuredName,
            insurer: p.insurer,
            cob: p.cob,
            currency: p.currency,
            location: draft.location || "",
          }
        : { policyId: null, policyNo: "", insuredName: "", insurer: "" }
    )
  }

  async function submit() {
    const result = validate(schema, draft)
    setErrors(result.errors)
    if (!result.ok) return false

    const matchedAdjuster = formOptions.adjusters.find(
      (a) => a.name.toLowerCase() === draft.adjuster?.toLowerCase()
    )

    const payload: ClaimInput = {
      policyId: draft.policyId!,
      claimNo: draft.claimNo || undefined,
      adjusterId: matchedAdjuster?.id ?? null,
      adjuster: draft.adjuster || undefined,
      lossDate: draft.lossDate,
      reportedDate: draft.reportedDate || null,
      documentCompleteDate: draft.documentCompleteDate || null,
      spkDate: draft.spkDate || null,
      location: draft.location || "",
      lossDescription: draft.lossDescription || "",
      assetDescription: draft.assetDescription || "",
      currencyCode: draft.currency || "IDR",
      estimatedLoss: draft.estimatedLoss || 0,
      claimedAmount: draft.claimedAmount || 0,
      paidAmount: draft.paidAmount || 0,
      status: draft.status,
      stage: draft.stage,
      notes: draft.notes || "",
    }

    if (draft.id) {
      const res = await updateClaimAction(draft.id, payload)
      if (!res.ok || !res.data) {
        toast.error(res.error ?? "Gagal memperbarui data klaim")
        return false
      }
      store.upsert("claims", res.data)
      onSaved?.(res.data)
      toast.success("Klaim berhasil diperbarui", {
        description: `${res.data.claimNo} · ${res.data.insuredName}`,
      })
    } else {
      const res = await createClaimAction(payload)
      if (!res.ok || !res.data) {
        toast.error(res.error ?? "Gagal mencatat klaim")
        return false
      }
      store.upsert("claims", res.data)
      onSaved?.(res.data)
      toast.success("Klaim berhasil dicatat", {
        description: `${res.data.claimNo} · ${res.data.insuredName}`,
      })
    }

    onOpenChange?.(false)
    return true
  }

  return (
    <FormDrawer
      title={draft.id ? "Edit Klaim" : "Catat Klaim Baru"}
      description="Pencatatan awal kerugian, status penanganan, dan tahapan dokumen klaim."
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={submit}
      submitLabel={draft.id ? "Simpan Perubahan" : "Simpan Klaim"}
    >
      <div className="flex flex-col gap-6">
        <FieldGroup title="Informasi Polis & Tertanggung">
          <TextField
            label="Nomor Klaim"
            value={draft.claimNo}
            onChange={(v) => set({ claimNo: v })}
            placeholder="Otomatis dibuat sistem jika kosong"
            error={errors.claimNo}
            readOnly={!!draft.id}
          />
          <SearchSelect
            label="Polis Asuransi"
            value={draft.policyId}
            onValueChange={pickPolicy}
            items={policyItems}
            placeholder="Pilih nomor polis..."
            error={errors.policyId}
            required
            disabled={!!draft.id}
          />
          {policy ? (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-xs sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Tertanggung</span>
                <p className="font-medium text-foreground">{policy.insuredName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Leader</span>
                <p className="font-medium text-foreground">{policy.insurer}</p>
              </div>
              <div>
                <span className="text-muted-foreground">COB</span>
                <p className="font-medium text-foreground">{policy.cob}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mata Uang</span>
                <p className="font-medium text-foreground">{policy.currency}</p>
              </div>
            </div>
          ) : null}
        </FieldGroup>

        <FieldSeparator />

        <FieldGroup title="Rincian Kerugian">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Tanggal Kejadian"
              type="date"
              value={draft.lossDate}
              onChange={(v) => set({ lossDate: v })}
              placeholder="YYYY-MM-DD"
              error={errors.lossDate}
              required
            />
            <TextField
              label="Tanggal Dilaporkan"
              type="date"
              value={draft.reportedDate ?? ""}
              onChange={(v) => set({ reportedDate: v || null })}
              placeholder="YYYY-MM-DD"
              error={errors.reportedDate}
            />
          </div>

          <TextField
            label="Lokasi Kejadian"
            value={draft.location}
            onChange={(v) => set({ location: v })}
            placeholder="Lokasi terjadinya kerugian"
            error={errors.location}
          />

          <TextField
            label="Deskripsi Kejadian / Kronologi"
            value={draft.lossDescription}
            onChange={(v) => set({ lossDescription: v })}
            placeholder="Jelaskan kronologi dan penyebab kerugian..."
            multiline
            rows={3}
            error={errors.lossDescription}
            required
          />

          <TextField
            label="Objek / Aset Terdampak"
            value={draft.assetDescription}
            onChange={(v) => set({ assetDescription: v })}
            placeholder="Rincian aset yang terdampak kerugian..."
            error={errors.assetDescription}
          />
        </FieldGroup>

        <FieldSeparator />

        <FieldGroup title="Nilai Kerugian & Klaim">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberField
              label={`Estimasi Kerugian (${draft.currency})`}
              value={draft.estimatedLoss}
              onValueChange={(v) => set({ estimatedLoss: v ?? 0 })}
              placeholder="0"
              error={errors.estimatedLoss}
            />
            <NumberField
              label={`Nilai Diajukan (${draft.currency})`}
              value={draft.claimedAmount}
              onValueChange={(v) => set({ claimedAmount: v ?? 0 })}
              placeholder="0"
              error={errors.claimedAmount}
            />
            <NumberField
              label={`Nilai Disetujui/Dibayar (${draft.currency})`}
              value={draft.paidAmount}
              onValueChange={(v) => set({ paidAmount: v ?? 0 })}
              placeholder="0"
              error={errors.paidAmount}
            />
          </div>
        </FieldGroup>

        <FieldSeparator />

        <FieldGroup title="Status & Penanganan Dokumen">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectInput
              label="Status Klaim"
              value={draft.status}
              onValueChange={(v) => set({ status: v as ClaimStatus })}
              items={CLAIM_STATUSES}
              placeholder="Pilih status klaim..."
              error={errors.status}
            />
            <SelectInput
              label="Tahapan Dokumen"
              value={draft.stage}
              onValueChange={(v) => set({ stage: v as ClaimStage })}
              items={CLAIM_STAGES}
              placeholder="Pilih tahapan dokumen..."
              error={errors.stage}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectInput
              label="Adjuster yang Ditunjuk"
              value={draft.adjuster}
              onValueChange={(v) => set({ adjuster: v })}
              items={adjusterItems}
              placeholder="Pilih adjuster..."
              error={errors.adjuster}
            />
            <TextField
              label="Tanggal Dokumen Lengkap"
              type="date"
              value={draft.documentCompleteDate ?? ""}
              onChange={(v) => set({ documentCompleteDate: v || null })}
              placeholder="YYYY-MM-DD"
              error={errors.documentCompleteDate}
            />
          </div>

          <TextField
            label="Tanggal Terbit SPK / SPGR"
            type="date"
            value={draft.spkDate ?? ""}
            onChange={(v) => set({ spkDate: v || null })}
            placeholder="YYYY-MM-DD"
            error={errors.spkDate}
          />

          <TextField
            label="Catatan Tambahan"
            value={draft.notes ?? ""}
            onChange={(v) => set({ notes: v })}
            placeholder="Catatan tambahan penanganan klaim..."
            multiline
            rows={2}
            error={errors.notes}
          />
        </FieldGroup>
      </div>
    </FormDrawer>
  )
}
