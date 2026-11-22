-- Sub akun EF per asuransi dan klien SPIL Program, diatur LCH sendiri di Master Data dan Database
-- Klien (22 November 2026). Isian awal mengikuti aturan nama Rekap Produksi sejak #300, jadi hasil
-- rekap tidak berubah: Multi Artha Guna = EF (MAG), asuransi lain = EF; klien bernama SPIL atau
-- Salam Pacific = SPIL Program.

INSERT INTO "lookup_values" ("lookup_type", "code", "name", "sort_order", "is_system", "is_active", "updated_at")
VALUES
  ('ef_sub_account', 'ef', 'EF', 0, false, true, CURRENT_TIMESTAMP),
  ('ef_sub_account', 'ef_mag', 'EF (MAG)', 1, false, true, CURRENT_TIMESTAMP),
  ('ef_sub_account', 'dll', 'DLL', 2, false, true, CURRENT_TIMESTAMP)
ON CONFLICT ("lookup_type", "code") DO NOTHING;

-- AlterTable
ALTER TABLE "insurers" ADD COLUMN     "fee_sub_account_id" UUID;

-- AddForeignKey
ALTER TABLE "insurers" ADD CONSTRAINT "insurers_fee_sub_account_id_fkey" FOREIGN KEY ("fee_sub_account_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "insurers" AS i
SET "fee_sub_account_id" = l."id"
FROM "lookup_values" AS l
WHERE l."lookup_type" = 'ef_sub_account'
  AND l."code" = CASE WHEN i."name" ~* 'multi\s*artha\s*guna' THEN 'ef_mag' ELSE 'ef' END;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "spil_program" BOOLEAN NOT NULL DEFAULT false;

UPDATE "clients"
SET "spil_program" = true
WHERE "name" ~* '\mSPIL\M' OR "name" ~* 'SALAM\s+PACIFIC';
