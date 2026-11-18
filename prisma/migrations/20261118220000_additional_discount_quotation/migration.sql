-- Additional discount Quotation (MoM review Phase 1, poin 7): maksimal 15%, dari premi setelah
-- discount, hanya untuk cetakan Quotation Slip Internal LCH.
ALTER TABLE "placing_slips" ADD COLUMN "additional_discount_pct" DECIMAL(12,6) NOT NULL DEFAULT 0;
