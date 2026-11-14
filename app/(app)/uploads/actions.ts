"use server"

import { unstable_rethrow } from "next/navigation"
import { z } from "zod"

import { requireManage } from "@/lib/server/session"
import { purposeMenu } from "@/lib/server/stored-files"
import { completeUpload, saveUploadPart } from "@/lib/server/upload-parts"
import { FILE_PURPOSES, type FilePurpose } from "@/lib/uploads"

/*
 * Unggahan per potongan untuk berkas di atas batas request Vercel (4,5 MB): uploadFilePartAction
 * per potongan, lalu completeFileUploadAction; id stored_files-nya ditautkan lewat action modulnya.
 */

export interface ActionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

const purposeSchema = z.enum(FILE_PURPOSES as [FilePurpose, ...FilePurpose[]])

/** Kelola di menu pemilik berkas, sama seperti saat menautkannya nanti. */
async function requirePurposeManage(purpose: FilePurpose) {
  const menu = purposeMenu(purpose)
  if (!menu) throw new Error("Jenis berkas tidak dikenal.")
  return requireManage(menu)
}

function fail(err: unknown, fallback: string): ActionResponse<never> {
  unstable_rethrow(err)
  return { ok: false, error: err instanceof Error ? err.message : fallback }
}

export async function uploadFilePartAction(
  formData: FormData
): Promise<ActionResponse<null>> {
  try {
    const purpose = purposeSchema.safeParse(formData.get("purpose"))
    if (!purpose.success) return { ok: false, error: "Jenis berkas tidak dikenal." }
    const user = await requirePurposeManage(purpose.data)
    const chunk = formData.get("chunk")
    if (!(chunk instanceof Blob)) {
      return { ok: false, error: "Potongan berkas tidak ditemukan." }
    }
    await saveUploadPart({
      uploadId: String(formData.get("uploadId") ?? ""),
      partNo: Number(formData.get("partNo")),
      data: new Uint8Array(await chunk.arrayBuffer()),
      purpose: purpose.data,
      userId: user.id,
    })
    return { ok: true, data: null }
  } catch (err) {
    return fail(err, "Gagal mengunggah berkas")
  }
}

const completeSchema = z.object({
  uploadId: z.uuid("Unggahan tidak valid."),
  parts: z.number().int().min(1),
  fileName: z.string().min(1).max(500),
  purpose: purposeSchema,
})

export async function completeFileUploadAction(
  input: z.input<typeof completeSchema>
): Promise<ActionResponse<{ id: string; fileName: string }>> {
  try {
    const parsed = completeSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Unggahan tidak valid." }
    }
    const user = await requirePurposeManage(parsed.data.purpose)
    const stored = await completeUpload({ ...parsed.data, userId: user.id })
    return { ok: true, data: { id: stored.id, fileName: stored.fileName } }
  } catch (err) {
    return fail(err, "Gagal menyimpan berkas")
  }
}
