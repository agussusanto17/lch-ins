-- Slip ber-section untuk CAR dan EAR: Section 1 Material Damage dan Section 2
-- Third Party Liability, dengan Interest, deductible, dan klausul per section
-- seperti contoh slip LCH (analisa 26 contoh slip, 6 November 2026).
ALTER TABLE "cover_types" ADD COLUMN "uses_sections" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "placing_slips" ADD COLUMN "uses_sections" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "slip_items" ADD COLUMN "section_no" SMALLINT;

-- CAR dan EAR memakai section. Slip yang sudah ada tidak diubah; section
-- bisa dinyalakan per slip.
UPDATE "cover_types" SET "uses_sections" = true WHERE "code" IN ('0801', '0802');

-- Label periode proyek dari contoh slip, hanya bila label awal dari
-- 20261106020000_detail_tambahan_slip belum diubah LCH.
UPDATE "cover_types"
SET "detail_labels" = ARRAY['The Project', 'Geographical Limit', 'Construction Period', 'Maintenance Period']
WHERE "code" = '0801' AND "detail_labels" = ARRAY['The Project', 'Geographical Limit'];
UPDATE "cover_types"
SET "detail_labels" = ARRAY['The Project', 'Geographical Limit', 'Testing & Commissioning', 'Maintenance Period', 'Basis of Indemnity']
WHERE "code" = '0802' AND "detail_labels" = ARRAY['The Project', 'Geographical Limit'];
