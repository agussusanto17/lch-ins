-- Blok EXCLUSIONS setelah CLAUSES, seperti CI CGL Orela (a sampai m) dan PL
-- Infiniti (1 sampai 7) di contoh slip LCH (analisa 6 November 2026).
ALTER TABLE "placing_slips" ADD COLUMN "exclusions" TEXT;
