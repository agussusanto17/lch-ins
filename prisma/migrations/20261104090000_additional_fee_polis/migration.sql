-- Fee di luar brokerage per polis, ikut dihitung di report produksi. Polis
-- yang sudah ada mendapat nilai 0.

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "additional_fee" DECIMAL(18,2) NOT NULL DEFAULT 0;
