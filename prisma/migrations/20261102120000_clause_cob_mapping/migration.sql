-- Petakan klausul pustaka LCH ke COB supaya pemilih klausul di slip tersaring.
-- Klausul yang COB atau type of cover-nya sudah diisi lewat master tidak diubah.
UPDATE "clauses" AS c
SET "cob_id" = cob."id",
    "cover_type_id" = ct."id",
    "updated_at" = CURRENT_TIMESTAMP
FROM (VALUES
  ('PAR', '01', NULL),
  ('EQVET', '01', NULL),
  ('MV', '02', NULL),
  ('Cargo', '03', NULL),
  ('CIT', '03', '0308'),
  ('MB', '08', '0803'),
  ('PL', '09', NULL),
  ('PA', '10', NULL),
  ('CIS', '12', '1203'),
  ('Fidelity', '12', '1202')
) AS m(source_group, cob_code, cover_code)
JOIN "classes_of_business" AS cob ON cob."code" = m.cob_code
LEFT JOIN "cover_types" AS ct ON ct."code" = m.cover_code
WHERE c."source_group" = m.source_group
  AND c."cob_id" IS NULL
  AND c."cover_type_id" IS NULL;
