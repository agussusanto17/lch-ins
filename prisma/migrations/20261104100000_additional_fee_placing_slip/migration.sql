-- Additional fee di slip Property dan Motor Vehicle, hanya untuk produksi:
-- tidak dicetak di dokumen slip dan disalin ke polis yang dibuat dari slip.
-- Slip yang sudah ada mendapat nilai 0.

-- AlterTable
ALTER TABLE "placing_slips" ADD COLUMN     "additional_fee" DECIMAL(18,2) NOT NULL DEFAULT 0;
