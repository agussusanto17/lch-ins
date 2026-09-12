import {
  boolean,
  date,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { insurers } from "./master"
import { users } from "./system"
import { clients } from "./underwriting"

/**
 * 1. CHART OF ACCOUNTS (COA)
 * Daftar akun standar akuntansi pialang asuransi bertingkat
 */
export const coaAccounts = pgTable("coa_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // contoh: 1110, 1130, 2110, 4110
  name: text("name").notNull(),
  accountTypeId: uuid("account_type_id").notNull(), // lookup account_type: Asset, Liability, Equity, Revenue, Expense
  parentId: uuid("parent_id"), // self-reference akun induk
  isControl: boolean("is_control").default(false).notNull(), // true = akun kontrol sub-ledger
  ojkReportLineId: uuid("ojk_report_line_id"), // lookup baris laporan OJK
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 2. JOURNAL ENTRIES
 * Header jurnal transaksi (otomatis terbentuk dari DN, CN, Payment, atau Manual)
 */
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  journalNo: text("journal_no").notNull().unique(), // nomor voucher jurnal
  journalDate: date("journal_date").notNull(),
  description: text("description").notNull(),
  sourceType: text("source_type").default("manual").notNull(), // manual, debit_note, credit_note, payment
  sourceId: uuid("source_id"), // ID dokumen asal transaksi
  status: text("status").default("draft").notNull(), // draft, posted, void
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 3. JOURNAL LINES
 * Baris rincian debit & kredit beserta penanda sub-ledger klien / asuransi
 */
export const journalLines = pgTable("journal_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  journalEntryId: uuid("journal_entry_id")
    .references(() => journalEntries.id, { onDelete: "cascade" })
    .notNull(),
  accountId: uuid("account_id")
    .references(() => coaAccounts.id, { onDelete: "restrict" })
    .notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }), // sub-ledger piutang
  insurerId: uuid("insurer_id").references(() => insurers.id, { onDelete: "set null" }), // sub-ledger hutang
  debit: numeric("debit", { precision: 18, scale: 2 }).default("0").notNull(), // selalu dalam IDR
  credit: numeric("credit", { precision: 18, scale: 2 }).default("0").notNull(), // selalu dalam IDR
  memo: text("memo"),
})
