import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import {
  biScales,
  classesOfBusiness,
  clauses,
  coverTypes,
  currencies,
  insurers,
  occupations,
  wordingForms,
} from "./master"
import { users } from "./system"

/**
 * 1. CLIENTS
 * Data klien tertanggung sesuai form KYC LCH
 */
export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientTypeId: uuid("client_type_id").notNull(), // lookup client_type: Perorangan, Korporasi
  name: text("name").notNull(),
  npwp: text("npwp"),
  idTypeId: uuid("id_type_id"), // lookup id_type: KTP, SIM, Paspor
  idNumber: text("id_number"),
  birthPlace: text("birth_place"),
  birthDate: date("birth_date"),
  contactPerson: text("contact_person"),
  contactPersonIdNumber: text("contact_person_id_number"),
  email: text("email"),
  phone: text("phone"),
  incomeSourceId: uuid("income_source_id"), // lookup income_source
  insurancePurposeId: uuid("insurance_purpose_id"), // lookup insurance_purpose
  insurancePurposeNote: text("insurance_purpose_note"),
  kycDate: date("kyc_date"),
  cobId: uuid("cob_id").references(() => classesOfBusiness.id, { onDelete: "set null" }),
  statusId: uuid("status_id").notNull(), // lookup client_status: Prospect, Active, Inactive
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 2. CLIENT ADDRESSES
 * Klien bisa punya beberapa alamat (Alamat Perusahaan, Korespondensi, Penagihan)
 */
export const clientAddresses = pgTable("client_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  addressTypeId: uuid("address_type_id").notNull(), // lookup address_type
  address: text("address").notNull(),
  phone: text("phone"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 3. CLIENT DOCUMENTS
 * Berkas KYC yang diunggah (KTP, NPWP, Form KYC)
 */
export const clientDocuments = pgTable("client_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  documentTypeId: uuid("document_type_id").notNull(), // lookup client_document_type
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 4. SPPA
 * Surat Permintaan Penutupan Asuransi dari Klien
 */
export const sppa = pgTable("sppa", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  cobId: uuid("cob_id")
    .references(() => classesOfBusiness.id, { onDelete: "restrict" })
    .notNull(),
  coverTypeId: uuid("cover_type_id").references(() => coverTypes.id, { onDelete: "set null" }),
  insuredName: text("insured_name").notNull(),
  riskLocation: text("risk_location"),
  occupationId: uuid("occupation_id").references(() => occupations.id, { onDelete: "set null" }),
  currencyCode: text("currency_code")
    .references(() => currencies.code, { onDelete: "restrict" })
    .default("IDR")
    .notNull(),
  sumInsured: numeric("sum_insured", { precision: 18, scale: 2 }),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  answers: jsonb("answers"), // Isian fleksibel per COB
  status: text("status").default("draft").notNull(), // draft, submitted
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 5. PLACING SLIPS
 * Inti dokumen penawaran teknis underwriting
 */
export const placingSlips = pgTable("placing_slips", {
  id: uuid("id").defaultRandom().primaryKey(),
  slipNo: text("slip_no").unique(), // Terisi saat release, contoh 001/LCH-PLCMT/PS-PAREQ/VIII/2026
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  sppaId: uuid("sppa_id").references(() => sppa.id, { onDelete: "set null" }),
  cobId: uuid("cob_id")
    .references(() => classesOfBusiness.id, { onDelete: "restrict" })
    .notNull(),
  coverTypeId: uuid("cover_type_id").references(() => coverTypes.id, { onDelete: "set null" }),
  insuredName: text("insured_name").notNull(), // Salinan dari klien, bisa diedit
  correspondenceAddress: text("correspondence_address"),
  currencyCode: text("currency_code")
    .references(() => currencies.code, { onDelete: "restrict" })
    .default("IDR")
    .notNull(),
  status: text("status").default("draft").notNull(), // draft, released, quoted, closed, cancelled
  periodTba: boolean("period_tba").default(false).notNull(),
  inceptionDate: date("inception_date"),
  expiryDate: date("expiry_date"),
  occupationId: uuid("occupation_id").references(() => occupations.id, { onDelete: "set null" }),
  riskLocation: text("risk_location"),
  coverage: text("coverage"),
  constructionClassId: uuid("construction_class_id"), // lookup construction_class: K1, K2, K3
  indemnityMonths: integer("indemnity_months").references(() => biScales.indemnityMonths, {
    onDelete: "set null",
  }),
  interestSection1: text("interest_section1"),
  interestSection2: text("interest_section2"),
  specialConditions: text("special_conditions"),
  discountPct: numeric("discount_pct", { precision: 12, scale: 6 }).default("0").notNull(),
  adminCost: numeric("admin_cost", { precision: 18, scale: 2 }).default("0").notNull(),
  stampDuty: numeric("stamp_duty", { precision: 18, scale: 2 }).default("0").notNull(),
  brokeragePct: numeric("brokerage_pct", { precision: 12, scale: 6 }).default("0").notNull(),
  includeVat: boolean("include_vat").default(true).notNull(),
  subjectivity: text("subjectivity"),
  quotationNo: text("quotation_no").unique(),
  coverNoteNo: text("cover_note_no").unique(),
  coverNoteRemarks: text("cover_note_remarks"),
  closingNo: text("closing_no").unique(),
  closingInstruction: text("closing_instruction"),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  releasedBy: uuid("released_by").references(() => users.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 6. SLIP ITEMS
 * Item kepentingan pertanggungan (interest), section 1/2, dan deductible
 */
export const slipItems = pgTable("slip_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  slipId: uuid("slip_id")
    .references(() => placingSlips.id, { onDelete: "cascade" })
    .notNull(),
  kind: text("kind").notNull(), // interest, sum_insured_s1, sum_insured_s2, deductible_s1, deductible_s2
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }), // null untuk deductible deskriptif
  sortOrder: integer("sort_order").default(0).notNull(),
})

/**
 * 7. SLIP RATE LINES
 * Baris kalkulasi premi & tarif (FLEXAS, EQVET, TPL, PA)
 */
export const slipRateLines = pgTable("slip_rate_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  slipId: uuid("slip_id")
    .references(() => placingSlips.id, { onDelete: "cascade" })
    .notNull(),
  kindId: uuid("kind_id").notNull(), // lookup rate_line_kind: rate, tpl, pa
  label: text("label").notNull(),
  limitAmount: numeric("limit_amount", { precision: 18, scale: 2 }), // untuk TPL dan PA
  rate: numeric("rate", { precision: 12, scale: 6 }),
  premium: numeric("premium", { precision: 18, scale: 2 }).default("0").notNull(),
  rateMin: numeric("rate_min", { precision: 12, scale: 6 }), // batas bawah OJK saat input
  rateMax: numeric("rate_max", { precision: 12, scale: 6 }), // batas atas OJK saat input
  sortOrder: integer("sort_order").default(0).notNull(),
})

/**
 * 8. SLIP SECURITY PANEL
 * Panel ko-asuransi (Leader vs Member share, total harus 100%)
 */
export const slipSecurityPanel = pgTable(
  "slip_security_panel",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slipId: uuid("slip_id")
      .references(() => placingSlips.id, { onDelete: "cascade" })
      .notNull(),
    insurerId: uuid("insurer_id")
      .references(() => insurers.id, { onDelete: "restrict" })
      .notNull(),
    sharePct: numeric("share_pct", { precision: 6, scale: 2 }).notNull(),
    positionId: uuid("position_id").notNull(), // lookup security_role: As Leader, As Member
  },
  (table) => [
    uniqueIndex("slip_security_panel_slip_insurer_idx").on(table.slipId, table.insurerId),
  ]
)

/**
 * 9. SLIP CLAUSES
 * Klausula yang disalin ke slip (bisa diedit tanpa mengubah master)
 */
export const slipClauses = pgTable("slip_clauses", {
  id: uuid("id").defaultRandom().primaryKey(),
  slipId: uuid("slip_id")
    .references(() => placingSlips.id, { onDelete: "cascade" })
    .notNull(),
  clauseId: uuid("clause_id").references(() => clauses.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  wordingHtml: text("wording_html").notNull(),
  isEdited: boolean("is_edited").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
})

/**
 * 10. SLIP WORDING FORMS
 * Hubungan M:N slip ke wording forms
 */
export const slipWordingForms = pgTable(
  "slip_wording_forms",
  {
    slipId: uuid("slip_id")
      .references(() => placingSlips.id, { onDelete: "cascade" })
      .notNull(),
    wordingFormId: uuid("wording_form_id")
      .references(() => wordingForms.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.slipId, table.wordingFormId] }),
  ]
)
