"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import * as z from "zod"

import { FormDrawer } from "@/components/shared/form-drawer"
import {
  NumberField,
  SearchSelect,
  SelectInput,
  TextField,
} from "@/components/shared/form-fields"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"
import {
  ADJUSTERS,
  CLAIM_STAGES,
  CLAIM_STATUSES,
  type Claim,
  type ClaimStage,
  type ClaimStatus,
} from "@/lib/data"
import { todayIso, yearMonth } from "@/lib/date"
import { dateShort } from "@/lib/format"
import { newId, store, useCollection } from "@/lib/store"
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
    status: z.enum(CLAIM_STATUSES as [ClaimStatus, ...ClaimStatus[]]),
    stage: z.enum(CLAIM_STAGES as [ClaimStage, ...ClaimStage[]]),
  })
  .superRefine((d, ctx) => {
    // Urutan tanggal mengikuti alur klaim: kejadian, lapor, dokumen, SPK.
    const order: [keyof typeof d, string][] = [
      ["reportedDate", "Tanggal dilaporkan"],
      ["documentCompleteDate", "Tanggal dokumen lengkap"],
      ["spkDate", "Tanggal SPK/SPGR"],
    ]
    let previous = d.lossDate
    for (const [key, label] of order) {
      const value = d[key] as string | null
      if (!value) continue
      if (previous && value < previous) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${label} tidak boleh sebelum tahap sebelumnya`,
        })
      }
      previous = value
    }
    if (d.stage === "SPK / SPGR terbit" && !d.spkDate) {
      ctx.addIssue({
        code: "custom",
        path: ["spkDate"],
        message: "Isi tanggal SPK/SPGR untuk tahapan ini",
      })
    }
    if (d.status === "Settled" && d.paidAmount <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["paidAmount"],
        message: "Status Settled butuh jumlah yang dibayar",
      })
    }
  })

/**
 * Nomor klaim berikutnya, contoh CLM/2026/09/0034. Nomor urut berlanjut
 * seperti data klaim yang ada; periode reset menunggu keputusan LCH dan nanti
 * diambil dari master jenis dokumen di server.
 */
function nextClaimNo(claims: Claim[], today: string) {
  const { year, month } = yearMonth(today)
  const last = claims.reduce((max, c) => {
    const n = Number(c.claimNo.split("/").pop())
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `CLM/${year}/${String(month).padStart(2, "0")}/${String(last + 1).padStart(4, "0")}`
}

export function ClaimForm({
  open,
  onOpenChange,
  claim,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  claim?: Claim | null
}) {
  const policies = useCollection("policies")
  const claims = useCollection("claims")
  const [draft, setDraft] = React.useState<Draft>(() =>
    claim ? { ...claim } : { ...EMPTY }
  )
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const policy = policies.find((p) => p.id === draft.policyId) ?? null
  const policyItems = policies.map((p) => ({
    label: `${p.policyNo} — ${p.insuredName}`,
    value: p.id,
  }))
  const outsidePeriod =
    policy &&
    draft.lossDate &&
    (draft.lossDate < policy.inceptionDate ||
      draft.lossDate > policy.expiryDate)

  function pickPolicy(id: string | null) {
    const p = policies.find((x) => x.id === id)
    // Asuransi dan COB klaim diambil dari polis, tidak dipilih ulang (ERD).
    set(
      p
        ? {
            policyId: p.id,
            policyNo: p.policyNo,
            insuredName: p.insuredName,
            insurer: p.insurer,
            cob: p.cob,
            currency: p.currency,
            location: draft.location || p.riskLocation,
          }
        : { policyId: null, policyNo: "", insuredName: "", insurer: "" }
    )
  }

  function submit() {
    const result = validate(schema, draft)
    setErrors(result.errors)
    if (!result.ok) return false
    const record: Claim = {
      ...draft,
      id: draft.id ?? newId("k"),
      claimNo: draft.claimNo || nextClaimNo(claims, todayIso()),
      reportedDate: draft.reportedDate || null,
      documentCompleteDate: draft.documentCompleteDate || null,
      spkDate: draft.spkDate || null,
    }
    store.upsert("claims", record)
    toast.success(draft.id ? "Klaim diperbarui" : "Klaim tercatat", {
      description: `${record.claimNo} · ${record.insuredName}`,
    })
    onOpenChange(false)
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={claim ? `Edit Klaim ${claim.claimNo}` : "Input Klaim Baru"}
      description="Klaim dicatat dari polis. Tertanggung, asuransi, COB, dan mata uang mengikuti polis."
      onSubmit={submit}
    >
      <FieldGroup>
        <SearchSelect
          label="Polis"
          required
          items={policyItems}
          value={draft.policyId}
          onValueChange={pickPolicy}
          placeholder="Cari no. polis atau tertanggung"
          emptyMessage="Polis tidak ditemukan. Tambahkan dulu di Policy Database."
          error={errors.policyId}
        />

        {policy ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg bg-muted/60 px-4 py-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Tertanggung</dt>
              <dd className="font-medium">{policy.insuredName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Asuransi</dt>
              <dd className="font-medium">{policy.insurer}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">COB · Mata uang</dt>
              <dd className="font-medium">
                {policy.cob} · {policy.currency}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Periode polis</dt>
              <dd className="tabular font-medium">
                {dateShort(policy.inceptionDate)} s/d{" "}
                {dateShort(policy.expiryDate)}
              </dd>
            </div>
          </dl>
        ) : null}

        <TextField
          label="No. Klaim"
          value={draft.claimNo}
          onChange={() => {}}
          readOnly
          placeholder="Terisi otomatis saat disimpan"
          description="Nomor dibuat sistem supaya tidak dobel."
        />

        <FieldSeparator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Tanggal Kejadian"
            required
            type="date"
            value={draft.lossDate}
            onChange={(v) => set({ lossDate: v })}
            error={errors.lossDate}
          />
          <TextField
            label="Tanggal Dilaporkan"
            type="date"
            value={draft.reportedDate ?? ""}
            onChange={(v) => set({ reportedDate: v || null })}
            error={errors.reportedDate}
          />
          <TextField
            label="Tgl. Dokumen Lengkap"
            type="date"
            value={draft.documentCompleteDate ?? ""}
            onChange={(v) => set({ documentCompleteDate: v || null })}
            error={errors.documentCompleteDate}
          />
          <TextField
            label="Tanggal SPK / SPGR"
            type="date"
            value={draft.spkDate ?? ""}
            onChange={(v) => set({ spkDate: v || null })}
            error={errors.spkDate}
          />
        </div>
        {outsidePeriod ? (
          <p className="-mt-3 flex items-start gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            Tanggal kejadian di luar periode polis. Klaim tetap bisa dicatat,
            tapi kemungkinan ditolak asuransi.
          </p>
        ) : null}

        <FieldSeparator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            label={`Estimasi Kerugian (${draft.currency})`}
            value={draft.estimatedLoss}
            onValueChange={(v) => set({ estimatedLoss: v ?? 0 })}
            error={errors.estimatedLoss}
          />
          <NumberField
            label={`Jumlah Klaim (${draft.currency})`}
            value={draft.claimedAmount}
            onValueChange={(v) => set({ claimedAmount: v ?? 0 })}
            error={errors.claimedAmount}
          />
          <NumberField
            label={`Jumlah Dibayar (${draft.currency})`}
            value={draft.paidAmount}
            onValueChange={(v) => set({ paidAmount: v ?? 0 })}
            error={errors.paidAmount}
            description={
              draft.claimedAmount > 0 && draft.paidAmount > draft.claimedAmount
                ? "Lebih besar dari jumlah klaim yang diajukan."
                : undefined
            }
          />
          <SelectInput
            label="Adjuster"
            items={ADJUSTERS}
            value={draft.adjuster}
            onValueChange={(v) => set({ adjuster: v })}
            placeholder="Belum ditunjuk"
          />
          <SelectInput
            label="Status"
            required
            items={CLAIM_STATUSES}
            value={draft.status}
            onValueChange={(v) => set({ status: v as ClaimStatus })}
            error={errors.status}
          />
          <SelectInput
            label="Tahapan Dokumen"
            required
            items={CLAIM_STAGES}
            value={draft.stage}
            onValueChange={(v) => set({ stage: v as ClaimStage })}
            error={errors.stage}
          />
        </div>

        <FieldSeparator />

        <TextField
          label="Lokasi Kejadian"
          value={draft.location}
          onChange={(v) => set({ location: v })}
          placeholder="Alamat lokasi kejadian"
        />
        <TextField
          label="Deskripsi Aset"
          value={draft.assetDescription}
          onChange={(v) => set({ assetDescription: v })}
          placeholder="Aset yang mengalami kerugian"
        />
        <TextField
          label="Deskripsi Kerugian"
          required
          multiline
          value={draft.lossDescription}
          onChange={(v) => set({ lossDescription: v })}
          placeholder="Kronologi dan uraian kerugian"
          error={errors.lossDescription}
        />
        <TextField
          label="Catatan"
          multiline
          rows={2}
          value={draft.notes ?? ""}
          onChange={(v) => set({ notes: v })}
          placeholder="Catatan internal"
        />
      </FieldGroup>
    </FormDrawer>
  )
}
