-- AlterTable
ALTER TABLE "cover_types" ADD COLUMN "abbreviation" TEXT;

-- Singkatan {COVER} untuk type of cover yang sudah punya kode di TYPE_OF_COVER.
UPDATE "cover_types" AS ct
SET "abbreviation" = v.abbreviation
FROM (VALUES
  ('0103', 'BI'),
  ('0109', 'PAR'),
  ('0110', 'IAR'),
  ('0311', 'MC'),
  ('0312', 'MC'),
  ('0323', 'MC'),
  ('0401', 'MH'),
  ('0801', 'CAR'),
  ('0802', 'EAR'),
  ('0803', 'MB'),
  ('0804', 'EEI'),
  ('0901', 'PL'),
  ('0905', 'PRL'),
  ('0906', 'PI'),
  ('0913', 'DNO'),
  ('1004', 'PA')
) AS v(code, abbreviation)
WHERE ct."code" = v.code;

-- Format nomor klaim LCH (ERD v1.5), contoh CLM-LCH075/MC/III/2026.
UPDATE "document_types"
SET "number_pattern" = 'CLM-LCH{seq:3}/{COVER}/{MMROMAN}/{YYYY}'
WHERE "code" = 'CLM';
