import "server-only"

import type { SlipAttachment } from "@/lib/data/types"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import {
  assertClaimableFile,
  deleteStoredFiles,
  discardStoredFile,
  saveUploadedFile,
  storedFilePath,
  storedFileUrl,
} from "@/lib/server/stored-files"
import { recordAudit } from "@/server/services/audit"

type Tx = Prisma.TransactionClient

/** Batas lampiran per slip dan panjang keterangannya. */
export const ATTACHMENT_LIMITS = { files: 20, description: 200 }

interface SlipFileRow {
  id: string
  fileName: string
  description: string | null
  filePath: string
  sizeBytes: number
  printContent: boolean
  uploadedAt: Date
}

export function toSlipAttachment(row: SlipFileRow): SlipAttachment {
  return {
    id: row.id,
    fileName: row.fileName,
    description: row.description ?? undefined,
    url: storedFileUrl(row.filePath),
    sizeBytes: row.sizeBytes,
    printContent: row.printContent,
    uploadedAt: row.uploadedAt.toISOString(),
  }
}

/** Urutan lampiran di form dan cetakan: sesuai urutan unggah. */
export const slipFilesOrder = [
  { sortOrder: "asc" as const },
  { uploadedAt: "asc" as const },
]

async function listAttachments(tx: Tx, slipId: string) {
  const rows = await tx.slipFile.findMany({
    where: { slipId },
    orderBy: slipFilesOrder,
  })
  return rows.map(toSlipAttachment)
}

/**
 * Slip dikunci sampai transaksi selesai, supaya urutan lampiran tidak bentrok.
 * Lampiran mengikuti aturan ubah slip: Closed dan Cancelled terkunci.
 */
async function editableSlip(tx: Tx, slipId: string) {
  const rows = await tx.$queryRaw<{ slip_no: string | null; status: string }[]>`
    SELECT slip_no, status::text AS status FROM placing_slips WHERE id = ${slipId}::uuid FOR UPDATE`
  const slip = rows[0]
  if (!slip) throw new Error("Placing slip tidak ditemukan.")
  if (slip.status === "Cancelled") {
    throw new Error("Placing Slip berstatus Cancelled tidak dapat diubah.")
  }
  return slip
}

/** Tautkan berkas yang baru diunggah ke slip, lalu kembalikan daftar lampirannya. */
export async function addSlipAttachment(
  slipId: string,
  fileId: string,
  description: string | null | undefined,
  userId: string
): Promise<SlipAttachment[]> {
  return prisma.$transaction(async (tx) => {
    await assertClaimableFile(tx, fileId, "slip_attachment", userId)
    const slip = await editableSlip(tx, slipId)
    const count = await tx.slipFile.count({ where: { slipId } })
    if (count >= ATTACHMENT_LIMITS.files) {
      throw new Error(`Lampiran maksimal ${ATTACHMENT_LIMITS.files} file per slip.`)
    }
    const stored = await tx.storedFile.findUniqueOrThrow({
      where: { id: fileId },
      select: { fileName: true, sizeBytes: true },
    })
    const last = await tx.slipFile.aggregate({
      where: { slipId },
      _max: { sortOrder: true },
    })
    const created = await tx.slipFile.create({
      data: {
        slipId,
        description: description?.trim().slice(0, ATTACHMENT_LIMITS.description) || null,
        fileName: stored.fileName,
        filePath: storedFilePath(fileId),
        sizeBytes: stored.sizeBytes,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        uploadedBy: userId,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: slipId,
      action: "Update",
      before: { attachments: count },
      after: { attachments: count + 1, attachmentAdded: created.description ?? created.fileName },
      context: { slipNo: slip.slip_no ?? "Draft" },
    })
    return listAttachments(tx, slipId)
  })
}

/**
 * Simpan berkas unggahan lalu tautkan ke slip. Kalau penautan gagal, misalnya
 * slip sudah Closed, berkasnya dihapus lagi supaya tidak tertinggal.
 */
export async function uploadSlipAttachment(
  slipId: string,
  file: File,
  description: string | null | undefined,
  userId: string
): Promise<SlipAttachment[]> {
  const stored = await saveUploadedFile(file, "slip_attachment", userId)
  try {
    return await addSlipAttachment(slipId, stored.id, description, userId)
  } catch (err) {
    await discardStoredFile(stored.id)
    throw err
  }
}

/**
 * Atur apakah isi lampiran ikut tercetak di halaman akhir dokumen slip.
 * Mengikuti aturan ubah slip: Closed dan Cancelled terkunci.
 */
export async function setSlipAttachmentPrint(
  attachmentId: string,
  printContent: boolean,
  userId: string
): Promise<{ slipId: string; attachments: SlipAttachment[] }> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.slipFile.findUnique({ where: { id: attachmentId } })
    if (!row) throw new Error("Lampiran tidak ditemukan.")
    const slip = await editableSlip(tx, row.slipId)
    if (row.printContent !== printContent) {
      await tx.slipFile.update({ where: { id: attachmentId }, data: { printContent } })
      await recordAudit(tx, {
        userId,
        entity: "placing_slips",
        entityId: row.slipId,
        action: "Update",
        before: { attachment: row.description ?? row.fileName, printContent: row.printContent },
        after: { attachment: row.description ?? row.fileName, printContent },
        context: { slipNo: slip.slip_no ?? "Draft" },
      })
    }
    return { slipId: row.slipId, attachments: await listAttachments(tx, row.slipId) }
  })
}

/** Hapus satu lampiran beserta isi berkasnya. */
export async function deleteSlipAttachment(
  attachmentId: string,
  userId: string
): Promise<{ slipId: string; attachments: SlipAttachment[] }> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.slipFile.findUnique({ where: { id: attachmentId } })
    if (!row) throw new Error("Lampiran tidak ditemukan.")
    const slip = await editableSlip(tx, row.slipId)
    const count = await tx.slipFile.count({ where: { slipId: row.slipId } })
    await tx.slipFile.delete({ where: { id: attachmentId } })
    await deleteStoredFiles(tx, [row.filePath])
    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: row.slipId,
      action: "Update",
      before: { attachments: count, attachmentRemoved: row.description ?? row.fileName },
      after: { attachments: count - 1 },
      context: { slipNo: slip.slip_no ?? "Draft" },
    })
    return { slipId: row.slipId, attachments: await listAttachments(tx, row.slipId) }
  })
}
