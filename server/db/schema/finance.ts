import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { currencies, insurers } from "./master"
import { claims, policies } from "./policies"
import { users } from "./system"
import { clients } from "./underwriting"

/**
 * 1. BANK ACCOUNTS
 * Rekening bank LCH dengan pemisahan rekening dana titipan premi (Escrow) vs operasional
 */
export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  bankId: uuid("bank_id").notNull(), // lookup bank: BCA, OCBC NISP, dll.
  accountNo: text("account_no").notNull(),
  accountName: text("account_name").notNull(),
  currencyCode: text("currency_code")
    .references(() => currencies.code, { onDelete: "restrict" })
    .default("IDR")
    .notNull(),
  isPremiumTrust: boolean("is_premium_trust").default(false).notNull(), // true = Rekening Titipan Premi
  coaAccountId: uuid("coa_account_id"), // tersambung ke chart of accounts
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 2. DEBIT NOTES
 * Tagihan premi resmi dari LCH ke Klien (format: 0000/DNLCH/MM/YYYY)
 */
export const debitNotes = pgTable("debit_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  dnNo: text("dn_no").notNull().unique(), // contoh: 0125/DNLCH/08/2026
  policyId: uuid("policy_id")
    .references(() => policies.id, { onDelete: "restrict" })
    .notNull(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "restrict" })
    .notNull(),
  insuredName: text("insured_name").notNull(),
  billingAddress: text("billing_address"),
  paymentModelId: uuid("payment_model_id").notNull(), // lookup payment_model: Via LCH vs Langsung Asuransi
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(), // batas waktu PPW
  currencyCode: text("currency_code")
    .references(() => currencies.code, { onDelete: "restrict" })
    .default("IDR")
    .notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 12, scale: 6 }).default("1").notNull(),
  premium: numeric("premium", { precision: 18, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 18, scale: 2 }).default("0").notNull(),
  policyCost: numeric("policy_cost", { precision: 18, scale: 2 }).default("0").notNull(),
  stampDuty: numeric("stamp_duty", { precision: 18, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 18, scale: 2 }).notNull(), // premium - discount + policyCost + stampDuty + lines
  referenceNo: text("reference_no"),
  lcNo: text("lc_no"),
  etd: date("etd"), // khusus Marine Cargo
  status: text("status").default("draft").notNull(), // draft, issued, cancelled
  issuedBy: uuid("issued_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 3. DEBIT NOTE LINES
 * Baris penyesuaian tambahan (plus / minus) pada Debit Note
 */
export const debitNoteLines = pgTable("debit_note_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  debitNoteId: uuid("debit_note_id")
    .references(() => debitNotes.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(), // bisa positif atau negatif
  sortOrder: integer("sort_order").default(0).notNull(),
})

/**
 * 4. CREDIT NOTES
 * Alokasi premi net per penanggung & per termin cicilan (contoh: 0581/CNLCH/08/2026-1)
 */
export const creditNotes = pgTable("credit_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  cnNo: text("cn_no").notNull().unique(), // nomor bertingkat per cicilan
  debitNoteId: uuid("debit_note_id")
    .references(() => debitNotes.id, { onDelete: "cascade" })
    .notNull(),
  insurerId: uuid("insurer_id")
    .references(() => insurers.id, { onDelete: "restrict" })
    .notNull(),
  sharePct: numeric("share_pct", { precision: 6, scale: 2 }).notNull(),
  instalmentNo: integer("instalment_no").default(1).notNull(),
  instalmentCount: integer("instalment_count").default(1).notNull(),
  dueDate: date("due_date").notNull(),
  currencyCode: text("currency_code")
    .references(() => currencies.code, { onDelete: "restrict" })
    .default("IDR")
    .notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 12, scale: 6 }).default("1").notNull(),
  grossPremium: numeric("gross_premium", { precision: 18, scale: 2 }).notNull(),
  brokerageAmount: numeric("brokerage_amount", { precision: 18, scale: 2 }).notNull(),
  ppnAmount: numeric("ppn_amount", { precision: 18, scale: 2 }).default("0").notNull(),
  pph23Amount: numeric("pph23_amount", { precision: 18, scale: 2 }).default("0").notNull(),
  netAmount: numeric("net_amount", { precision: 18, scale: 2 }).notNull(), // grossPremium - brokerageAmount
  status: text("status").default("draft").notNull(), // draft, issued, cancelled
  issuedBy: uuid("issued_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 5. PAYMENTS
 * Pencatatan transaksi arus kas: penerimaan premi, setoran premi ke asuransi, brokerage, klaim
 */
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentTypeId: uuid("payment_type_id").notNull(), // lookup payment_type: terima_premi, setor_premi, terima_brokerage, terima_klaim, bayar_klaim
  debitNoteId: uuid("debit_note_id").references(() => debitNotes.id, { onDelete: "set null" }),
  creditNoteId: uuid("credit_note_id").references(() => creditNotes.id, { onDelete: "set null" }),
  claimId: uuid("claim_id").references(() => claims.id, { onDelete: "set null" }),
  bankAccountId: uuid("bank_account_id")
    .references(() => bankAccounts.id, { onDelete: "restrict" })
    .notNull(),
  paymentDate: date("payment_date").notNull(),
  currencyCode: text("currency_code")
    .references(() => currencies.code, { onDelete: "restrict" })
    .default("IDR")
    .notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 12, scale: 6 }).default("1").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  bankReference: text("bank_reference"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
