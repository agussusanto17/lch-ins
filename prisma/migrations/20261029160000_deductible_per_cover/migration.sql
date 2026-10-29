-- Deductible per cover (instruksi LCH 29 Oktober 2026). Kolom baru, nullable,
-- jadi kode lama tetap jalan dan baris yang sudah ada tidak berubah.
ALTER TABLE "slip_rate_lines" ADD COLUMN "deductible" TEXT;
