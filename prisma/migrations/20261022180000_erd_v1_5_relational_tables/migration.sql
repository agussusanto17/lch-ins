-- AlterTable
ALTER TABLE "cover_types" ADD COLUMN "priority" TEXT;

-- AlterTable
ALTER TABLE "placing_slips" ADD COLUMN "source_id" UUID;

-- AlterTable
ALTER TABLE "tariff_motor_extension" ADD COLUMN "rate" DECIMAL(12,6);

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurer_claim_pics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "insurer_id" UUID NOT NULL,
    "cob_id" UUID,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "office_phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insurer_claim_pics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_document_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cob_id" UUID,
    "name" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "claim_document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_insurer_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_insurer_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claim_id" UUID NOT NULL,
    "document_type_id" UUID,
    "is_received" BOOLEAN NOT NULL DEFAULT false,
    "received_date" DATE,
    "file_path" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "claim_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_followups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claim_id" UUID NOT NULL,
    "followup_date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "claim_followups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_code_key" ON "sources"("code");

-- CreateIndex
CREATE INDEX "insurer_claim_pics_insurer_id_idx" ON "insurer_claim_pics"("insurer_id");

-- CreateIndex
CREATE INDEX "insurer_claim_pics_cob_id_idx" ON "insurer_claim_pics"("cob_id");

-- CreateIndex
CREATE INDEX "claim_document_types_cob_id_idx" ON "claim_document_types"("cob_id");

-- CreateIndex
CREATE INDEX "client_insurer_codes_client_id_idx" ON "client_insurer_codes"("client_id");

-- CreateIndex
CREATE INDEX "client_insurer_codes_insurer_id_idx" ON "client_insurer_codes"("insurer_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_insurer_codes_client_id_insurer_id_key" ON "client_insurer_codes"("client_id", "insurer_id");

-- CreateIndex
CREATE INDEX "claim_documents_claim_id_idx" ON "claim_documents"("claim_id");

-- CreateIndex
CREATE INDEX "claim_documents_document_type_id_idx" ON "claim_documents"("document_type_id");

-- CreateIndex
CREATE INDEX "claim_followups_claim_id_idx" ON "claim_followups"("claim_id");

-- AddForeignKey
ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_claim_pics" ADD CONSTRAINT "insurer_claim_pics_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_claim_pics" ADD CONSTRAINT "insurer_claim_pics_cob_id_fkey" FOREIGN KEY ("cob_id") REFERENCES "classes_of_business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_document_types" ADD CONSTRAINT "claim_document_types_cob_id_fkey" FOREIGN KEY ("cob_id") REFERENCES "classes_of_business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_insurer_codes" ADD CONSTRAINT "client_insurer_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_insurer_codes" ADD CONSTRAINT "client_insurer_codes_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "claim_document_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_followups" ADD CONSTRAINT "claim_followups_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_followups" ADD CONSTRAINT "claim_followups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data Seed Awal untuk tabel-tabel baru:
-- 1. Sumber penempatan awal (PRD A-04)
INSERT INTO "sources" ("code", "name", "updated_at")
VALUES
  ('LCH-ID', 'PT. LCH Insurance Brokers', CURRENT_TIMESTAMP),
  ('LCH-SG', 'LCH Insurance Brokers Pte Ltd', CURRENT_TIMESTAMP),
  ('DIRECT', 'Direct Client / Nasabah Langsung', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- 2. Isi prioritas cover types dari data CSV yang sudah ada
UPDATE "cover_types" AS ct
SET "priority" = v.priority
FROM (VALUES
  ('0103', '1'),
  ('0105', 'C'),
  ('0109', 'A'),
  ('0110', 'B'),
  ('0201', '2'),
  ('0308', '3'),
  ('0311', 'A'),
  ('0901', '4')
) AS v(code, priority)
WHERE ct."code" = v.code;
