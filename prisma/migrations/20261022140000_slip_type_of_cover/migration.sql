-- AlterTable
ALTER TABLE "placing_slips" ADD COLUMN     "type_of_cover" TEXT;


-- Backfill seed slips whose label was dropped when only cover_type_id was stored.
UPDATE "placing_slips" SET "type_of_cover" = v.label
FROM (VALUES
  ('001/LCH-PLCMT/PS/VIII/2026', 'Comprehensive Casco + Perluasan'),
  ('002/LCH-PLCMT/PS-PAREQ/VIII/2026', 'PAR + EQVET'),
  ('003/LCH-PLCMT/PS-MC/VIII/2026', 'Marine Cargo — Institute Cargo Clauses (A)'),
  ('004/LCH-PLCMT/PS-CAR/VII/2026', 'Contractor''s All Risks (CAR)'),
  ('005/LCH-PLCMT/PS-IAR/VIII/2026', 'Industrial All Risks (IAR)')
) AS v(slip_no, label)
WHERE "placing_slips"."slip_no" = v.slip_no AND "placing_slips"."type_of_cover" IS NULL;
