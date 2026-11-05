-- Slip Property PAR + EQVET punya dua type of cover (Harry, 5 November 2026):
-- Property All Risk di isian pertama, Earthquake di isian kedua. Yang kedua
-- dicetak di bawah yang pertama dan dipakai polis EQVET.
ALTER TABLE "placing_slips" ADD COLUMN "cover_type_2_id" UUID,
ADD COLUMN "type_of_cover_2" TEXT;

ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_cover_type_2_id_fkey" FOREIGN KEY ("cover_type_2_id") REFERENCES "cover_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
