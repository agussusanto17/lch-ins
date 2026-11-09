-- Heavy Equipment tidak memakai tarif OJK (jawaban Harry, 9 November 2026):
-- slip-nya tanpa batas rate kendaraan bermotor dan tanpa batas biaya akuisisi
-- OJK. Type of cover lain tetap memakai tarif OJK seperti sebelumnya.

-- AlterTable
ALTER TABLE "cover_types" ADD COLUMN "ojk_tariff" BOOLEAN NOT NULL DEFAULT true;

UPDATE "cover_types" SET "ojk_tariff" = false WHERE "code" = '0203';
