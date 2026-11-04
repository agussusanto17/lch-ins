-- Satu cover bisa punya sampai lima deductible (permintaan 4 November 2026).
-- Deductible lama disalin ke daftar baru; kolom `deductible` dibiarkan supaya
-- kode versi sebelumnya tetap jalan selama deploy, tapi tidak dibaca lagi.
ALTER TABLE "slip_rate_lines" ADD COLUMN "deductibles" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "slip_rate_lines"
SET "deductibles" = ARRAY[btrim("deductible")]
WHERE "deductible" IS NOT NULL
  AND btrim("deductible") <> '';
