/**
 * Pindahkan isi berkas lama dari kolom stored_files.data ke object storage.
 *
 * Aman dijalankan berulang: hanya baris yang masih membawa data yang diproses,
 * dan setiap baris diperbarui sendiri-sendiri. Objek ditulis dulu, baru kolom
 * data dikosongkan, jadi berkas tidak pernah tanpa isi.
 *
 *   node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env \
 *     scripts/move-files-to-object-storage.ts [--dry-run]
 */
import { prisma } from "../lib/prisma"
import { objectStorageEnabled, putObject } from "../lib/server/object-storage"
import { objectKey } from "../lib/server/stored-files"

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  if (!objectStorageEnabled()) {
    throw new Error("Env S3_* belum lengkap, object storage tidak aktif.")
  }

  const pending = await prisma.storedFile.findMany({
    where: { storageKey: null },
    select: { id: true, purpose: true, sizeBytes: true },
    orderBy: { createdAt: "asc" },
  })
  console.log(`${pending.length} berkas masih di database.`)
  if (dryRun) return

  let moved = 0
  for (const { id, purpose } of pending) {
    const row = await prisma.storedFile.findUnique({
      where: { id },
      select: { data: true, contentType: true, storageKey: true },
    })
    if (!row?.data || row.storageKey) continue

    const key = objectKey(purpose, id)
    await putObject(key, row.data, row.contentType)
    await prisma.storedFile.update({
      where: { id },
      data: { storageKey: key, data: null },
    })
    moved++
    console.log(`  ${key}`)
  }
  console.log(`${moved} berkas dipindah ke object storage.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
