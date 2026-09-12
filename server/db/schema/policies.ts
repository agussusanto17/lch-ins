import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { adjusters, classesOfBusiness, coverTypes, currencies, insurers } from "./master"
import { users } from "./system"
import { clients, placingSlips } from "./underwriting"

/**
 * 1. POLICIES
 * Database polis asuransi yang diterbitkan oleh penanggung
 */
export const policies = pgTable("policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyNo: text("policy_no").notNull().unique(),
  placingSlipId: uuid("placing_slip_id").references(() => placingSlips.id, {
    onDelete: "set null",
  }),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "restrict" })
    .notNull(),
  cobId: uuid("cob_id")
    .references(() => classesOfBusiness.id, { onDelete: "restrict" })
    .notNull(),
  coverTypeId: uuid("cover_type_id").references(() => coverTypes.id, { onDelete: "set null" }),
  insuredName: text("insured_name").notNull(),
  riskLocation: text("risk_location"),
  inceptionDate: date("inception_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  currencyCode: text("currency_code")
    .references(() => currencies.code, { onDelete: "restrict" })
    .default("IDR")
    .notNull(),
  sumInsured: numeric("sum_insured", { precision: 18, scale: 2 }).notNull(),
  premium: numeric("premium", { precision: 18, scale: 2 }).notNull(),
  brokeragePct: numeric("brokerage_pct", { precision: 12, scale: 6 }).notNull(),
  policyTypeId: uuid("policy_type_id").notNull(), // lookup policy_type: Baru, Renewal, Endorsement, Cancellation
  parentPolicyId: uuid("parent_policy_id"), // self-reference polis induk
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 2. POLICY INSURERS
 * Pembagian share penanggung polis (disalin dari slip_security_panel)
 */
export const policyInsurers = pgTable(
  "policy_insurers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    policyId: uuid("policy_id")
      .references(() => policies.id, { onDelete: "cascade" })
      .notNull(),
    insurerId: uuid("insurer_id")
      .references(() => insurers.id, { onDelete: "restrict" })
      .notNull(),
    sharePct: numeric("share_pct", { precision: 6, scale: 2 }).notNull(),
    positionId: uuid("position_id").notNull(), // lookup security_role: As Leader, As Member
  },
  (table) => [
    uniqueIndex("policy_insurers_policy_insurer_idx").on(table.policyId, table.insurerId),
  ]
)

/**
 * 3. POLICY FILES
 * Berkas softcopy polis asli beserta riwayat versi
 */
export const policyFiles = pgTable("policy_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyId: uuid("policy_id")
    .references(() => policies.id, { onDelete: "cascade" })
    .notNull(),
  version: integer("version").default(1).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 4. CLAIMS
 * Manajemen dan pelacakan klaim kerugian nasabah
 */
export const claims = pgTable("claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  claimNo: text("claim_no").notNull().unique(),
  policyId: uuid("policy_id")
    .references(() => policies.id, { onDelete: "restrict" })
    .notNull(),
  adjusterId: uuid("adjuster_id").references(() => adjusters.id, { onDelete: "set null" }),
  lossDate: date("loss_date").notNull(),
  reportedDate: date("reported_date"),
  documentCompleteDate: date("document_complete_date"),
  spkDate: date("spk_date"),
  location: text("location"),
  lossDescription: text("loss_description").notNull(),
  assetDescription: text("asset_description"),
  currencyCode: text("currency_code")
    .references(() => currencies.code, { onDelete: "restrict" })
    .default("IDR")
    .notNull(),
  estimatedLoss: numeric("estimated_loss", { precision: 18, scale: 2 }).default("0").notNull(),
  claimedAmount: numeric("claimed_amount", { precision: 18, scale: 2 }).default("0").notNull(),
  paidAmount: numeric("paid_amount", { precision: 18, scale: 2 }).default("0").notNull(),
  statusId: uuid("status_id").notNull(), // lookup claim_status
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
