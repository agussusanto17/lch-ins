-- Deductible yang diterapkan pada klaim, nominal dalam mata uang klaim (Agus, 18 November 2026).
-- Default 0 supaya klaim lama tetap valid dan kode lama tidak terpengaruh.
ALTER TABLE "claims" ADD COLUMN "deductible_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
