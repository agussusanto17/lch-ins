import "server-only"

import { prisma } from "@/lib/prisma"
import { saveUploadedBytes } from "@/lib/server/stored-files"
import {
  UPLOAD_PART_BYTES,
  joinUploadParts,
  maxUploadBytes,
  sizeLimitMessage,
  type FilePurpose,
} from "@/lib/uploads"

/*
 * Unggahan besar dikirim per potongan karena Vercel menolak body request di atas 4,5 MB.
 * Potongan disimpan sementara di upload_parts lalu digabung jadi satu stored_files; alur sama di VPS.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Unggahan yang tidak selesai dalam sehari dianggap batal. */
const STALE_MS = 24 * 60 * 60 * 1000

/**
 * Potongan tertunda per pengguna, sekitar tiga berkas 25 MB. Mencegah
 * unggahan yang tidak pernah diselesaikan memenuhi database.
 */
const MAX_PENDING_PARTS = 30

export async function saveUploadPart({
  uploadId,
  partNo,
  data,
  purpose,
  userId,
}: {
  uploadId: string
  partNo: number
  data: Uint8Array<ArrayBuffer>
  purpose: FilePurpose
  userId: string
}) {
  if (!UUID_RE.test(uploadId)) throw new Error("Unggahan tidak valid.")
  const maxParts = Math.ceil(maxUploadBytes(purpose) / UPLOAD_PART_BYTES)
  if (!Number.isInteger(partNo) || partNo < 0) {
    throw new Error("Unggahan tidak valid.")
  }
  if (partNo >= maxParts) throw new Error(sizeLimitMessage(maxUploadBytes(purpose)))
  if (data.byteLength === 0 || data.byteLength > UPLOAD_PART_BYTES) {
    throw new Error("Potongan berkas tidak valid.")
  }

  await prisma.uploadPart.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - STALE_MS) } },
  })
  const pending = await prisma.uploadPart.count({ where: { uploadedBy: userId } })
  if (pending >= MAX_PENDING_PARTS) {
    throw new Error(
      "Terlalu banyak unggahan yang belum selesai. Coba lagi beberapa saat lagi."
    )
  }
  // Potongan yang dikirim ulang menggantikan yang lama. Id unggahan milik
  // pengguna lain tidak bisa ditimpa: create gagal di primary key.
  await prisma.uploadPart.deleteMany({
    where: { uploadId, partNo, uploadedBy: userId },
  })
  await prisma.uploadPart.create({
    data: { uploadId, partNo, data, uploadedBy: userId },
  })
}

/**
 * Gabungkan semua potongan menjadi satu berkas tersimpan. Potongannya
 * dihapus, berhasil atau tidak, supaya tabel tidak menumpuk.
 */
export async function completeUpload({
  uploadId,
  parts,
  fileName,
  purpose,
  userId,
}: {
  uploadId: string
  parts: number
  fileName: string
  purpose: FilePurpose
  userId: string
}) {
  if (!UUID_RE.test(uploadId)) throw new Error("Unggahan tidak valid.")
  try {
    const rows = await prisma.uploadPart.findMany({
      where: { uploadId, uploadedBy: userId },
      select: { partNo: true, data: true },
    })
    const data = joinUploadParts(
      rows,
      parts,
      maxUploadBytes(purpose)
    )
    return await saveUploadedBytes({ data, fileName, purpose, userId })
  } finally {
    await prisma.uploadPart.deleteMany({ where: { uploadId, uploadedBy: userId } })
  }
}
