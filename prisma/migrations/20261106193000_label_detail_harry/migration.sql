-- Label Detail tambahan bawaan per type of cover dari jawaban Harry (6
-- November 2026) atas pertanyaan 1 analisa contoh slip LCH:
--   Territorial Limit: PL, MB, CPM, EAR, IAR
--   Jurisdiction: PL, MB, CARGO, TS, CPM, CAR, EAR
--   Voyage, Conveyance: CARGO; Vessels: CARGO, HULL; Trading Limits: HULL
--   Existing Policy No.: semua type of cover
-- Label hanya ditambahkan bila belum ada, jadi label dari contoh slip dan
-- perubahan LCH di Master Data tetap. Slip yang sudah ada tidak berubah.
-- Terrorism & Sabotage (0116) sudah punya "Choice of Law and Jurisdiction"
-- dari contoh 09, jadi Jurisdiction tidak didobelkan.

-- Tambahan per type of cover, di akhir daftar dan urut seperti tertulis.
UPDATE "cover_types" c
SET "detail_labels" = c."detail_labels" || ARRAY(
  SELECT t.l
  FROM unnest(n.labels) WITH ORDINALITY AS t(l, i)
  WHERE t.l <> ALL (c."detail_labels")
  ORDER BY t.i
)
FROM (VALUES
  ('0110', ARRAY['Territorial Limit']),
  ('0801', ARRAY['Jurisdiction']),
  ('0802', ARRAY['Territorial Limit', 'Jurisdiction']),
  ('0803', ARRAY['Territorial Limit', 'Jurisdiction']),
  ('0805', ARRAY['Territorial Limit', 'Jurisdiction']),
  ('0311', ARRAY['Voyage', 'Conveyance', 'Vessels', 'Jurisdiction']),
  ('0312', ARRAY['Voyage', 'Conveyance', 'Vessels', 'Jurisdiction']),
  ('0323', ARRAY['Voyage', 'Conveyance', 'Vessels', 'Jurisdiction']),
  ('0401', ARRAY['Vessels', 'Trading Limits'])
) AS n(code, labels)
WHERE c."code" = n.code;

-- Existing Policy No. di baris pertama, seperti CI renewal Cendanawati.
UPDATE "cover_types"
SET "detail_labels" = ARRAY['Existing Policy No.'] || "detail_labels"
WHERE NOT ('Existing Policy No.' = ANY ("detail_labels"));
