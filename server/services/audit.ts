import type { AuditAction, Prisma } from "@/lib/generated/prisma/client"

/**
 * Audit trail (PRD A-03): setiap tambah, ubah, hapus, release, dan batal
 * tercatat siapa, kapan, dan data apa yang berubah.
 *
 * Panggil di transaksi yang sama dengan perubahan datanya. Error tidak
 * ditelan: kalau audit gagal tercatat, perubahan datanya ikut dibatalkan,
 * supaya tidak ada perubahan yang lolos tanpa jejak.
 *
 *   await prisma.$transaction(async (tx) => {
 *     const before = await tx.client.findUniqueOrThrow({ where: { id } })
 *     const after = await tx.client.update({ where: { id }, data })
 *     await recordAudit(tx, {
 *       userId, entity: "clients", entityId: id, action: "Update", before, after,
 *     })
 *   })
 */

type Snapshot = Record<string, unknown> | null | undefined

export interface AuditEntry {
  userId: string
  /** Nama tabel, misalnya "placing_slips". */
  entity: string
  entityId: string
  action: AuditAction
  before?: Snapshot
  after?: Snapshot
}

/** Kolom teknis yang tidak perlu masuk catatan perubahan. */
const IGNORED_FIELDS = new Set(["updatedAt", "createdAt"])

/** Ubah ke nilai JSON biasa: Decimal jadi string, Date jadi ISO. */
function toJson(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) return null
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/**
 * Hanya kolom yang berubah yang disimpan, dalam bentuk
 * { kolom: { before, after } }. Untuk create dan delete seluruh isi baris
 * disimpan di sisi yang ada.
 */
export function diffChanges(before: Snapshot, after: Snapshot) {
  const a = (toJson(before) ?? {}) as Record<string, unknown>
  const b = (toJson(after) ?? {}) as Record<string, unknown>
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const changes: Record<string, { before: unknown; after: unknown }> = {}
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue
    if (JSON.stringify(a[key]) === JSON.stringify(b[key])) continue
    changes[key] = { before: a[key] ?? null, after: b[key] ?? null }
  }
  return changes
}

export async function recordAudit(
  tx: Prisma.TransactionClient,
  entry: AuditEntry
) {
  const changes = diffChanges(entry.before, entry.after)
  return tx.auditLog.create({
    data: {
      userId: entry.userId,
      entity: entry.entity,
      entityId: entry.entityId,
      action: entry.action,
      changes: Object.keys(changes).length
        ? (changes as Prisma.InputJsonValue)
        : undefined,
    },
  })
}
