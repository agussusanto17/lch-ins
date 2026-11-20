-- Premi installment 2 sampai 10 kali (Agus, 20 November 2026): jadwal persen dan jatuh tempo per
-- cicilan di placing slip, disalin ke polis saat polis dibuat dari Closing Instruction.
-- Daftar kosong berarti premi dibayar sekaligus, jadi data lama tidak berubah.
ALTER TABLE "placing_slips" ADD COLUMN "premium_installments" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "policies" ADD COLUMN "premium_installments" JSONB NOT NULL DEFAULT '[]';
