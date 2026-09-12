-- CreateEnum
CREATE TYPE "SlipStatus" AS ENUM ('Draft', 'Released', 'Quoted', 'Closed', 'Cancelled');

-- CreateEnum
CREATE TYPE "SppaStatus" AS ENUM ('Draft', 'Submitted');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('Draft', 'Issued', 'Cancelled');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('Draft', 'Posted', 'Void');

-- CreateEnum
CREATE TYPE "JournalSource" AS ENUM ('Manual', 'DebitNote', 'CreditNote', 'Payment');

-- CreateEnum
CREATE TYPE "SlipItemKind" AS ENUM ('Interest', 'SumInsuredSection1', 'SumInsuredSection2', 'DeductibleSection1', 'DeductibleSection2');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('Create', 'Update', 'Delete', 'Release', 'Cancel');

-- CreateEnum
CREATE TYPE "RateUnit" AS ENUM ('PerMil', 'Percent');

-- CreateEnum
CREATE TYPE "CoverageType" AS ENUM ('Comprehensive', 'TotalLossOnly');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "skojk_no" TEXT,
    "apparindo_no" TEXT,
    "logo_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number_pattern" TEXT NOT NULL,
    "reset_period_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "number_counters" (
    "document_type_code" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "number_counters_pkey" PRIMARY KEY ("document_type_code","period")
);

-- CreateTable
CREATE TABLE "lookup_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lookup_type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lookup_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes_of_business" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate_mode_id" UUID NOT NULL,
    "form_variant_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "classes_of_business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cover_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cob_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cover_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cob_rate_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cob_id" UUID NOT NULL,
    "kind_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cob_rate_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "occupations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_occupation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "occupation_id" UUID NOT NULL,
    "construction_class" TEXT NOT NULL,
    "rate_min" DECIMAL(12,6) NOT NULL,
    "rate_max" DECIMAL(12,6) NOT NULL,
    "rate_unit" "RateUnit" NOT NULL DEFAULT 'PerMil',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tariff_occupation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_eq_property" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "construction_category" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "rate" DECIMAL(12,6) NOT NULL,
    "rate_unit" "RateUnit" NOT NULL DEFAULT 'PerMil',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tariff_eq_property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_flood" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "line" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "coverage_type" "CoverageType",
    "rate_min" DECIMAL(12,6),
    "rate_max" DECIMAL(12,6),
    "note" TEXT,
    "rate_unit" "RateUnit" NOT NULL DEFAULT 'Percent',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tariff_flood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_motor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "si_min" DECIMAL(18,2),
    "si_max" DECIMAL(18,2),
    "region" TEXT NOT NULL,
    "coverage_type" "CoverageType" NOT NULL,
    "rate_min" DECIMAL(12,6) NOT NULL,
    "rate_max" DECIMAL(12,6) NOT NULL,
    "rate_unit" "RateUnit" NOT NULL DEFAULT 'Percent',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tariff_motor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_motor_extension" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cover" TEXT NOT NULL,
    "coverage_type" "CoverageType",
    "basis" TEXT NOT NULL,
    "limit_min" DECIMAL(18,2),
    "limit_max" DECIMAL(18,2),
    "rate_min" DECIMAL(12,6),
    "rate_max" DECIMAL(12,6),
    "rate_unit" "RateUnit" NOT NULL DEFAULT 'Percent',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tariff_motor_extension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eq_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "province" TEXT NOT NULL,
    "regency" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "eq_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_scales" (
    "indemnity_months" INTEGER NOT NULL,
    "percentage" DECIMAL(12,6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bi_scales_pkey" PRIMARY KEY ("indemnity_months")
);

-- CreateTable
CREATE TABLE "insurers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insurers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjusters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "adjusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "wording_forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wording_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clauses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "cob_id" UUID,
    "cover_type_id" UUID,
    "wording_html" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_type_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "npwp" TEXT,
    "id_type_id" UUID,
    "id_number" TEXT,
    "birth_place" TEXT,
    "birth_date" DATE,
    "contact_person" TEXT,
    "contact_person_id_number" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "income_source_id" UUID,
    "insurance_purpose_id" UUID,
    "insurance_purpose_note" TEXT,
    "kyc_date" DATE,
    "cob_id" UUID,
    "status_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "address_type_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "document_type_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sppa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "cob_id" UUID NOT NULL,
    "cover_type_id" UUID,
    "insured_name" TEXT NOT NULL,
    "risk_location" TEXT,
    "occupation_id" UUID,
    "currency_code" TEXT NOT NULL,
    "sum_insured" DECIMAL(18,2),
    "period_start" DATE,
    "period_end" DATE,
    "answers" JSONB,
    "status" "SppaStatus" NOT NULL DEFAULT 'Draft',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sppa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placing_slips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slip_no" TEXT,
    "client_id" UUID NOT NULL,
    "sppa_id" UUID,
    "cob_id" UUID NOT NULL,
    "cover_type_id" UUID,
    "insured_name" TEXT NOT NULL,
    "correspondence_address" TEXT,
    "correspondence_address_id" UUID,
    "currency_code" TEXT NOT NULL,
    "status" "SlipStatus" NOT NULL DEFAULT 'Draft',
    "period_tba" BOOLEAN NOT NULL DEFAULT false,
    "inception_date" DATE,
    "expiry_date" DATE,
    "occupation_id" UUID,
    "risk_location" TEXT,
    "coverage" TEXT,
    "construction_class_id" UUID,
    "indemnity_months" INTEGER,
    "interest_section1" TEXT,
    "interest_section2" TEXT,
    "special_conditions" TEXT,
    "discount_pct" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "admin_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "stamp_duty" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "brokerage_pct" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "include_vat" BOOLEAN NOT NULL DEFAULT false,
    "subjectivity" TEXT,
    "quotation_no" TEXT,
    "cover_note_no" TEXT,
    "cover_note_remarks" TEXT,
    "closing_no" TEXT,
    "closing_instruction" TEXT,
    "released_at" TIMESTAMPTZ(6),
    "released_by" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "placing_slips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slip_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slip_id" UUID NOT NULL,
    "kind" "SlipItemKind" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slip_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slip_rate_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slip_id" UUID NOT NULL,
    "kind_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "limit_amount" DECIMAL(18,2),
    "rate" DECIMAL(12,6),
    "premium" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "rate_min" DECIMAL(12,6),
    "rate_max" DECIMAL(12,6),
    "out_of_bounds_reason" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slip_rate_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slip_security_panel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slip_id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "share_pct" DECIMAL(12,6) NOT NULL,
    "position_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slip_security_panel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slip_clauses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slip_id" UUID NOT NULL,
    "clause_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "wording_html" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slip_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slip_wording_forms" (
    "slip_id" UUID NOT NULL,
    "wording_form_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slip_wording_forms_pkey" PRIMARY KEY ("slip_id","wording_form_id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policy_no" TEXT NOT NULL,
    "placing_slip_id" UUID,
    "client_id" UUID NOT NULL,
    "cob_id" UUID NOT NULL,
    "cover_type_id" UUID,
    "insured_name" TEXT NOT NULL,
    "risk_location" TEXT,
    "inception_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "currency_code" TEXT NOT NULL,
    "sum_insured" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "premium" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "brokerage_pct" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "policy_type_id" UUID NOT NULL,
    "parent_policy_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_insurers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policy_id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "share_pct" DECIMAL(12,6) NOT NULL,
    "position_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "policy_insurers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policy_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "policy_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claim_no" TEXT NOT NULL,
    "policy_id" UUID NOT NULL,
    "adjuster_id" UUID,
    "loss_date" DATE NOT NULL,
    "reported_date" DATE,
    "document_complete_date" DATE,
    "spk_date" DATE,
    "location" TEXT,
    "loss_description" TEXT,
    "asset_description" TEXT,
    "currency_code" TEXT NOT NULL,
    "estimated_loss" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "claimed_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bank_id" UUID NOT NULL,
    "account_no" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL,
    "is_premium_trust" BOOLEAN NOT NULL DEFAULT false,
    "coa_account_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debit_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dn_no" TEXT NOT NULL,
    "policy_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "insured_name" TEXT NOT NULL,
    "billing_address" TEXT,
    "payment_model_id" UUID NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency_code" TEXT NOT NULL,
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "premium" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "policy_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "stamp_duty" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reference_no" TEXT,
    "lc_no" TEXT,
    "etd" DATE,
    "status" "NoteStatus" NOT NULL DEFAULT 'Draft',
    "issued_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "debit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debit_note_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "debit_note_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "debit_note_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cn_no" TEXT NOT NULL,
    "debit_note_id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "share_pct" DECIMAL(12,6) NOT NULL,
    "instalment_no" INTEGER NOT NULL DEFAULT 1,
    "instalment_count" INTEGER NOT NULL DEFAULT 1,
    "due_date" DATE NOT NULL,
    "currency_code" TEXT NOT NULL,
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "gross_premium" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "brokerage_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ppn_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pph23_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "NoteStatus" NOT NULL DEFAULT 'Draft',
    "issued_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_type_id" UUID NOT NULL,
    "debit_note_id" UUID,
    "credit_note_id" UUID,
    "claim_id" UUID,
    "bank_account_id" UUID NOT NULL,
    "payment_date" DATE NOT NULL,
    "currency_code" TEXT NOT NULL,
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "amount" DECIMAL(18,2) NOT NULL,
    "bank_reference" TEXT,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coa_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "account_type_id" UUID NOT NULL,
    "parent_id" UUID,
    "is_control" BOOLEAN NOT NULL DEFAULT false,
    "ojk_report_line_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "coa_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "journal_no" TEXT NOT NULL,
    "journal_date" DATE NOT NULL,
    "description" TEXT,
    "source_type" "JournalSource" NOT NULL DEFAULT 'Manual',
    "source_id" UUID,
    "status" "JournalStatus" NOT NULL DEFAULT 'Draft',
    "created_by" UUID NOT NULL,
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "journal_entry_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "client_id" UUID,
    "insurer_id" UUID,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "memo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "lookup_values_lookup_type_sort_order_idx" ON "lookup_values"("lookup_type", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "lookup_values_lookup_type_code_key" ON "lookup_values"("lookup_type", "code");

-- CreateIndex
CREATE UNIQUE INDEX "classes_of_business_code_key" ON "classes_of_business"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cover_types_code_key" ON "cover_types"("code");

-- CreateIndex
CREATE INDEX "cover_types_cob_id_idx" ON "cover_types"("cob_id");

-- CreateIndex
CREATE INDEX "cob_rate_lines_cob_id_sort_order_idx" ON "cob_rate_lines"("cob_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "occupations_code_key" ON "occupations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_occupation_occupation_id_construction_class_key" ON "tariff_occupation"("occupation_id", "construction_class");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_eq_property_construction_category_zone_key" ON "tariff_eq_property"("construction_category", "zone");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_flood_line_region_zone_coverage_type_key" ON "tariff_flood"("line", "region", "zone", "coverage_type");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_motor_category_region_coverage_type_key" ON "tariff_motor"("category", "region", "coverage_type");

-- CreateIndex
CREATE INDEX "eq_zones_regency_idx" ON "eq_zones"("regency");

-- CreateIndex
CREATE UNIQUE INDEX "eq_zones_province_regency_key" ON "eq_zones"("province", "regency");

-- CreateIndex
CREATE INDEX "clauses_cob_id_cover_type_id_idx" ON "clauses"("cob_id", "cover_type_id");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "clients_status_id_idx" ON "clients"("status_id");

-- CreateIndex
CREATE INDEX "client_addresses_client_id_idx" ON "client_addresses"("client_id");

-- CreateIndex
CREATE INDEX "client_documents_client_id_idx" ON "client_documents"("client_id");

-- CreateIndex
CREATE INDEX "sppa_client_id_idx" ON "sppa"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "placing_slips_slip_no_key" ON "placing_slips"("slip_no");

-- CreateIndex
CREATE UNIQUE INDEX "placing_slips_quotation_no_key" ON "placing_slips"("quotation_no");

-- CreateIndex
CREATE UNIQUE INDEX "placing_slips_cover_note_no_key" ON "placing_slips"("cover_note_no");

-- CreateIndex
CREATE UNIQUE INDEX "placing_slips_closing_no_key" ON "placing_slips"("closing_no");

-- CreateIndex
CREATE INDEX "placing_slips_client_id_idx" ON "placing_slips"("client_id");

-- CreateIndex
CREATE INDEX "placing_slips_status_idx" ON "placing_slips"("status");

-- CreateIndex
CREATE INDEX "slip_items_slip_id_kind_sort_order_idx" ON "slip_items"("slip_id", "kind", "sort_order");

-- CreateIndex
CREATE INDEX "slip_rate_lines_slip_id_sort_order_idx" ON "slip_rate_lines"("slip_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "slip_security_panel_slip_id_insurer_id_key" ON "slip_security_panel"("slip_id", "insurer_id");

-- CreateIndex
CREATE INDEX "slip_clauses_slip_id_sort_order_idx" ON "slip_clauses"("slip_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "slip_clauses_slip_id_clause_id_key" ON "slip_clauses"("slip_id", "clause_id");

-- CreateIndex
CREATE UNIQUE INDEX "policies_policy_no_key" ON "policies"("policy_no");

-- CreateIndex
CREATE INDEX "policies_client_id_idx" ON "policies"("client_id");

-- CreateIndex
CREATE INDEX "policies_expiry_date_idx" ON "policies"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "policy_insurers_policy_id_insurer_id_key" ON "policy_insurers"("policy_id", "insurer_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_files_policy_id_version_key" ON "policy_files"("policy_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claim_no_key" ON "claims"("claim_no");

-- CreateIndex
CREATE INDEX "claims_policy_id_idx" ON "claims"("policy_id");

-- CreateIndex
CREATE INDEX "claims_status_id_idx" ON "claims"("status_id");

-- CreateIndex
CREATE UNIQUE INDEX "debit_notes_dn_no_key" ON "debit_notes"("dn_no");

-- CreateIndex
CREATE INDEX "debit_notes_client_id_idx" ON "debit_notes"("client_id");

-- CreateIndex
CREATE INDEX "debit_notes_due_date_idx" ON "debit_notes"("due_date");

-- CreateIndex
CREATE INDEX "debit_note_lines_debit_note_id_sort_order_idx" ON "debit_note_lines"("debit_note_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_cn_no_key" ON "credit_notes"("cn_no");

-- CreateIndex
CREATE INDEX "credit_notes_due_date_idx" ON "credit_notes"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_debit_note_id_insurer_id_instalment_no_key" ON "credit_notes"("debit_note_id", "insurer_id", "instalment_no");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "payments_bank_reference_idx" ON "payments"("bank_reference");

-- CreateIndex
CREATE UNIQUE INDEX "coa_accounts_code_key" ON "coa_accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_journal_no_key" ON "journal_entries"("journal_no");

-- CreateIndex
CREATE INDEX "journal_entries_journal_date_idx" ON "journal_entries"("journal_date");

-- CreateIndex
CREATE INDEX "journal_entries_source_type_source_id_idx" ON "journal_entries"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "journal_lines_journal_entry_id_idx" ON "journal_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_reset_period_id_fkey" FOREIGN KEY ("reset_period_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "number_counters" ADD CONSTRAINT "number_counters_document_type_code_fkey" FOREIGN KEY ("document_type_code") REFERENCES "document_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes_of_business" ADD CONSTRAINT "classes_of_business_rate_mode_id_fkey" FOREIGN KEY ("rate_mode_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes_of_business" ADD CONSTRAINT "classes_of_business_form_variant_id_fkey" FOREIGN KEY ("form_variant_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_types" ADD CONSTRAINT "cover_types_cob_id_fkey" FOREIGN KEY ("cob_id") REFERENCES "classes_of_business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cob_rate_lines" ADD CONSTRAINT "cob_rate_lines_cob_id_fkey" FOREIGN KEY ("cob_id") REFERENCES "classes_of_business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cob_rate_lines" ADD CONSTRAINT "cob_rate_lines_kind_id_fkey" FOREIGN KEY ("kind_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_occupation" ADD CONSTRAINT "tariff_occupation_occupation_id_fkey" FOREIGN KEY ("occupation_id") REFERENCES "occupations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_cob_id_fkey" FOREIGN KEY ("cob_id") REFERENCES "classes_of_business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_cover_type_id_fkey" FOREIGN KEY ("cover_type_id") REFERENCES "cover_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_client_type_id_fkey" FOREIGN KEY ("client_type_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_id_type_id_fkey" FOREIGN KEY ("id_type_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_income_source_id_fkey" FOREIGN KEY ("income_source_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_insurance_purpose_id_fkey" FOREIGN KEY ("insurance_purpose_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_cob_id_fkey" FOREIGN KEY ("cob_id") REFERENCES "classes_of_business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_addresses" ADD CONSTRAINT "client_addresses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_addresses" ADD CONSTRAINT "client_addresses_address_type_id_fkey" FOREIGN KEY ("address_type_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sppa" ADD CONSTRAINT "sppa_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sppa" ADD CONSTRAINT "sppa_cob_id_fkey" FOREIGN KEY ("cob_id") REFERENCES "classes_of_business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sppa" ADD CONSTRAINT "sppa_cover_type_id_fkey" FOREIGN KEY ("cover_type_id") REFERENCES "cover_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sppa" ADD CONSTRAINT "sppa_occupation_id_fkey" FOREIGN KEY ("occupation_id") REFERENCES "occupations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sppa" ADD CONSTRAINT "sppa_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sppa" ADD CONSTRAINT "sppa_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_sppa_id_fkey" FOREIGN KEY ("sppa_id") REFERENCES "sppa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_cob_id_fkey" FOREIGN KEY ("cob_id") REFERENCES "classes_of_business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_cover_type_id_fkey" FOREIGN KEY ("cover_type_id") REFERENCES "cover_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_correspondence_address_id_fkey" FOREIGN KEY ("correspondence_address_id") REFERENCES "client_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_occupation_id_fkey" FOREIGN KEY ("occupation_id") REFERENCES "occupations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_construction_class_id_fkey" FOREIGN KEY ("construction_class_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_indemnity_months_fkey" FOREIGN KEY ("indemnity_months") REFERENCES "bi_scales"("indemnity_months") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_items" ADD CONSTRAINT "slip_items_slip_id_fkey" FOREIGN KEY ("slip_id") REFERENCES "placing_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_rate_lines" ADD CONSTRAINT "slip_rate_lines_slip_id_fkey" FOREIGN KEY ("slip_id") REFERENCES "placing_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_rate_lines" ADD CONSTRAINT "slip_rate_lines_kind_id_fkey" FOREIGN KEY ("kind_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_security_panel" ADD CONSTRAINT "slip_security_panel_slip_id_fkey" FOREIGN KEY ("slip_id") REFERENCES "placing_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_security_panel" ADD CONSTRAINT "slip_security_panel_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_security_panel" ADD CONSTRAINT "slip_security_panel_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_clauses" ADD CONSTRAINT "slip_clauses_slip_id_fkey" FOREIGN KEY ("slip_id") REFERENCES "placing_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_clauses" ADD CONSTRAINT "slip_clauses_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clauses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_wording_forms" ADD CONSTRAINT "slip_wording_forms_slip_id_fkey" FOREIGN KEY ("slip_id") REFERENCES "placing_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_wording_forms" ADD CONSTRAINT "slip_wording_forms_wording_form_id_fkey" FOREIGN KEY ("wording_form_id") REFERENCES "wording_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_placing_slip_id_fkey" FOREIGN KEY ("placing_slip_id") REFERENCES "placing_slips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_cob_id_fkey" FOREIGN KEY ("cob_id") REFERENCES "classes_of_business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_cover_type_id_fkey" FOREIGN KEY ("cover_type_id") REFERENCES "cover_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_policy_type_id_fkey" FOREIGN KEY ("policy_type_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_parent_policy_id_fkey" FOREIGN KEY ("parent_policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_insurers" ADD CONSTRAINT "policy_insurers_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_insurers" ADD CONSTRAINT "policy_insurers_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_insurers" ADD CONSTRAINT "policy_insurers_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_files" ADD CONSTRAINT "policy_files_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_files" ADD CONSTRAINT "policy_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_adjuster_id_fkey" FOREIGN KEY ("adjuster_id") REFERENCES "adjusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_coa_account_id_fkey" FOREIGN KEY ("coa_account_id") REFERENCES "coa_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_payment_model_id_fkey" FOREIGN KEY ("payment_model_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_note_lines" ADD CONSTRAINT "debit_note_lines_debit_note_id_fkey" FOREIGN KEY ("debit_note_id") REFERENCES "debit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_debit_note_id_fkey" FOREIGN KEY ("debit_note_id") REFERENCES "debit_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_type_id_fkey" FOREIGN KEY ("payment_type_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_debit_note_id_fkey" FOREIGN KEY ("debit_note_id") REFERENCES "debit_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coa_accounts" ADD CONSTRAINT "coa_accounts_account_type_id_fkey" FOREIGN KEY ("account_type_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coa_accounts" ADD CONSTRAINT "coa_accounts_ojk_report_line_id_fkey" FOREIGN KEY ("ojk_report_line_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coa_accounts" ADD CONSTRAINT "coa_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "coa_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "coa_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
