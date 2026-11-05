-- Singkatan EQ untuk PSAGBI (0105), type of cover Earthquake di slip Property
-- (Agus, 5 November 2026). Slip dengan Property All Risk dan PSAGBI bernomor
-- PS-PAREQ, sama dengan CI LCH 011/LCH-PLCMT/CI-PAREQ/VIII/2026. Lewat migrasi
-- supaya database Vercel dan VPS sama-sama berubah.
UPDATE "cover_types"
SET "abbreviation" = 'EQ', "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = '0105';
