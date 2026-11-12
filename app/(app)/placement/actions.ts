"use server"

import { revalidatePath } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { z } from "zod"

import type { SlipStatus } from "@/lib/generated/prisma/client"
import {
  MAX_DEDUCTIBLES,
  type PlacingSlip,
  type SlipAttachment,
  type SlipKind,
} from "@/lib/data/types"
import { participantListSchema } from "@/lib/participant-schema"
import { brokerageLimitIssue, rateUnitFor } from "@/lib/calc"
import { derivedDocNumber, rateLineName } from "@/components/underwriting/slip-model"
import {
  coverUsesOjkTariff,
  copySlipInput,
  createEndorsementSlip,
  createPlacingSlip,
  deletePlacingSlip,
  getPlacingSlipById,
  releasePlacingSlip,
  togglePlacingSlipStatus,
  updatePlacingSlip,
  type PlacingSlipInput,
  type PlacingSlipRecord,
} from "@/lib/server/placing-slips"
import { validatePlacingSlipForRelease } from "@/lib/server/tariffs"
import {
  recordEndorsementFromSlip,
  recordPoliciesFromClosing,
  syncPoliciesFromSlipRevision,
} from "@/lib/server/auto-policies"
import { prisma } from "@/lib/prisma"
import { requireManage } from "@/lib/server/session"
import {
  ATTACHMENT_LIMITS,
  deleteSlipAttachment,
  setSlipAttachmentPrint,
  uploadSlipAttachment,
} from "@/lib/server/slip-files"
import { previewDocumentNumber } from "@/server/services/number-generator"

export interface ActionResponse<T = void> {
  ok: boolean
  data?: T
  error?: string
  /** Info tambahan untuk pengguna, misalnya polis yang tercatat otomatis. */
  notice?: string
}

/**
 * Polis otomatis saat Closing Instruction terbit (meeting LCH, 10 November
 * 2026). Gagal mencatat polis tidak membatalkan CI yang sudah tersimpan;
 * alasannya dikembalikan sebagai info supaya polis bisa dicatat manual.
 */
async function autoPolicyNotice(slipId: string, userId: string) {
  try {
    const { created, skipped } = await recordPoliciesFromClosing(slipId, userId)
    if (created.length) {
      revalidatePath("/policies")
      return `Polis tercatat di Policy Database dengan nomor sementara ${created.join(", ")}. Ganti nomornya dan unggah polis dari asuransi di sana.`
    }
    return skipped ?? undefined
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "kesalahan tidak dikenal"
    return `Polis belum tercatat otomatis: ${message} Catat manual di Policy Database.`
  }
}

const isPlacingSlip = (slip: Pick<PlacingSlip, "kind">) => !slip.kind || slip.kind === "Placing"

/**
 * Endorsement atau cancellation slip yang Closed tercatat di Policy Database
 * (Harry, 11 November 2026). Gagal mencatat tidak membatalkan slip; alasannya
 * dikembalikan sebagai info.
 */
async function endorsementNotice(slipId: string, userId: string) {
  try {
    const { created, skipped } = await recordEndorsementFromSlip(slipId, userId)
    if (created.length) {
      revalidatePath("/policies")
      return `Tercatat di Policy Database sebagai ${created.join(", ")}. Ganti nomornya dengan nomor endorsement dari asuransi saat mengunggahnya.`
    }
    return skipped ?? undefined
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "kesalahan tidak dikenal"
    return `Endorsement belum tercatat di Policy Database: ${message}`
  }
}

/** Slip yang baru Closed: placing slip mencatat polis, endorsement slip mencatat endorsement. */
function closedNotice(slip: PlacingSlipRecord, userId: string) {
  return isPlacingSlip(slip) ? autoPolicyNotice(slip.id, userId) : endorsementNotice(slip.id, userId)
}

/**
 * Buat endorsement atau cancellation slip dari slip polis yang sudah Closed
 * (Harry, 11 November 2026).
 */
export async function createEndorsementSlipAction(
  baseSlipId: string,
  kind: "Endorsement" | "Cancellation"
): Promise<ActionResponse<PlacingSlipRecord>> {
  try {
    const user = await requireManage("/placement")
    if (!z.uuid().safeParse(baseSlipId).success) {
      return { ok: false, error: "Slip asal tidak valid." }
    }
    if (kind !== "Endorsement" && kind !== "Cancellation") {
      return { ok: false, error: "Jenis slip tidak valid." }
    }
    const created = await createEndorsementSlip(baseSlipId, kind, user.id)
    revalidateUnderwritingPaths(created.id)
    return { ok: true, data: created }
  } catch (err) {
    unstable_rethrow(err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal membuat endorsement slip.",
    }
  }
}

/**
 * Revisi slip setelah CI terbit diteruskan ke polis bernomor sementara. Gagal
 * meneruskan tidak membatalkan revisi yang sudah tersimpan; alasannya
 * dikembalikan sebagai info supaya polis bisa diperbarui manual.
 */
async function revisionPolicyNotice(before: PlacingSlipRecord, userId: string) {
  try {
    const updated = await syncPoliciesFromSlipRevision(before, userId)
    if (!updated.length) return undefined
    revalidatePath("/policies")
    return `Polis ${updated.join(", ")} ikut diperbarui dari revisi slip.`
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "kesalahan tidak dikenal"
    return `Polis belum ikut diperbarui: ${message} Perbarui manual di Policy Database.`
  }
}

/**
 * Catat polis dari Closing Instruction yang sudah terbit, lewat tombol di
 * dokumen CI. Untuk slip yang Closed sebelum pencatatan otomatis ada, atau
 * yang pencatatan otomatisnya gagal; alasan gagal dikembalikan apa adanya
 * supaya terlihat di halaman. Bagian yang sudah punya polis tidak dibuat lagi.
 */
export async function recordPoliciesFromClosingAction(
  slipId: string
): Promise<ActionResponse<{ created: string[] }>> {
  try {
    const user = await requireManage("/policies")
    if (!z.uuid().safeParse(slipId).success) {
      return { ok: false, error: "Placing slip tidak valid." }
    }
    const { created, skipped } = await recordPoliciesFromClosing(slipId, user.id)
    if (created.length) {
      revalidatePath("/policies")
      revalidatePath(`/placement/closing/${slipId}`)
      return { ok: true, data: { created } }
    }
    return { ok: false, error: skipped ?? "Polis untuk Closing Instruction ini sudah tercatat." }
  } catch (err) {
    unstable_rethrow(err)
    return { ok: false, error: err instanceof Error ? err.message : "Gagal mencatat polis." }
  }
}

/** Tanggal dokumen "YYYY-MM-DD"; string kosong berarti dikosongkan. */
const documentDateSchema = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal dokumen tidak valid."),
    z.literal(""),
  ])
  .nullish()
  .transform((value) => (value === "" ? null : value))

export interface ClausePickerItem {
  id: string
  title: string
  wording: string
  sourceGroup: string
  cobName: string | null
  coverTypeName: string | null
  /** Masuk paket klausul bawaan, dengan kelompok dan urutannya. */
  inPackage?: boolean
  packageGroup?: string | null
  packageOrder?: number
}

const lineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.coerce.number().optional(),
  limitOnly: z.boolean().optional(),
  section: z.union([z.literal(1), z.literal(2)]).optional(),
  vehicleBrandId: z.string().nullish(),
  vehicleTypeId: z.string().nullish(),
  vehicleBrandName: z.string().nullish(),
  vehicleTypeName: z.string().nullish(),
  licensePlate: z.string().nullish(),
  chassisNumber: z.string().nullish(),
  engineNumber: z.string().nullish(),
  year: z.union([z.number(), z.string()]).nullish(),
  color: z.string().nullish(),
  vehicleModel: z.string().nullish(),
  locationId: z.string().nullish(),
})

const rateLineSchema = z
  .object({
    id: z.string(),
    label: z.string().max(200, "Nama cover maksimal 200 karakter."),
    rate: z.coerce.number().nullable().optional(),
    premium: z.coerce.number(),
    flatPremium: z.boolean().optional(),
    basis: z.string().optional(),
    min: z.coerce.number().nullable().optional(),
    max: z.coerce.number().nullable().optional(),
    lossLimitPct: z.coerce
      .number()
      .gt(0, "Persentase loss limit harus lebih dari 0%.")
      .max(100, "Persentase loss limit maksimal 100%.")
      .nullable()
      .optional(),
    deductibles: z
      .array(z.string().max(500, "Teks deductible maksimal 500 karakter."))
      .max(MAX_DEDUCTIBLES, `Deductible per cover maksimal ${MAX_DEDUCTIBLES}.`)
      .optional(),
    // Forms opened before the 4 Nov 2026 deploy still send a single string;
    // without this it would be stripped and the deductible silently lost.
    deductible: z.string().max(500).optional(),
    locationId: z.string().nullish(),
    vehicleId: z.string().nullish(),
  })
  .transform(({ deductible, ...line }) => ({
    ...line,
    deductibles: line.deductibles ?? (deductible ? [deductible] : undefined),
  }))

const slipLocationSchema = z.object({
  id: z.string(),
  riskLocation: z.string().max(2000, "Alamat lokasi maksimal 2000 karakter"),
  occupation: z.string().nullish(),
  occupationLabel: z
    .string()
    .max(500, "Nama okupasi di slip maksimal 500 karakter")
    .nullish(),
  constructionClass: z.string().nullish(),
})

const securityPanelRowSchema = z.object({
  id: z.string(),
  insurer: z.string(),
  share: z.coerce.number(),
  role: z.enum(["As Leader", "As Member"]),
})

const placingSlipSchema = z.object({
  clientId: z.string().trim().min(1, "Klien wajib dipilih."),
  sppaId: z.string().nullish(),
  cob: z.string().trim().min(1, "Class of Business wajib dipilih."),
  typeOfCover: z.string().nullish(),
  typeOfCover2: z.string().nullish(),
  typeOfCoverLabel: z
    .string()
    .max(1000, "Nama type of cover di dokumen maksimal 1000 karakter")
    .nullish(),
  typeOfCover2Label: z
    .string()
    .max(1000, "Nama type of cover di dokumen maksimal 1000 karakter")
    .nullish(),
  coverCode: z.string().nullish(),
  insuredName: z.string().trim().min(1, "Nama tertanggung wajib diisi."),
  correspondenceAddress: z.string().nullish(),
  currency: z.string().default("IDR"),
  status: z.enum(["Draft", "Released", "Quoted", "Closed", "Cancelled"]).optional(),
  periodTba: z.boolean().optional(),
  inceptionDate: z.string().nullish(),
  expiryDate: z.string().nullish(),
  releaseDate: documentDateSchema,
  quotedDate: documentDateSchema,
  closingDate: documentDateSchema,
  periodNote: z
    .string()
    .max(500, "Keterangan periode maksimal 500 karakter")
    .nullish(),
  periodLabel: z
    .string()
    .max(200, "Label periode maksimal 200 karakter")
    .nullish(),
  periodEndText: z
    .string()
    .max(200, "Teks akhir periode maksimal 200 karakter")
    .nullish(),
  periodText: z
    .string()
    .max(1000, "Teks periode maksimal 1000 karakter")
    .nullish(),
  insuredDescription: z
    .string()
    .max(2000, "Uraian tertanggung maksimal 2000 karakter")
    .nullish(),
  usesSections: z.boolean().optional(),
  openCover: z.boolean().optional(),
  openCoverRates: z
    .array(
      z.object({
        id: z.string().max(80),
        label: z.string().max(200, "Kategori rate open cover maksimal 200 karakter"),
        basis: z.enum(["percent", "per_unit"]),
        rate: z.number().min(0, "Rate open cover tidak boleh negatif").nullable(),
        unit: z.string().max(50).optional(),
      })
    )
    .max(30, "Rate open cover maksimal 30 baris")
    .optional(),
  detailRows: z
    .array(
      z.object({
        label: z.string().max(100, "Label detail tambahan maksimal 100 karakter"),
        value: z.string().max(2000, "Isi detail tambahan maksimal 2000 karakter"),
      })
    )
    .max(40, "Detail tambahan maksimal 40 baris")
    .nullish(),
  occupation: z.string().nullish(),
  occupationId: z.string().nullish(),
  occupationLabel: z.string().max(500, "Nama okupasi di slip maksimal 500 karakter").nullish(),
  riskLocation: z.string().nullish(),
  locations: z
    .array(slipLocationSchema)
    .max(500, "Lokasi slip maksimal 500.")
    .optional(),
  coverage: z.string().nullish(),
  constructionClass: z.string().nullish(),
  indemnityPeriod: z.string().nullish(),
  interestSection1: z.string().nullish(),
  interestSection2: z.string().nullish(),
  specialConditions: z.string().nullish(),
  deductibleIntro: z.string().max(500, "Kalimat pengantar deductible maksimal 500 karakter").nullish(),
  exclusions: z.string().max(4000, "Exclusions maksimal 4000 karakter").nullish(),
  interestItems: z.array(lineItemSchema).optional(),
  sumInsuredSection1: z.array(lineItemSchema).optional(),
  sumInsuredSection2: z.array(lineItemSchema).optional(),
  clauseIds: z.array(z.string()).optional(),
  clauseOverrides: z
    .record(
      z.string(),
      z.object({
        title: z.string(),
        wording: z.string(),
      })
    )
    .optional(),
  participants: participantListSchema.optional(),
  paBenefitLimits: z
    .record(z.string().max(50), z.number().min(0, "Limit manfaat tidak boleh negatif").max(1000))
    .nullable()
    .optional(),
  clauseGroups: z
    .record(
      z.string(),
      z.string().max(200, "Judul kelompok klausul maksimal 200 karakter")
    )
    .optional(),
  clauseIdsSection2: z.array(z.string()).optional(),
  clauseOverridesSection2: z
    .record(
      z.string(),
      z.object({
        title: z.string(),
        wording: z.string(),
      })
    )
    .optional(),
  clauseIdsGeneral: z.array(z.string()).optional(),
  clauseOverridesGeneral: z
    .record(
      z.string(),
      z.object({
        title: z.string(),
        wording: z.string(),
      })
    )
    .optional(),
  wordingForms: z.array(z.string()).optional(),
  rateLines: z.array(rateLineSchema).optional(),
  tplLines: z.array(rateLineSchema).optional(),
  paLines: z.array(rateLineSchema).optional(),
  rateExceptions: z
    .record(
      z.string(),
      z.object({
        reason: z.string(),
        note: z.string(),
      })
    )
    .optional(),
  securityPanel: z.array(securityPanelRowSchema).optional(),
  discountPct: z.coerce.number().optional(),
  adminCost: z.coerce.number().optional(),
  stampDuty: z.coerce.number().optional(),
  brokeragePct: z.coerce.number().optional(),
  includeVat: z.boolean().optional(),
  additionalFeeIncludeVat: z.boolean().optional(),
  additionalFee: z.coerce
    .number()
    .min(0, "Additional fee tidak boleh negatif")
    .nullish(),
  subjectivity: z.string().nullish(),
  closingInstruction: z.string().nullish(),
  coverNoteRemarks: z.string().nullish(),
  // Endorsement dan cancellation slip (Harry, 11 November 2026).
  effectiveDate: documentDateSchema,
  changeDescription: z.string().max(4000, "Uraian perubahan maksimal 4000 karakter").nullish(),
})

const attachmentIdSchema = z.uuid()

/** Unggah lampiran slip, misalnya vessel schedule, daftar unit, atau klausul hasil scan. */
export async function uploadSlipAttachmentAction(
  slipId: string,
  formData: FormData
): Promise<ActionResponse<SlipAttachment[]>> {
  try {
    const user = await requireManage("/placement")
    if (!attachmentIdSchema.safeParse(slipId).success) {
      return { ok: false, error: "Simpan draft slip dulu sebelum menambah lampiran." }
    }
    const file = formData.get("file")
    if (!(file instanceof File)) return { ok: false, error: "File tidak ditemukan." }
    const description = String(formData.get("description") ?? "").slice(
      0,
      ATTACHMENT_LIMITS.description
    )
    const data = await uploadSlipAttachment(slipId, file, description, user.id)
    revalidateUnderwritingPaths(slipId)
    return { ok: true, data }
  } catch (err: unknown) {
    unstable_rethrow(err)
    return { ok: false, error: err instanceof Error ? err.message : "Gagal mengunggah lampiran." }
  }
}

export async function deleteSlipAttachmentAction(
  attachmentId: string
): Promise<ActionResponse<SlipAttachment[]>> {
  try {
    const user = await requireManage("/placement")
    if (!attachmentIdSchema.safeParse(attachmentId).success) {
      return { ok: false, error: "Lampiran tidak valid." }
    }
    const { slipId, attachments } = await deleteSlipAttachment(attachmentId, user.id)
    revalidateUnderwritingPaths(slipId)
    return { ok: true, data: attachments }
  } catch (err: unknown) {
    unstable_rethrow(err)
    return { ok: false, error: err instanceof Error ? err.message : "Gagal menghapus lampiran." }
  }
}

/** Isi lampiran ikut tercetak di dokumen slip atau hanya namanya. */
export async function setSlipAttachmentPrintAction(
  attachmentId: string,
  printContent: boolean
): Promise<ActionResponse<SlipAttachment[]>> {
  try {
    const user = await requireManage("/placement")
    if (!attachmentIdSchema.safeParse(attachmentId).success || typeof printContent !== "boolean") {
      return { ok: false, error: "Lampiran tidak valid." }
    }
    const { slipId, attachments } = await setSlipAttachmentPrint(attachmentId, printContent, user.id)
    revalidateUnderwritingPaths(slipId)
    return { ok: true, data: attachments }
  } catch (err: unknown) {
    unstable_rethrow(err)
    return { ok: false, error: err instanceof Error ? err.message : "Gagal mengubah lampiran." }
  }
}

function revalidateUnderwritingPaths(id?: string) {
  revalidatePath("/placement")
  revalidatePath("/placement/new")
  revalidatePath("/", "layout")
  if (id) {
    revalidatePath(`/placement/edit/${id}`)
    revalidatePath(`/placement/quotation/edit/${id}`)
    revalidatePath(`/placement/closing/edit/${id}`)
    revalidatePath(`/placement/slip/${id}`)
    revalidatePath(`/placement/quotation/${id}`)
    revalidatePath(`/placement/cover-note/${id}`)
    revalidatePath(`/placement/closing/${id}`)
  }
}

export async function savePlacingSlipAction(
  slip: PlacingSlip,
  mode: "new" | "edit"
): Promise<ActionResponse<PlacingSlipRecord>> {
  try {
    const user = await requireManage("/placement")

    const parsed = placingSlipSchema.safeParse(slip)
    if (!parsed.success) {
      console.error(
        "[savePlacingSlipAction] validation failed:",
        JSON.stringify(parsed.error.issues, null, 2)
      )
      const firstIssue = parsed.error.issues[0]
      const pathStr = firstIssue ? ` (${firstIssue.path.join(".")})` : ""
      return {
        ok: false,
        error: firstIssue
          ? `${firstIssue.message}${pathStr}`
          : "Data Placing Slip tidak valid.",
      }
    }

    // Brokerage exceeding OJK statutory cap cannot be saved, not merely blocked at release.
    // Whether the cap applies comes from the cover type in Master Data, not the browser.
    const ojkTariff = await coverUsesOjkTariff(slip.cob, slip.typeOfCover)
    const brokerageIssue = brokerageLimitIssue({
      ...slip,
      ojkTariff: ojkTariff ? undefined : false,
    })
    if (brokerageIssue) return { ok: false, error: brokerageIssue }

    const input = parsed.data as PlacingSlipInput

    let result: PlacingSlipRecord
    let previousStatus: SlipStatus | null = null
    // Slip sebelum revisi, kalau CI-nya sudah terbit: revisinya diteruskan ke polis.
    let closedBefore: PlacingSlipRecord | null = null

    const isNew =
      mode === "new" ||
      !slip.id ||
      slip.id === "new" ||
      slip.id.startsWith("s-")

    if (isNew) {
      // Check whether slip with mock ID already exists in database
      const existing = slip.id ? await getPlacingSlipById(slip.id) : null
      if (existing) {
        previousStatus = existing.status
        result = await updatePlacingSlip(existing.dbId, input, user.id)
      } else {
        result = await createPlacingSlip(input, user.id)
      }
    } else {
      const before = await prisma.placingSlip.findUnique({
        where: { id: slip.id },
        select: { status: true },
      })
      previousStatus = before?.status ?? null
      if (previousStatus === "Closed") closedBefore = await getPlacingSlipById(slip.id)
      result = await updatePlacingSlip(slip.id, input, user.id)
    }

    revalidateUnderwritingPaths(result.id)
    // Closing Instruction baru terbit: polisnya langsung tercatat. Revisi
    // sesudahnya ikut ke polis yang masih bernomor sementara.
    const notice =
      result.status === "Closed" && previousStatus !== "Closed"
        ? await closedNotice(result, user.id)
        : closedBefore && result.status === "Closed" && isPlacingSlip(result)
          ? await revisionPolicyNotice(closedBefore, user.id)
          : undefined
    return { ok: true, data: result, notice }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan Placing Slip."
    return { ok: false, error: message }
  }
}

/**
 * Releases placing slip and issues official document number (PS/COB/YYYY/MM/XXXX).
 */
export async function releasePlacingSlipAction(
  id: string
): Promise<ActionResponse<PlacingSlipRecord>> {
  try {
    const user = await requireManage("/placement")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID Placing Slip tidak valid." }
    }

    const target = await getPlacingSlipById(id.trim())
    if (!target) {
      return { ok: false, error: "Placing Slip tidak ditemukan." }
    }

    const validation = await validatePlacingSlipForRelease(target)
    if (!validation.canRelease) {
      const errorDetails: string[] = []
      if (validation.releaseIssues.length > 0) {
        errorDetails.push(...validation.releaseIssues)
      }
      if (validation.missingExceptions.length > 0) {
        const unit = rateUnitFor(target.cob)
        for (const { line, reason } of validation.missingExceptions) {
          const range =
            line.max == null
              ? `minimal ${line.min}${unit}`
              : line.min == null
                ? `maksimal ${line.max}${unit}`
                : `${line.min}${unit} sampai ${line.max}${unit}`
          errorDetails.push(
            `Rate ${rateLineName(target, line)} (${line.rate}${unit}) berada ${
              reason === "below" ? "di bawah batas minimal" : "di atas batas maksimal"
            } OJK (${range}) dan belum memiliki catatan justifikasi exception.`
          )
        }
      }
      if (validation.brokerageIssue) {
        errorDetails.push(validation.brokerageIssue.message)
      }
      return { ok: false, error: errorDetails.join(" ") }
    }

    const released = await releasePlacingSlip(target.dbId, user.id)
    revalidateUnderwritingPaths(released.id)
    return { ok: true, data: released }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal merilis Placing Slip."
    return { ok: false, error: message }
  }
}

/** Estimated slip number for release confirmation dialog, fetched from DB sequence. */
export async function previewSlipNumberAction(
  coverCode: string | null,
  kind: SlipKind = "Placing"
): Promise<ActionResponse<string | null>> {
  try {
    await requireManage("/placement")
    const slipNo = await previewDocumentNumber(prisma, { code: "PS", coverCode })
    // Endorsement dan cancellation slip memakai urutan nomor placing slip.
    if (kind !== "Placing" && slipNo) {
      return { ok: true, data: derivedDocNumber(slipNo, kind === "Endorsement" ? "ES" : "CS") }
    }
    return { ok: true, data: slipNo }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal membaca nomor slip."
    return { ok: false, error: message }
  }
}

export async function togglePlacingSlipStatusAction(
  id: string,
  status: SlipStatus
): Promise<ActionResponse<PlacingSlipRecord>> {
  try {
    const user = await requireManage("/placement")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID Placing Slip tidak valid." }
    }

    const target = await getPlacingSlipById(id.trim())
    if (!target) {
      return { ok: false, error: "Placing Slip tidak ditemukan." }
    }

    const updated = await togglePlacingSlipStatus(target.dbId, status, user.id)
    revalidateUnderwritingPaths(updated.id)
    const notice =
      status === "Closed" && target.status !== "Closed"
        ? await closedNotice(updated, user.id)
        : undefined
    return { ok: true, data: updated, notice }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal mengubah status Placing Slip."
    return { ok: false, error: message }
  }
}

/**
 * Deletes a placing slip with Draft status.
 */
export async function deletePlacingSlipAction(
  id: string
): Promise<ActionResponse<void>> {
  try {
    const user = await requireManage("/placement")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID Placing Slip tidak valid." }
    }

    const target = await getPlacingSlipById(id.trim())
    if (!target) {
      return { ok: false, error: "Placing Slip tidak ditemukan." }
    }

    await deletePlacingSlip(target.dbId, user.id)
    revalidateUnderwritingPaths(target.dbId)
    return { ok: true }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus Placing Slip."
    return { ok: false, error: message }
  }
}

/**
 * Duplicates an existing placing slip into a new Draft without document number.
 */
export async function duplicatePlacingSlipAction(
  id: string
): Promise<ActionResponse<PlacingSlipRecord>> {
  try {
    const user = await requireManage("/placement")
    const source = await getPlacingSlipById(id)
    if (!source) {
      return { ok: false, error: "Placing Slip sumber tidak ditemukan." }
    }

    const duplicateInput = copySlipInput(source)

    const created = await createPlacingSlip(duplicateInput, user.id)
    revalidateUnderwritingPaths(created.id)
    return { ok: true, data: created }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menduplikasi Placing Slip."
    return { ok: false, error: message }
  }
}

export async function getClausesForPickerAction(): Promise<ActionResponse<ClausePickerItem[]>> {
  try {
    const rows = await prisma.clause.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        wordingHtml: true,
        sourceGroup: true,
        inPackage: true,
        packageGroup: true,
        packageOrder: true,
        cob: { select: { name: true } },
        coverType: { select: { name: true } },
      },
      orderBy: [{ title: "asc" }],
    })

    const items: ClausePickerItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      wording: r.wordingHtml,
      sourceGroup: r.sourceGroup,
      cobName: r.cob?.name ?? null,
      coverTypeName: r.coverType?.name ?? null,
      inPackage: r.inPackage,
      packageGroup: r.packageGroup,
      packageOrder: r.packageOrder,
    }))

    return { ok: true, data: items }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memuat klausula dari database."
    return { ok: false, error: message }
  }
}
