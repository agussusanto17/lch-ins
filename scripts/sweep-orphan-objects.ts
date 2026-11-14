/**
 * Hapus objek bucket tanpa baris stored_files; objek di bawah satu jam dilewati (masih diunggah).
 * Tanpa --apply hanya menampilkan daftar.
 *
 *   node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env \
 *     scripts/sweep-orphan-objects.ts [--apply]
 */
import { prisma } from "../lib/prisma"
import {
  deleteObjects,
  listObjects,
  objectStorageEnabled,
} from "../lib/server/object-storage"

const MIN_AGE_MS = 60 * 60 * 1000

async function main() {
  const apply = process.argv.includes("--apply")
  if (!objectStorageEnabled()) {
    throw new Error("Env S3_* belum lengkap, object storage tidak aktif.")
  }

  const objects = await listObjects()
  const rows = await prisma.storedFile.findMany({
    where: { storageKey: { not: null } },
    select: { storageKey: true },
  })
  const used = new Set(rows.map((r) => r.storageKey))
  const cutoff = Date.now() - MIN_AGE_MS
  const orphans = objects.filter(
    (o) => !used.has(o.key) && (o.lastModified?.getTime() ?? 0) < cutoff
  )

  console.log(`${objects.length} objek di bucket, ${rows.length} dipakai, ${orphans.length} yatim.`)
  for (const o of orphans) console.log(`  ${o.key}`)

  const missing = rows.filter((r) => !objects.some((o) => o.key === r.storageKey))
  if (missing.length) {
    console.warn(`PERINGATAN: ${missing.length} baris menunjuk objek yang tidak ada:`)
    for (const r of missing) console.warn(`  ${r.storageKey}`)
  }

  if (apply && orphans.length) {
    await deleteObjects(orphans.map((o) => o.key))
    console.log(`${orphans.length} objek yatim dihapus.`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
