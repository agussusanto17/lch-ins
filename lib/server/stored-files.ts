import "server-only"

import { randomUUID } from "node:crypto"

import { after } from "next/server"

import { INLINE_TYPES, XLSX_TYPE, detectContentType } from "@/lib/file-types"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import {
  deleteObjects,
  getObjectStream,
  isObjectStorageRequired,
  objectStorageEnabled,
  putObject,
} from "@/lib/server/object-storage"
import { maxUploadBytes, sizeLimitMessage, type FilePurpose } from "@/lib/uploads"

export type { FilePurpose }

type Tx = Prisma.TransactionClient

const PURPOSE_MENU: Record<FilePurpose, string> = {
  client_document: "/marketing",
  claim_document: "/claims",
  policy_file: "/policies",
  slip_attachment: "/underwriting",
}

/**
 * Jenis berkas yang diterima per pemakaian. Lampiran slip boleh Excel, karena
 * vessel schedule dan daftar unit LCH biasanya berupa workbook.
 */
const ALLOWED_TYPES: Record<FilePurpose, string[]> = {
  client_document: INLINE_TYPES,
  claim_document: INLINE_TYPES,
  policy_file: INLINE_TYPES,
  slip_attachment: [...INLINE_TYPES, XLSX_TYPE],
}

/** Berkas yang aman dibuka di tab browser; jenis lain diunduh. */
export function opensInline(contentType: string) {
  return INLINE_TYPES.includes(contentType)
}

const PATH_PREFIX = "stored_files/"
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function storedFilePath(id: string) {
  return `${PATH_PREFIX}${id}`
}

/** Id stored_files dari file_path. Null untuk path data contoh dan blob URL lama. */
export function storedFileId(filePath: string | null | undefined) {
  if (!filePath?.startsWith(PATH_PREFIX)) return null
  const id = filePath.slice(PATH_PREFIX.length)
  return UUID_RE.test(id) ? id : null
}

/** Alamat untuk membuka isi berkas, atau undefined bila isinya tidak tersimpan. */
export function storedFileUrl(filePath: string | null | undefined) {
  const id = storedFileId(filePath)
  return id ? `/api/files/${id}` : undefined
}

export function purposeMenu(purpose: string) {
  return purpose in PURPOSE_MENU ? PURPOSE_MENU[purpose as FilePurpose] : null
}

/** Nama file tanpa folder dan karakter kontrol. */
function cleanFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? ""
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim()
  return (cleaned || "berkas").slice(0, 200)
}

export async function saveUploadedFile(
  file: File,
  purpose: FilePurpose,
  userId: string
) {
  if (file.size === 0) throw new Error("File kosong.")
  if (file.size > maxUploadBytes(purpose)) {
    throw new Error(sizeLimitMessage(maxUploadBytes(purpose)))
  }
  return saveUploadedBytes({
    data: new Uint8Array(await file.arrayBuffer()),
    fileName: file.name,
    purpose,
    userId,
  })
}

/**
 * Simpan isi berkas yang sudah ada di memori, misalnya hasil gabungan potongan
 * unggahan besar. Pemeriksaannya sama dengan saveUploadedFile.
 */
export async function saveUploadedBytes({
  data,
  fileName,
  purpose,
  userId,
}: {
  data: Uint8Array<ArrayBuffer>
  fileName: string
  purpose: FilePurpose
  userId: string
}) {
  if (data.byteLength === 0) throw new Error("File kosong.")
  if (data.byteLength > maxUploadBytes(purpose)) {
    throw new Error(sizeLimitMessage(maxUploadBytes(purpose)))
  }

  // Jenis dibaca dari isi file. Hanya jenis yang tidak bisa menjalankan skrip
  // yang diterima, karena berkas dibuka dari domain aplikasi.
  const contentType = detectContentType(data)
  if (!contentType || !ALLOWED_TYPES[purpose].includes(contentType)) {
    throw new Error(
      purpose === "slip_attachment"
        ? "Hanya PDF, JPG, PNG, WebP, atau Excel (.xlsx) yang bisa diunggah."
        : "Hanya PDF, JPG, PNG, atau WebP yang bisa diunggah."
    )
  }

  const meta = {
    fileName: cleanFileName(fileName),
    contentType,
    sizeBytes: data.byteLength,
    purpose,
    uploadedBy: userId,
  }
  const select = { id: true, fileName: true } as const

  // Tanpa object storage (demo Vercel), isi tetap di database.
  if (!objectStorageEnabled()) {
    if (isObjectStorageRequired()) {
      throw new Error(
        "Penyimpanan berkas (object storage) wajib aktif di lingkungan ini, namun belum terkonfigurasi atau tidak dapat diakses."
      )
    }
    return prisma.storedFile.create({ data: { ...meta, data }, select })
  }

  // Objek ditulis dulu, baru barisnya. Kalau baris gagal dibuat, objeknya
  // dihapus lagi supaya bucket tidak berisi berkas tanpa pemilik.
  const id = randomUUID()
  const storageKey = objectKey(purpose, id)
  await putObject(storageKey, data, contentType)
  try {
    return await prisma.storedFile.create({
      data: { ...meta, id, storageKey },
      select,
    })
  } catch (error) {
    await deleteObjects([storageKey]).catch(() => undefined)
    throw error
  }
}

/** Key objek di bucket. Folder per pemakaian supaya mudah ditelusuri di console. */
export function objectKey(purpose: string, id: string) {
  return `${purpose}/${id}`
}

export async function readStoredFile(id: string) {
  if (!UUID_RE.test(id)) return null
  const file = await prisma.storedFile.findUnique({
    where: { id },
    select: {
      fileName: true,
      contentType: true,
      sizeBytes: true,
      data: true,
      storageKey: true,
      purpose: true,
    },
  })
  if (!file) return null

  const { data, storageKey, ...meta } = file
  if (!storageKey) return data ? { ...meta, data: new Uint8Array(data) } : null
  try {
    return { ...meta, data: await getObjectStream(storageKey) }
  } catch (error) {
    // Baris ada tapi objeknya hilang: perlakukan seperti berkas tidak ada,
    // tapi catat supaya terlihat di log server.
    if (
      (error instanceof Error && error.name === "NoSuchKey") ||
      (typeof error === "object" &&
        error !== null &&
        (error as { name?: string }).name === "NoSuchKey")
    ) {
      console.error(`Objek berkas ${storageKey} tidak ada di bucket.`)
      return null
    }
    throw error
  }
}

/**
 * Pastikan berkas yang akan ditautkan memang hasil unggahan pengguna ini untuk
 * pemakaian yang sama. Mencegah id berkas orang lain ditempel ke data lain.
 */
export async function assertClaimableFile(
  tx: Tx,
  fileId: string,
  purpose: FilePurpose,
  userId: string
) {
  const file = UUID_RE.test(fileId)
    ? await tx.storedFile.findUnique({
        where: { id: fileId },
        select: { purpose: true, uploadedBy: true },
      })
    : null
  if (!file || file.purpose !== purpose || file.uploadedBy !== userId) {
    throw new Error("Berkas unggahan tidak ditemukan. Pilih ulang filenya.")
  }
}

/**
 * Hapus berkas yang tidak dipakai lagi. Path data contoh dilewati.
 *
 * Baris dihapus di dalam transaksi pemanggil. Objeknya baru dihapus setelah
 * response terkirim, saat transaksi sudah selesai, dan hanya bila barisnya
 * memang sudah tidak ada. Jadi kalau transaksi batal, berkas tidak ikut hilang.
 */
export async function deleteStoredFiles(
  tx: Tx,
  filePaths: (string | null | undefined)[]
) {
  const ids = filePaths
    .map(storedFileId)
    .filter((id): id is string => id != null)
  if (!ids.length) return

  const rows = await tx.storedFile.findMany({
    where: { id: { in: ids }, storageKey: { not: null } },
    select: { storageKey: true },
  })
  await tx.storedFile.deleteMany({ where: { id: { in: ids } } })
  scheduleObjectCleanup(rows.map((r) => r.storageKey!))
}

/** Hapus satu berkas yang belum sempat ditautkan ke data mana pun. */
export async function discardStoredFile(id: string) {
  const row = await prisma.storedFile
    .delete({ where: { id }, select: { storageKey: true } })
    .catch(() => null)
  if (row?.storageKey) {
    await deleteObjects([row.storageKey]).catch((error) =>
      console.error(`Gagal menghapus objek ${row.storageKey}:`, error)
    )
  }
}

function scheduleObjectCleanup(keys: string[]) {
  if (!keys.length) return
  const run = () =>
    removeOrphanObjects(keys).catch((error) =>
      console.error("Gagal menghapus objek berkas:", keys, error)
    )
  try {
    after(run)
  } catch {
    // Di luar request (skrip), tidak ada titik "setelah transaksi selesai".
    // Objeknya dibiarkan dan dibersihkan scripts/sweep-orphan-objects.ts.
    console.warn("Objek berkas belum dihapus dari bucket:", keys)
  }
}

/** Hapus objek yang barisnya sudah tidak ada di stored_files. */
async function removeOrphanObjects(keys: string[]) {
  const stillUsed = await prisma.storedFile.findMany({
    where: { storageKey: { in: keys } },
    select: { storageKey: true },
  })
  const used = new Set(stillUsed.map((r) => r.storageKey))
  await deleteObjects(keys.filter((key) => !used.has(key)))
}
