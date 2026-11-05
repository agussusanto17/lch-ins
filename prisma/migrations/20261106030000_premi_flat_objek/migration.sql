-- Premi flat per objek untuk COB selain Property dan Motor Vehicle: premi
-- diisi langsung tanpa rate, seperti contoh slip Liability dan Machinery
-- Breakdown LCH (analisa 26 contoh slip, 6 November 2026). Baris lama tetap
-- dihitung dari rate.
ALTER TABLE "slip_rate_lines" ADD COLUMN "is_flat_premium" BOOLEAN NOT NULL DEFAULT false;
