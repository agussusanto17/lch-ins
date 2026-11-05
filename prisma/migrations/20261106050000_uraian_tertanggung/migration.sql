-- Uraian tertanggung yang dicetak di bawah Insured Name dengan huruf asli,
-- misalnya daftar pihak a), b), c) di CI CGL LCH (analisa contoh slip,
-- 6 November 2026).
ALTER TABLE "placing_slips" ADD COLUMN "insured_description" TEXT;
