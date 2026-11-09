-- No. polis sebelumnya untuk renewal yang polis lamanya belum ada di sistem
-- (Agus, 9 November 2026): sistem baru dipakai sejak 2026, jadi polis tahun lalu
-- belum tercatat. Renewal cukup memilih polis sebelumnya dari sistem atau
-- mengetik nomornya.

-- AlterTable
ALTER TABLE "policies" ADD COLUMN "previous_policy_no" TEXT;
