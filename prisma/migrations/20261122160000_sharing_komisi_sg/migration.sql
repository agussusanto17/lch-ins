-- Sharing brokerage ke LCH Insurance Brokers Pte Ltd (Singapore), dalam persen brokerage (Agus,
-- 22 November 2026). Diisi di placing slip, ikut ke polis, dan tercatat sebagai beban komisi
-- (COMM EXPENSE) di Rekap Produksi. 0 berarti tidak ada sharing.
-- AlterTable
ALTER TABLE "placing_slips" ADD COLUMN     "commission_share_sg_pct" DECIMAL(12,6) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "commission_share_sg_pct" DECIMAL(12,6) NOT NULL DEFAULT 0;
