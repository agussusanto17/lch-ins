-- Isian nilai klaim dari Team LCH (18 November 2026): adjustment asuransi, nilai salvage, dan
-- adjuster fee, nominal dalam mata uang klaim. Default 0 supaya klaim lama tetap valid.
ALTER TABLE "claims"
  ADD COLUMN "adjustment_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "salvage_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "adjuster_fee_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
