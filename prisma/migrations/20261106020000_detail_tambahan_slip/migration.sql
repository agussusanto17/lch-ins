-- Detail tambahan slip: baris {label, value} yang dicetak di tabel detail
-- dokumen, misalnya Retroactive Date, Voyage, Vessels (analisa 26 contoh slip
-- LCH, 6 November 2026). Label bawaan disimpan per type of cover.
ALTER TABLE "cover_types" ADD COLUMN "detail_labels" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "placing_slips" ADD COLUMN "detail_rows" JSONB NOT NULL DEFAULT '[]';

-- Label awal dari contoh slip LCH untuk type of cover yang punya contoh.
-- LCH bisa mengubahnya di Master Data. Hanya diisi bila masih kosong.
UPDATE "cover_types" AS ct
SET "detail_labels" = v.labels
FROM (VALUES
  ('0901', ARRAY['Retroactive Date', 'Territorial Limit', 'Jurisdiction']),
  ('0906', ARRAY['Retroactive Date', 'Territorial Limit', 'Jurisdiction']),
  ('0908', ARRAY['Retroactive Date', 'Co-Insured', 'Territorial Limit', 'Jurisdiction', 'Law and Courts']),
  ('0323', ARRAY['Estimated Time of Departure (ETD)', 'Voyage', 'Conveyance', 'Consignee', 'Basis of Valuation', 'Packing Method']),
  ('0311', ARRAY['Voyage', 'Conveyance', 'Limit of Liability', 'Basis of Valuation', 'Packing Method', 'Declaration']),
  ('0308', ARRAY['Carrying Schedule', 'Territorial Limit', 'Business', 'Basis of Valuation']),
  ('1203', ARRAY['Territorial Limit', 'Business', 'Basis of Valuation']),
  ('1202', ARRAY['Insured Person', 'Geographical Limit', 'Guarantee Limit']),
  ('1209', ARRAY['Name of Tournament', 'Venue', 'Tee Off', 'Total Participant', 'Par / Hole']),
  ('1213', ARRAY['Conveyance', 'Trading Limits']),
  ('0401', ARRAY['Vessels', 'Trading Limits', 'Warranties']),
  ('0801', ARRAY['The Project', 'Geographical Limit']),
  ('0802', ARRAY['The Project', 'Geographical Limit']),
  ('0116', ARRAY['Limit of Liability', 'Choice of Law and Jurisdiction']),
  ('1004', ARRAY['The Business', 'Beneficiary'])
) AS v(code, labels)
WHERE ct."code" = v.code AND cardinality(ct."detail_labels") = 0;
