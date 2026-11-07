import "server-only"

import { INLINE_TYPES, XLSX_TYPE, detectContentType } from "@/lib/file-types"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { MAX_UPLOAD_BYTES } from "@/lib/uploads"

type Tx = Prisma.TransactionClient

/** Pemakaian berkas. Menentukan menu yang hak aksesnya dipakai saat dibuka. */
export type FilePurpose =
  | "client_document"
  | "claim_document"
  | "policy_file"
  | "slip_attachment"

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
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ukuran file maksimal 4 MB.")
  }

  const data = new Uint8Array(await file.arrayBuffer())
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

  return prisma.storedFile.create({
    data: {
      fileName: cleanFileName(file.name),
      contentType,
      sizeBytes: data.byteLength,
      data,
      purpose,
      uploadedBy: userId,
    },
    select: { id: true, fileName: true },
  })
}

export async function readStoredFile(id: string) {
  if (!UUID_RE.test(id)) return null
  return prisma.storedFile.findUnique({
    where: { id },
    select: {
      fileName: true,
      contentType: true,
      sizeBytes: true,
      data: true,
      purpose: true,
    },
  })
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

/** Hapus isi berkas yang tidak dipakai lagi. Path data contoh dilewati. */
export async function deleteStoredFiles(
  tx: Tx,
  filePaths: (string | null | undefined)[]
) {
  const ids = filePaths
    .map(storedFileId)
    .filter((id): id is string => id != null)
  if (ids.length) {
    await tx.storedFile.deleteMany({ where: { id: { in: ids } } })
  }
}
