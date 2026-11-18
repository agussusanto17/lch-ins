-- Floating sum insured slip Property (MoM review Phase 1, poin 5): sum insured,
-- rate, dan deductible diisi sekali untuk semua lokasi. Slip lama tetap per lokasi.
ALTER TABLE "placing_slips" ADD COLUMN "floating_sum_insured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "floating_sum_insured_text" TEXT;
