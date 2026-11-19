import "server-only"

import {
  sameSignatoryName,
  sortSignatories,
  type DocumentSignatory,
} from "@/lib/document-signatories"
import type { DocumentSignatory as SignatoryRow, Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import {
  assertClaimableFile,
  deleteStoredFiles,
  storedFilePath,
  storedFileUrl,
} from "@/lib/server/stored-files"
import { recordAudit } from "@/server/services/audit"

/*
 * Tanda tangan dan cap LCH untuk cetak dokumen penutupan. Gambarnya di stored_files (purpose
 * signature), jadi di VPS tetap di object storage. Selalu ada satu default selama daftarnya
 * tidak kosong, karena halaman cetak memilihnya otomatis.
 */

type Tx = Prisma.TransactionClient

const ENTITY = "document_signatories"

function toRecord(row: SignatoryRow): DocumentSignatory {
  return {
    id: row.id,
    name: row.name,
    fileName: row.fileName,
    isDefault: row.isDefault,
    imageUrl: storedFileUrl(row.filePath) ?? null,
  }
}

/** Isi audit: nama, nama file gambar, dan default; path berkas tidak berguna dibaca orang. */
function snapshot(row: SignatoryRow) {
  return { name: row.name, image: row.fileName, isDefault: row.isDefault }
}

export async function listDocumentSignatories(): Promise<DocumentSignatory[]> {
  const rows = await prisma.documentSignatory.findMany()
  return sortSignatories(rows.map(toRecord))
}

async function assertUniqueName(tx: Tx, name: string, exceptId?: string) {
  const rows = await tx.documentSignatory.findMany({ select: { id: true, name: true } })
  if (rows.some((r) => r.id !== exceptId && sameSignatoryName(r.name, name))) {
    throw new Error(`Tanda tangan atas nama ${name} sudah ada.`)
  }
}

/** Berkas gambar yang baru diunggah pengguna ini untuk tanda tangan. */
async function claimImage(tx: Tx, fileId: string, userId: string) {
  await assertClaimableFile(tx, fileId, "signature", userId)
  const stored = await tx.storedFile.findUniqueOrThrow({
    where: { id: fileId },
    select: { fileName: true },
  })
  return { fileName: stored.fileName, filePath: storedFilePath(fileId) }
}

/** Lepas default lama, dengan jejak audit per baris yang berubah. */
async function clearDefault(tx: Tx, userId: string) {
  const current = await tx.documentSignatory.findMany({ where: { isDefault: true } })
  if (!current.length) return
  await tx.documentSignatory.updateMany({
    where: { id: { in: current.map((r) => r.id) } },
    data: { isDefault: false },
  })
  for (const row of current) {
    await recordAudit(tx, {
      userId,
      entity: ENTITY,
      entityId: row.id,
      action: "Update",
      before: { isDefault: true },
      after: { isDefault: false },
      context: { name: row.name },
    })
  }
}

export async function createDocumentSignatory(
  input: { name: string; fileId: string; isDefault: boolean },
  userId: string
) {
  await prisma.$transaction(async (tx) => {
    const name = input.name.trim()
    await assertUniqueName(tx, name)
    const image = await claimImage(tx, input.fileId, userId)
    // Tanda tangan pertama selalu default, supaya halaman cetak punya pilihan awal.
    const isDefault = input.isDefault || (await tx.documentSignatory.count()) === 0
    if (isDefault) await clearDefault(tx, userId)
    const created = await tx.documentSignatory.create({
      data: { name, ...image, isDefault },
    })
    await recordAudit(tx, {
      userId,
      entity: ENTITY,
      entityId: created.id,
      action: "Create",
      after: snapshot(created),
    })
  })
}

/** Ubah nama dan, bila ada `fileId`, ganti gambarnya; gambar lama dihapus. */
export async function updateDocumentSignatory(
  id: string,
  input: { name: string; fileId?: string | null },
  userId: string
) {
  await prisma.$transaction(async (tx) => {
    const before = await tx.documentSignatory.findUnique({ where: { id } })
    if (!before) throw new Error("Tanda tangan tidak ditemukan.")
    const name = input.name.trim()
    await assertUniqueName(tx, name, id)
    const image = input.fileId ? await claimImage(tx, input.fileId, userId) : {}
    const updated = await tx.documentSignatory.update({
      where: { id },
      data: { name, ...image },
    })
    if (input.fileId) await deleteStoredFiles(tx, [before.filePath])
    await recordAudit(tx, {
      userId,
      entity: ENTITY,
      entityId: id,
      action: "Update",
      before: snapshot(before),
      after: snapshot(updated),
      context: { name: updated.name },
    })
  })
}

export async function setDefaultDocumentSignatory(id: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    const row = await tx.documentSignatory.findUnique({ where: { id } })
    if (!row) throw new Error("Tanda tangan tidak ditemukan.")
    if (row.isDefault) return
    await clearDefault(tx, userId)
    await tx.documentSignatory.update({ where: { id }, data: { isDefault: true } })
    await recordAudit(tx, {
      userId,
      entity: ENTITY,
      entityId: id,
      action: "Update",
      before: { isDefault: false },
      after: { isDefault: true },
      context: { name: row.name },
    })
  })
}

/**
 * Hapus tanda tangan beserta gambarnya. Dokumen tidak menyimpan pilihan tanda tangan, jadi tidak
 * ada data lain yang ikut berubah. Bila yang dihapus default, urutan berikutnya menjadi default.
 */
export async function deleteDocumentSignatory(id: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    const row = await tx.documentSignatory.findUnique({ where: { id } })
    if (!row) throw new Error("Tanda tangan tidak ditemukan.")
    await tx.documentSignatory.delete({ where: { id } })
    await deleteStoredFiles(tx, [row.filePath])
    await recordAudit(tx, {
      userId,
      entity: ENTITY,
      entityId: id,
      action: "Delete",
      before: snapshot(row),
    })
    if (!row.isDefault) return
    const [next] = sortSignatories(await tx.documentSignatory.findMany())
    if (!next) return
    await tx.documentSignatory.update({ where: { id: next.id }, data: { isDefault: true } })
    await recordAudit(tx, {
      userId,
      entity: ENTITY,
      entityId: next.id,
      action: "Update",
      before: { isDefault: false },
      after: { isDefault: true },
      context: { name: next.name },
    })
  })
}
