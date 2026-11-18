-- Cabang klien Jakarta/Singapore (MoM review Phase 1, 17 November 2026, poin 3).
INSERT INTO "lookup_values" ("lookup_type", "code", "name", "sort_order", "is_system", "is_active", "updated_at")
VALUES
  ('client_branch', 'jakarta', 'Jakarta', 1, true, true, CURRENT_TIMESTAMP),
  ('client_branch', 'singapore', 'Singapore', 2, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("lookup_type", "code") DO NOTHING;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "branch_id" UUID;

-- Klien yang sudah ada dilayani cabang Jakarta.
UPDATE "clients"
SET "branch_id" = (SELECT "id" FROM "lookup_values" WHERE "lookup_type" = 'client_branch' AND "code" = 'jakarta')
WHERE "branch_id" IS NULL;

-- CreateIndex
CREATE INDEX "clients_branch_id_idx" ON "clients"("branch_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;
