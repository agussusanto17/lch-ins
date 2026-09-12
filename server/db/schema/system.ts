import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

/**
 * 1. USERS
 * Pengguna sistem internal LCH (5 role: Admin, Marketing, Placement/Teknik, Klaim, Finance)
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  roleId: uuid("role_id").notNull(), // lookup role
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 2. AUDIT LOGS
 * Setiap aksi tambah, ubah, hapus, release, dan batal tercatat di sini
 */
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  entity: text("entity").notNull(), // nama tabel (misal: placing_slips, debit_notes)
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(), // create, update, delete, release, cancel
  changes: jsonb("changes"), // { before: {...}, after: {...} }
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 3. COMPANY PROFILE
 * Profil PT. LCH Insurance Brokers untuk kop surat & legalitas
 */
export const companyProfile = pgTable("company_profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  email: text("email"),
  skojkNo: text("skojk_no"), // KEP-46/NB.1/2016
  apparindoNo: text("apparindo_no"), // 237-2016
  logoPath: text("logo_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 4. DOCUMENT TYPES
 * Definisi pola penomoran dokumen resmi LCH
 * Kode: PS, QS, CVN, CI, DN, CN, CLM, JV
 */
export const documentTypes = pgTable("document_types", {
  code: text("code").primaryKey(), // PS, QS, CVN, CI, DN, CN, CLM, JV
  name: text("name").notNull(),
  numberPattern: text("number_pattern").notNull(), // {seq:4}/DNLCH/{MM}/{YYYY}
  resetPeriodId: uuid("reset_period_id").notNull(), // lookup reset_period (monthly, yearly, continuous)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 5. NUMBER COUNTERS
 * Counter nomor urut per jenis dokumen dan periode untuk lock concurrency (SELECT FOR UPDATE)
 */
export const numberCounters = pgTable(
  "number_counters",
  {
    documentTypeCode: text("document_type_code")
      .references(() => documentTypes.code, { onDelete: "cascade" })
      .notNull(),
    period: text("period").notNull(), // contoh '2026-08' atau '2026' atau 'ALL'
    lastNumber: integer("last_number").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.documentTypeCode, table.period] }),
  ]
)
