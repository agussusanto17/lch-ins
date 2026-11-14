import "server-only"

import { printKindFor, type AttachmentPrints } from "@/lib/attachment-print"
import { workbookTables } from "@/lib/excel-table"
import { prisma } from "@/lib/prisma"
import { slipFilesOrder } from "@/lib/server/slip-files"
import { readStoredFile, storedFileId } from "@/lib/server/stored-files"

async function bytesOf(data: Uint8Array | ReadableStream) {
  return data instanceof Uint8Array ? data : new Uint8Array(await new Response(data).arrayBuffer())
}

/**
 * Isi lampiran slip yang dicetak di dokumen; jenisnya dari isi berkas saat unggah, bukan nama file.
 * Excel diurai di server menjadi tabel; gambar dan PDF dibuka browser lewat /api/files.
 */
export async function slipAttachmentPrints(slipId: string): Promise<AttachmentPrints> {
  const rows = await prisma.slipFile.findMany({
    where: { slipId, printContent: true },
    orderBy: slipFilesOrder,
    select: { id: true, filePath: true },
  })
  const fileIds = rows.map((r) => storedFileId(r.filePath)).filter((id): id is string => Boolean(id))
  if (!fileIds.length) return {}
  const files = await prisma.storedFile.findMany({
    where: { id: { in: fileIds } },
    select: { id: true, contentType: true },
  })
  const typeOf = new Map(files.map((f) => [f.id, f.contentType]))

  const prints: AttachmentPrints = {}
  for (const row of rows) {
    const fileId = storedFileId(row.filePath)
    const kind = fileId ? printKindFor(typeOf.get(fileId) ?? "") : null
    if (!fileId || !kind) continue
    if (kind !== "excel") {
      prints[row.id] = { kind }
      continue
    }
    try {
      const file = await readStoredFile(fileId)
      if (!file) throw new Error("Berkas tidak ditemukan.")
      prints[row.id] = { kind, sheets: await workbookTables(await bytesOf(file.data)) }
    } catch (error) {
      console.error("Gagal membaca lampiran Excel untuk cetak:", row.id, error)
      prints[row.id] = { kind, error: "Isi Excel tidak bisa dibaca. Buka lampirannya terpisah." }
    }
  }
  return prints
}
