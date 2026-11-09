"use server"

import { revalidatePath } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { z } from "zod"

import type { SlipStatus } from "@/lib/generated/prisma/client"
import { MAX_DEDUCTIBLES, type PlacingSlip, type SlipAttachment } from "@/lib/data/types"
import { participantListSchema } from "@/lib/participant-schema"
import { brokerageLimitIssue, rateUnitFor } from "@/lib/calc"
import { rateLineName } from "@/components/underwriting/slip-model"
import {
  coverUsesOjkTariff,
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
import { prisma } from "@/lib/prisma"
import { requireManage } from "@/lib/server/session"
import {
  ATTACHMENT_LIMITS,
  deleteSlipAttachment,
  uploadSlipAttachment,
} from "@/lib/server/slip-files"
import { previewDocumentNumber } from "@/server/services/number-generator"

export interface ActionResponse<T = void> {
  ok: boolean
  data?: T
  error?: string
}

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
  additionalFee: z.coerce
    .number()
    .min(0, "Additional fee tidak boleh negatif")
    .nullish(),
  subjectivity: z.string().nullish(),
  closingInstruction: z.string().nullish(),
  coverNoteRemarks: z.string().nullish(),
})

const attachmentIdSchema = z.uuid()

/** Unggah lampiran slip, misalnya vessel schedule, daftar unit, atau klausul hasil scan. */
export async function uploadSlipAttachmentAction(
  slipId: string,
  formData: FormData
): Promise<ActionResponse<SlipAttachment[]>> {
  try {
    const user = await requireManage("/underwriting")
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
    const user = await requireManage("/underwriting")
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

function revalidateUnderwritingPaths(id?: string) {
  revalidatePath("/underwriting")
  revalidatePath("/underwriting/new")
  revalidatePath("/", "layout")
  if (id) {
    revalidatePath(`/underwriting/edit/${id}`)
    revalidatePath(`/underwriting/quotation/edit/${id}`)
    revalidatePath(`/underwriting/slip/${id}`)
    revalidatePath(`/underwriting/quotation/${id}`)
    revalidatePath(`/underwriting/cover-note/${id}`)
    revalidatePath(`/underwriting/closing/${id}`)
  }
}

export async function savePlacingSlipAction(
  slip: PlacingSlip,
  mode: "new" | "edit"
): Promise<ActionResponse<PlacingSlipRecord>> {
  try {
    const user = await requireManage("/underwriting")

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

    const isNew =
      mode === "new" ||
      !slip.id ||
      slip.id === "new" ||
      slip.id.startsWith("s-")

    if (isNew) {
      // Check whether slip with mock ID already exists in database
      const existing = slip.id ? await getPlacingSlipById(slip.id) : null
      if (existing) {
        result = await updatePlacingSlip(existing.dbId, input, user.id)
      } else {
        result = await createPlacingSlip(input, user.id)
      }
    } else {
      result = await updatePlacingSlip(slip.id, input, user.id)
    }

    revalidateUnderwritingPaths(result.id)
    return { ok: true, data: result }
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
    const user = await requireManage("/underwriting")
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
  coverCode: string | null
): Promise<ActionResponse<string | null>> {
  try {
    await requireManage("/underwriting")
    const slipNo = await previewDocumentNumber(prisma, { code: "PS", coverCode })
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
    const user = await requireManage("/underwriting")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID Placing Slip tidak valid." }
    }

    const target = await getPlacingSlipById(id.trim())
    if (!target) {
      return { ok: false, error: "Placing Slip tidak ditemukan." }
    }

    const updated = await togglePlacingSlipStatus(target.dbId, status, user.id)
    revalidateUnderwritingPaths(updated.id)
    return { ok: true, data: updated }
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
    const user = await requireManage("/underwriting")
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
    const user = await requireManage("/underwriting")
    const source = await getPlacingSlipById(id)
    if (!source) {
      return { ok: false, error: "Placing Slip sumber tidak ditemukan." }
    }

    const duplicateInput: PlacingSlipInput = {
      clientId: source.clientId || "",
      cob: source.cob,
      typeOfCover: source.typeOfCover,
      typeOfCover2: source.typeOfCover2,
      typeOfCoverLabel: source.typeOfCoverLabel,
      typeOfCover2Label: source.typeOfCover2Label,
      coverCode: source.coverCode,
      insuredName: source.insuredName,
      correspondenceAddress: source.correspondenceAddress,
      currency: source.currency,
      status: "Draft",
      periodTba: source.periodTba,
      inceptionDate: source.inceptionDate,
      expiryDate: source.expiryDate,
      periodNote: source.periodNote,
      periodLabel: source.periodLabel,
      periodEndText: source.periodEndText,
      periodText: source.periodText,
      insuredDescription: source.insuredDescription,
      usesSections: source.usesSections,
      openCover: source.openCover,
      openCoverRates: source.openCoverRates,
      detailRows: source.detailRows,
      occupation: source.occupation,
      occupationLabel: source.occupationLabel,
      riskLocation: source.riskLocation,
      locations: source.locations,
      coverage: source.coverage,
      constructionClass: source.constructionClass,
      indemnityPeriod: source.indemnityPeriod,
      interestSection1: source.interestSection1,
      interestSection2: source.interestSection2,
      specialConditions: source.specialConditions,
      deductibleIntro: source.deductibleIntro,
      exclusions: source.exclusions,
      interestItems: source.interestItems,
      sumInsuredSection1: source.sumInsuredSection1,
      sumInsuredSection2: source.sumInsuredSection2,
      clauseIds: source.clauseIds,
      clauseOverrides: source.clauseOverrides,
      clauseGroups: source.clauseGroups,
      participants: source.participants,
      paBenefitLimits: source.paBenefitLimits,
      clauseIdsSection2: source.clauseIdsSection2,
      clauseOverridesSection2: source.clauseOverridesSection2,
      clauseIdsGeneral: source.clauseIdsGeneral,
      clauseOverridesGeneral: source.clauseOverridesGeneral,
      wordingForms: source.wordingForms,
      rateLines: source.rateLines,
      tplLines: source.tplLines,
      paLines: source.paLines,
      rateExceptions: source.rateExceptions,
      securityPanel: source.securityPanel,
      discountPct: source.discountPct,
      adminCost: source.adminCost,
      stampDuty: source.stampDuty,
      brokeragePct: source.brokeragePct,
      includeVat: source.includeVat,
      additionalFee: source.additionalFee,
    }

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
