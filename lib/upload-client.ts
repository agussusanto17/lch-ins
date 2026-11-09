import {
  completeFileUploadAction,
  uploadFilePartAction,
  type ActionResponse,
} from "@/app/(app)/uploads/actions"
import { UPLOAD_PART_BYTES, type FilePurpose } from "@/lib/uploads"

/**
 * Unggah berkas per potongan 3 MB, lalu gabungkan di server menjadi satu
 * berkas tersimpan. Dipakai untuk berkas yang bisa lebih besar dari batas satu
 * request Vercel (4,5 MB). Hasilnya id berkas untuk ditautkan ke datanya.
 */
export async function uploadInParts(
  file: File,
  purpose: FilePurpose,
  onProgress?: (sent: number, total: number) => void
): Promise<ActionResponse<{ id: string; fileName: string }>> {
  const uploadId = crypto.randomUUID()
  const parts = Math.max(1, Math.ceil(file.size / UPLOAD_PART_BYTES))
  for (let i = 0; i < parts; i++) {
    const body = new FormData()
    body.append("uploadId", uploadId)
    body.append("partNo", String(i))
    body.append("purpose", purpose)
    body.append(
      "chunk",
      file.slice(i * UPLOAD_PART_BYTES, (i + 1) * UPLOAD_PART_BYTES),
      file.name
    )
    const res = await uploadFilePartAction(body)
    if (!res.ok) return { ok: false, error: res.error }
    onProgress?.(i + 1, parts)
  }
  return completeFileUploadAction({ uploadId, parts, fileName: file.name, purpose })
}
