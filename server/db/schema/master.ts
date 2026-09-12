import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

/**
 * 1. LOOKUP VALUES
 * Master single-table untuk seluruh pilihan dropdown pendek (DDL)
 */
export const lookupValues = pgTable(
  "lookup_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lookupType: text("lookup_type").notNull(), // role, claim_status, construction_class, etc.
    code: text("code").notNull(), // kode unik untuk logika sistem
    name: text("name").notNull(), // label yang tampil di UI
    sortOrder: integer("sort_order").default(0).notNull(),
    isSystem: boolean("is_system").default(false).notNull(), // nilai bawaan logika tidak boleh dihapus
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("lookup_values_type_code_idx").on(table.lookupType, table.code),
  ]
)

/**
 * 2. CLASSES OF BUSINESS (COB)
 * Lini bisnis resmi LCH (Property, Motor Vehicle, Marine Cargo, dll.)
 */
export const classesOfBusiness = pgTable("classes_of_business", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // kode 2 digit, contoh 01, 03
  name: text("name").notNull(),
  rateModeId: uuid("rate_mode_id").notNull(), // lookup rate_mode: permil vs percent
  formVariantId: uuid("form_variant_id").notNull(), // lookup form_variant: property, motor, standard
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 3. COVER TYPES
 * Tipe jaminan per COB (kode 4 digit dipakai untuk penomoran slip)
 */
export const coverTypes = pgTable("cover_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  cobId: uuid("cob_id")
    .references(() => classesOfBusiness.id, { onDelete: "cascade" })
    .notNull(),
  code: text("code").notNull(), // 4 digit, contoh 0311 Marine Cargo Open Cover
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 4. COB RATE LINES
 * Baris tarif standar default per COB (FLEXAS, EQVET, FWTWD, dll.)
 */
export const cobRateLines = pgTable("cob_rate_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  cobId: uuid("cob_id")
    .references(() => classesOfBusiness.id, { onDelete: "cascade" })
    .notNull(),
  kindId: uuid("kind_id").notNull(), // lookup rate_line_kind: rate, tpl, pa
  label: text("label").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 5. OCCUPATIONS
 * Master kode okupasi OJK
 */
export const occupations = pgTable("occupations", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // kode okupasi OJK (misal 2976)
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 6. TARIFF OCCUPATION
 * Tabel tarif harta benda OJK (FLEXAS) per okupasi dan kelas konstruksi
 */
export const tariffOccupation = pgTable("tariff_occupation", {
  id: uuid("id").defaultRandom().primaryKey(),
  occupationId: uuid("occupation_id")
    .references(() => occupations.id, { onDelete: "cascade" })
    .notNull(),
  constructionClass: text("construction_class").notNull(), // K1, K2, K3
  rateMin: numeric("rate_min", { precision: 12, scale: 6 }).notNull(),
  rateMax: numeric("rate_max", { precision: 12, scale: 6 }).notNull(),
  rateUnit: text("rate_unit").default("permil").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 7. TARIFF EQ PROPERTY
 * Tarif asuransi gempa bumi harta benda (Lampiran III SE OJK)
 */
export const tariffEqProperty = pgTable("tariff_eq_property", {
  id: uuid("id").defaultRandom().primaryKey(),
  constructionCategory: text("construction_category").notNull(), // Com / DW
  zone: text("zone").notNull(), // Zona 1 - Zona 5
  rate: numeric("rate", { precision: 12, scale: 6 }).notNull(), // nilai tunggal
  rateUnit: text("rate_unit").default("permil").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 8. TARIFF FLOOD
 * Tarif banjir OJK (Harta Benda & KBM)
 */
export const tariffFlood = pgTable("tariff_flood", {
  id: uuid("id").defaultRandom().primaryKey(),
  line: text("line").notNull(), // harta benda / kendaraan bermotor
  region: text("region").notNull(), // Wilayah 1, 2, 3
  zone: text("zone").notNull(), // Zona 1 - 4
  coverageType: text("coverage_type").notNull(), // comprehensive / tlo
  rateMin: numeric("rate_min", { precision: 12, scale: 6 }),
  rateMax: numeric("rate_max", { precision: 12, scale: 6 }),
  note: text("note"), // catatan faktor loading untuk zona 3 & 4
  rateUnit: text("rate_unit").default("percent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 9. TARIFF MOTOR
 * Tarif kendaraan bermotor komprehensif & TLO per kategori & wilayah
 */
export const tariffMotor = pgTable("tariff_motor", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: text("category").notNull(), // Kategori 1 sampai 8
  vehicleType: text("vehicle_type").notNull(),
  siMin: numeric("si_min", { precision: 18, scale: 2 }).notNull(),
  siMax: numeric("si_max", { precision: 18, scale: 2 }).notNull(),
  region: text("region").notNull(), // Wilayah 1 sampai Wilayah 3
  coverageType: text("coverage_type").notNull(), // comprehensive / tlo
  rateMin: numeric("rate_min", { precision: 12, scale: 6 }).notNull(),
  rateMax: numeric("rate_max", { precision: 12, scale: 6 }).notNull(),
  rateUnit: text("rate_unit").default("percent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 10. TARIFF MOTOR EXTENSION
 * Perluasan jaminan KBM (SRCC, Terorisme, TJH progresif, PA)
 */
export const tariffMotorExtension = pgTable("tariff_motor_extension", {
  id: uuid("id").defaultRandom().primaryKey(),
  cover: text("cover").notNull(), // SRCC, TS, TJH, PA
  coverageType: text("coverage_type"),
  basis: text("basis").notNull(), // uang pertanggungan / lapisan limit
  limitMin: numeric("limit_min", { precision: 18, scale: 2 }),
  limitMax: numeric("limit_max", { precision: 18, scale: 2 }),
  rate: numeric("rate", { precision: 12, scale: 6 }).notNull(),
  rateUnit: text("rate_unit").default("percent").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 11. EQ ZONES
 * Peta 511 kabupaten/kota Indonesia dengan zona gempanya untuk auto-fill
 */
export const eqZones = pgTable("eq_zones", {
  id: uuid("id").defaultRandom().primaryKey(),
  province: text("province").notNull(),
  regency: text("regency").notNull(), // kabupaten / kota
  zone: text("zone").notNull(), // Zona 1 - Zona 5
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 12. BI SCALES
 * Skala Business Interruption berdasarkan Indemnity Period (bulan)
 */
export const biScales = pgTable("bi_scales", {
  indemnityMonths: integer("indemnity_months").primaryKey(), // 3, 6, 9, 12, 18, 24, 36
  percentage: numeric("percentage", { precision: 6, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 13. INSURERS
 * Perusahaan asuransi rekanan penanggung risiko
 */
export const insurers = pgTable("insurers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 14. ADJUSTERS
 * Kantor jasa penilai kerugian / loss adjuster
 */
export const adjusters = pgTable("adjusters", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 15. CURRENCIES
 * Mata uang transaksi
 */
export const currencies = pgTable("currencies", {
  code: text("code").primaryKey(), // IDR, USD, SGD, EUR
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 16. WORDING FORMS
 * Format baku polis (PSAKI, Munich Re, dll.)
 */
export const wordingForms = pgTable("wording_forms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // contoh PSAKI
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 17. CLAUSES
 * Pustaka klausula baku asuransi (607 klausul LCH)
 */
export const clauses = pgTable("clauses", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  cobId: uuid("cob_id").references(() => classesOfBusiness.id, { onDelete: "set null" }), // null berarti semua COB
  coverTypeId: uuid("cover_type_id").references(() => coverTypes.id, { onDelete: "set null" }),
  wordingHtml: text("wording_html").notNull(), // HTML disanitasi sebelum simpan
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
