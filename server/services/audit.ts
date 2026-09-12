import { db } from "@/server/db"
import { auditLogs } from "@/server/db/schema"

export interface RecordAuditOptions {
  userId?: string | null
  entity: string
  entityId: string
  action: "create" | "update" | "delete" | "release" | "cancel"
  changes?: Record<string, unknown> | null
}

/**
 * Mencatat riwayat mutasi data ke tabel audit_logs
 */
export async function recordAuditLog(options: RecordAuditOptions, customDb = db) {
  try {
    await customDb.insert(auditLogs).values({
      userId: options.userId ?? null,
      entity: options.entity,
      entityId: options.entityId,
      action: options.action,
      changes: options.changes ?? null,
    })
  } catch (error) {
    // Audit logging sebaiknya tidak menggagalkan transaksi utama, tapi dicatat di error log
    console.error("[AUDIT_LOG_ERROR] Gagal mencatat audit log:", error)
  }
}
