"use server"

import { revalidatePath } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { z } from "zod"

import { POLICY_TYPES } from "@/lib/data/reference"
import { Prisma } from "@/lib/generated/prisma/client"
import { participantListSchema } from "@/lib/participant-schema"
import type { PolicyParticipant } from "@/lib/policy-participants"
import { DECLARATION_SAVE_BATCH } from "@/lib/declaration-import"
import { declarationPreset } from "@/lib/open-cover"
import {
  addPolicyFile,
  createPolicies,
  createPolicy,
  deletePolicy,
  getPolicyById,
  listPolicyParticipants,
  updatePolicy,
  type PolicyInput,
  type PolicyRecord,
} from "@/lib/server/policies"
import { requireAccess, requireManage } from "@/lib/server/session"
import { discardOwnedUpload } from "@/lib/server/stored-files"
import type { PolicyFileKind } from "@/lib/data/types"
import { parentPolicyIssue } from "@/lib/policy-parent"

export interface ActionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")

const policyInputSchema = z
  .object({
    policyNo: z.string().trim().min(1, "No. polis wajib diisi"),
    clientId: z.string().min(1).nullable(),
    placingSlipId: z.string().min(1).nullable(),
    parentPolicyId: z.string().min(1).nullable(),
    previousPolicyNo: z.string().trim().max(100, "No. polis sebelumnya maksimal 100 karakter").nullable().optional(),
    insuredName: z.string().trim().min(1, "Nama tertanggung wajib diisi"),
    insurer: z.string().trim().min(1, "Asuransi wajib diisi"),
    insurers: z.array(
      z.object({
        id: z.string(),
        insurer: z.string().trim().min(1, "Nama asuransi wajib diisi"),
        share: z.number().gt(0).max(100),
        role: z.enum(["As Leader", "As Member"]),
        // Additional fee (%) per asuransi (Harry, 12 November 2026).
        additionalFeePct: z.number().min(0, "Additional fee tidak boleh negatif").max(100, "Additional fee maksimal 100%").optional(),
        additionalFeeIncludeVat: z.boolean().optional(),
      })
    ),
    // Daftar COB ada di master data; server menolak nama yang tidak ada di sana.
    cob: z.string().trim().min(1, "Class of business wajib dipilih"),
    typeOfCover: z.string().optional(),
    inceptionDate: isoDate,
    expiryDate: isoDate,
    currency: z.string().trim().length(3, "Kode mata uang harus 3 huruf"),
    // Endorsement dan pembatalan mencatat selisih, jadi pengurangan UP negatif.
    sumInsured: z.number(),
    premium: z.number(),
    // Diskon nominal, bertanda sama dengan premi (MoM review Phase 1, poin 19).
    discountAmount: z.number().optional(),
    // Deklarasi MOP: premi tagihan ke klien, untuk margin (Agus, 22 November 2026).
    clientPremium: z.number().min(0, "Premi tagihan ke klien tidak boleh negatif").nullable().optional(),
    // Deklarasi MOP: ETD dari General Marine Report (Agus, 23 November 2026).
    etdDate: isoDate.nullable().optional(),
    brokeragePct: z.number().min(0).max(100),
    // Premi installment 2 sampai 10 kali (Agus, 20 November 2026); server memeriksa jumlah persen.
    premiumInstallments: z
      .array(
        z.object({
          no: z.number().int(),
          dueDate: isoDate.nullable(),
          pct: z.number().min(0, "Persen cicilan tidak boleh negatif").max(100, "Persen cicilan maksimal 100%"),
        })
      )
      .max(10, "Cicilan premi maksimal 10 kali")
      .optional(),
    includeVat: z.boolean().optional(),
    // Sharing brokerage ke LCH Singapore, persen dari brokerage (Agus, 22 November 2026).
    commissionShareSgPct: z
      .number()
      .min(0, "Sharing komisi LCH Singapore tidak boleh negatif")
      .max(100, "Sharing komisi LCH Singapore maksimal 100%")
      .optional(),
    // Nominal fee dihitung server dari premi dan fee (%) per asuransi.
    additionalFee: z.number().optional(),
    additionalFeePct: z.number().min(0, "Additional fee tidak boleh negatif").max(100, "Additional fee maksimal 100%").optional(),
    additionalFeeIncludeVat: z.boolean().optional(),
    // Endorsement: rate (%) untuk premi prorata hari, admin cost, dan stamp duty.
    rate: z.number().min(0, "Rate tidak boleh negatif").max(100, "Rate maksimal 100%").nullable().optional(),
    premiumBasis: z.number().nullable().optional(),
    adminCost: z.number().min(0, "Admin cost tidak boleh negatif").optional(),
    stampDuty: z.number().min(0, "Stamp duty tidak boleh negatif").optional(),
    slipPart: z.enum(["PAR", "EQVET"]).nullable().optional(),
    type: z.enum(POLICY_TYPES),
    riskLocation: z.string(),
    cobOjkClassId: z.uuid("Klasifikasi OJK tidak valid").nullable().optional(),
    placementLocationId: z.uuid("Lokasi penempatan tidak valid").nullable().optional(),
    groupingInsured: z.string().trim().max(200, "Grouping insured maksimal 200 karakter").optional(),
    // Kosong berarti premi belum dibayar.
    premiumPaidDate: isoDate.nullable().optional(),
    remarks: z.string().max(2000, "Remarks maksimal 2000 karakter").nullable().optional(),
    participantChanges: z
      .object({
        added: participantListSchema,
        removedIds: z.array(z.uuid("Peserta tidak valid")).max(5000),
      })
      .optional(),
  })
  // Tanggal sama boleh: polis acara satu hari, misalnya Hole in One.
  .refine((d) => d.expiryDate >= d.inceptionDate, {
    path: ["expiryDate"],
    message: "Tanggal berakhir tidak boleh sebelum tanggal mulai",
  })
  .refine((d) => new Set(d.insurers.map((i) => i.insurer.toLowerCase())).size === d.insurers.length, {
    path: ["insurers"],
    message: "Asuransi yang sama tidak boleh muncul dua kali",
  })
  .refine((d) => (d.type !== "Baru" && d.type !== "Renewal") || d.sumInsured >= 0, {
    path: ["sumInsured"],
    message: "Sum insured polis baru dan renewal tidak boleh negatif",
  })
  // Renewal boleh tanpa polis di sistem asal nomornya diisi; endorsement dan
  // pembatalan tetap harus memilih polisnya.
  .superRefine((d, ctx) => {
    const issue = parentPolicyIssue(d)
    if (issue) ctx.addIssue({ code: "custom", path: ["parentPolicyId"], message: issue })
  })

function fail(err: unknown, fallback: string): ActionResponse<never> {
  // Let redirects from requireManage through; view-only access still returns a message.
  unstable_rethrow(err)
  // Two endorsements saved at once on the same parent collide on the endorsement_seq unique key.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return { ok: false, error: "Polis bentrok dengan penyimpanan lain. Muat ulang halaman lalu simpan lagi." }
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback }
}

const policyIdSchema = z.uuid("ID polis tidak valid")

function parseInput(input: PolicyInput) {
  const parsed = policyInputSchema.safeParse(input)
  return parsed.success
    ? { data: parsed.data }
    : { error: parsed.error.issues[0]?.message ?? "Data polis tidak valid" }
}

export async function createPolicyAction(
  input: PolicyInput
): Promise<ActionResponse<PolicyRecord>> {
  try {
    const user = await requireManage("/policies")
    const parsed = parseInput(input)
    if (!parsed.data) return { ok: false, error: parsed.error }
    const data = await createPolicy(parsed.data, user.id)
    revalidatePath("/policies")
    revalidatePath("/reports")
    revalidatePath("/", "layout")
    return { ok: true, data }
  } catch (err) {
    return fail(err, "Gagal menyimpan polis")
  }
}

const declarationRowsSchema = z
  .array(
    z.object({
      policyNo: z
        .string()
        .trim()
        .min(1, "No. sertifikat wajib diisi")
        .max(100, "No. sertifikat maksimal 100 karakter"),
      inceptionDate: isoDate,
      etdDate: isoDate.nullable().optional(),
      sumInsured: z.number().gt(0, "Nilai deklarasi harus lebih dari 0"),
      premium: z.number().gt(0, "Premi deklarasi harus lebih dari 0"),
      // Premi tagihan ke klien dari Gross Premium file; premi deklarasi menurut rate MOP.
      clientPremium: z.number().min(0, "Premi tagihan ke klien tidak boleh negatif").nullable().optional(),
      // Tertanggung di sertifikat ("... QQ ..."); kosong berarti ikut polis MOP.
      insuredName: z.string().trim().max(500, "Tertanggung maksimal 500 karakter").nullable().optional(),
      // Admin Fee General Marine Report, disimpan sebagai admin cost deklarasi.
      adminFee: z.number().min(0, "Admin Fee tidak boleh negatif").nullable().optional(),
      remarks: z.string().max(2000, "Keterangan maksimal 2000 karakter").nullable(),
    })
  )
  .min(1, "Tidak ada deklarasi untuk disimpan")
  .max(DECLARATION_SAVE_BATCH, `Maksimal ${DECLARATION_SAVE_BATCH} deklarasi per simpan`)

/**
 * Upload deklarasi MOP dari Excel (Agus, 17 November 2026). Isian selain nomor, tanggal, nilai,
 * premi, dan keterangan diambil server dari polis MOP-nya, sama dengan form Tambah deklarasi.
 * Klien mengirim per kelompok; satu kelompok tersimpan dalam satu transaksi, atau tidak sama sekali.
 */
export async function importDeclarationsAction(
  masterId: string,
  rows: z.input<typeof declarationRowsSchema>
): Promise<ActionResponse<PolicyRecord[]>> {
  try {
    const user = await requireManage("/policies")
    const id = policyIdSchema.safeParse(masterId)
    if (!id.success) return { ok: false, error: "ID polis tidak valid" }
    const parsedRows = declarationRowsSchema.safeParse(rows)
    if (!parsedRows.success) {
      return { ok: false, error: parsedRows.error.issues[0]?.message ?? "Data deklarasi tidak valid" }
    }
    const master = await getPolicyById(id.data)
    if (!master) return { ok: false, error: "Polis MOP tidak ditemukan" }
    const preset = declarationPreset(master)
    const inputs: PolicyInput[] = []
    for (const row of parsedRows.data) {
      if (row.inceptionDate < master.inceptionDate || row.inceptionDate > master.expiryDate) {
        return { ok: false, error: `${row.policyNo}: tanggal deklarasi di luar periode polis MOP` }
      }
      const parsed = parseInput({
        ...preset,
        insuredName: row.insuredName || preset.insuredName,
        policyNo: row.policyNo,
        previousPolicyNo: null,
        inceptionDate: row.inceptionDate,
        etdDate: row.etdDate ?? null,
        sumInsured: row.sumInsured,
        premium: row.premium,
        clientPremium: row.clientPremium ?? null,
        discountAmount: 0,
        additionalFee: 0,
        rate: null,
        premiumBasis: null,
        adminCost: row.adminFee ?? 0,
        stampDuty: 0,
        slipPart: null,
        premiumPaidDate: null,
        remarks: row.remarks,
      })
      if (!parsed.data) return { ok: false, error: `${row.policyNo}: ${parsed.error}` }
      inputs.push(parsed.data)
    }
    const data = await createPolicies(inputs, user.id)
    revalidatePath("/policies")
    revalidatePath("/reports")
    revalidatePath("/", "layout")
    return { ok: true, data }
  } catch (err) {
    return fail(err, "Gagal menyimpan deklarasi")
  }
}

export async function updatePolicyAction(
  id: string,
  input: PolicyInput
): Promise<ActionResponse<PolicyRecord>> {
  try {
    const user = await requireManage("/policies")
    const policyId = policyIdSchema.safeParse(id)
    if (!policyId.success) return { ok: false, error: "ID polis tidak valid" }
    const parsed = parseInput(input)
    if (!parsed.data) return { ok: false, error: parsed.error }
    const data = await updatePolicy(policyId.data, parsed.data, user.id)
    revalidatePath("/policies")
    revalidatePath("/reports")
    revalidatePath("/", "layout")
    return { ok: true, data }
  } catch (err) {
    return fail(err, "Gagal memperbarui polis")
  }
}

export async function deletePolicyAction(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await requireManage("/policies")
    const policyId = policyIdSchema.safeParse(id)
    if (!policyId.success) return { ok: false, error: "ID polis tidak valid" }
    await deletePolicy(policyId.data, user.id)
    revalidatePath("/policies")
    revalidatePath("/reports")
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (err) {
    return fail(err, "Gagal menghapus polis")
  }
}

const policyFileKindSchema = z.enum(["Policy", "PremiumNote", "CommissionNote", "Slip"])

/**
 * Tautkan berkas polis hasil upload bertahap sebagai versi berikutnya dari jenisnya. File ID
 * diperiksa server-side; isinya tak melewati action ini karena total berkas bisa 50 MB.
 */
export async function attachPolicyFileAction(
  id: string,
  fileId: string,
  kind: PolicyFileKind
): Promise<ActionResponse<PolicyRecord>> {
  let userId: string | null = null
  try {
    const user = await requireManage("/policies")
    userId = user.id
    const policyId = policyIdSchema.safeParse(id)
    if (!policyId.success) {
      await discardOwnedUpload(fileId, "policy_file", user.id).catch(() => undefined)
      return { ok: false, error: "ID polis tidak valid" }
    }
    const fileKind = policyFileKindSchema.safeParse(kind)
    if (!fileKind.success) {
      await discardOwnedUpload(fileId, "policy_file", user.id).catch(() => undefined)
      return { ok: false, error: "Jenis berkas polis tidak dikenal" }
    }
    const data = await addPolicyFile(policyId.data, fileId, user.id, fileKind.data)
    revalidatePath("/policies")
    return { ok: true, data }
  } catch (err) {
    if (userId) await discardOwnedUpload(fileId, "policy_file", userId).catch(() => undefined)
    return fail(err, "Gagal menyimpan berkas polis")
  }
}

/** Daftar peserta PA grup polis, termasuk yang ditambah atau dikurangi endorsement. */
export async function listPolicyParticipantsAction(
  id: string
): Promise<ActionResponse<PolicyParticipant[]>> {
  try {
    await requireAccess("/policies")
    const policyId = policyIdSchema.safeParse(id)
    if (!policyId.success) return { ok: false, error: "ID polis tidak valid" }
    return { ok: true, data: await listPolicyParticipants(policyId.data) }
  } catch (err) {
    return fail(err, "Gagal memuat peserta polis")
  }
}
