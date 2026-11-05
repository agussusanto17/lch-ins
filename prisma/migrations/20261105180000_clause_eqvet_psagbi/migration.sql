-- Klausul EQVET hanya untuk slip dengan cover gempa, jadi dipetakan ke type of
-- cover PSAGBI (0105). Klausul yang type of cover-nya sudah diatur lewat master
-- tidak diubah.
UPDATE "clauses" AS c
SET "cover_type_id" = ct."id",
    "updated_at" = CURRENT_TIMESTAMP
FROM "cover_types" AS ct
JOIN "classes_of_business" AS cob ON cob."id" = ct."cob_id"
WHERE c."source_group" = 'EQVET'
  AND c."cover_type_id" IS NULL
  AND cob."code" = '01'
  AND ct."code" = '0105';
