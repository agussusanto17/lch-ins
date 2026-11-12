-- Deductible per lokasi, kendaraan, dan objek (Agus, 13 November 2026).
--
-- Sebelumnya satu daftar deductible per cover berlaku untuk semua lokasi,
-- kendaraan, atau objek, dan disimpan di baris lokasi atau objek pertama.
-- Baris unit lain tidak pernah dibaca form maupun dokumen. Sekarang setiap
-- unit memakai deductible-nya sendiri, jadi deductible unit pertama disalin
-- ke cover yang sama di unit lain supaya slip lama tetap sama artinya.
-- Cover yang tidak ada di unit pertama dikosongkan, karena dulu tidak
-- dipakai. Slip ber-section (CAR, EAR) tetap per section dan tidak diubah.

-- 1) Property: unit = lokasi. Baris tanpa lokasi yang dikenal ikut lokasi
--    pertama, sama seperti aplikasi. Cover dicocokkan dengan label dan
--    urutannya.
WITH "loc" AS (
  SELECT l."id", l."slip_id",
         ROW_NUMBER() OVER (PARTITION BY l."slip_id" ORDER BY l."sort_order", l."created_at", l."id") AS "no",
         COUNT(*) OVER (PARTITION BY l."slip_id") AS "total"
  FROM "slip_locations" AS l
  JOIN "placing_slips" AS s ON s."id" = l."slip_id"
  JOIN "classes_of_business" AS c ON c."id" = s."cob_id"
  WHERE upper(trim(c."name")) = 'PROPERTY'
),
"line" AS (
  SELECT r."id", r."slip_id", r."label", r."deductibles", o."no",
         ROW_NUMBER() OVER (
           PARTITION BY r."slip_id", o."no", r."label"
           ORDER BY r."sort_order", r."created_at", r."id"
         ) AS "k"
  FROM "slip_rate_lines" AS r
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT loc."no" FROM "loc" WHERE loc."id" = r."location_id" AND loc."slip_id" = r."slip_id"),
      1
    ) AS "no"
  ) AS o
  WHERE r."slip_id" IN (SELECT "slip_id" FROM "loc" WHERE "total" > 1)
)
UPDATE "slip_rate_lines" AS t
SET "deductibles" = COALESCE(src."deductibles", '{}'),
    "updated_at" = CURRENT_TIMESTAMP
FROM "line" AS tl
LEFT JOIN "line" AS src
  ON src."slip_id" = tl."slip_id"
 AND src."no" = 1
 AND src."label" = tl."label"
 AND src."k" = tl."k"
WHERE t."id" = tl."id"
  AND tl."no" > 1
  AND t."deductibles" IS DISTINCT FROM COALESCE(src."deductibles", '{}');

-- 2) Motor Vehicle dan COB lain tanpa section: unit = baris Interest.
--    Baris tanpa objek ikut objek pertama. Objek "limit saja" (COB selain
--    Motor Vehicle) bukan unit deductible, jadi tidak diubah. Baris rate
--    dicocokkan dengan label dan urutannya; TPL dan PA dengan urutannya.
WITH "item" AS (
  SELECT i."id", i."slip_id",
         ROW_NUMBER() OVER (PARTITION BY i."slip_id" ORDER BY i."sort_order", i."created_at", i."id") AS "no",
         COUNT(*) OVER (PARTITION BY i."slip_id") AS "total",
         (upper(trim(c."name")) <> 'MOTOR VEHICLE' AND i."is_limit_only") AS "limit_only"
  FROM "slip_items" AS i
  JOIN "placing_slips" AS s ON s."id" = i."slip_id"
  JOIN "classes_of_business" AS c ON c."id" = s."cob_id"
  WHERE i."kind" = 'Interest'
    AND upper(trim(c."name")) <> 'PROPERTY'
    AND NOT (s."uses_sections" AND upper(trim(c."name")) <> 'MOTOR VEHICLE')
),
"line" AS (
  SELECT r."id", r."slip_id", r."label", r."deductibles", k."code" AS "kind",
         it."no", it."limit_only",
         ROW_NUMBER() OVER (
           PARTITION BY r."slip_id", it."no", k."code",
                        CASE WHEN k."code" = 'rate' THEN r."label" END
           ORDER BY r."sort_order", r."created_at", r."id"
         ) AS "k"
  FROM "slip_rate_lines" AS r
  JOIN "lookup_values" AS k ON k."id" = r."kind_id"
  JOIN "item" AS it
    ON it."slip_id" = r."slip_id"
   AND (it."id" = r."vehicle_item_id" OR (r."vehicle_item_id" IS NULL AND it."no" = 1))
  WHERE it."total" > 1
)
UPDATE "slip_rate_lines" AS t
SET "deductibles" = COALESCE(src."deductibles", '{}'),
    "updated_at" = CURRENT_TIMESTAMP
FROM "line" AS tl
LEFT JOIN "line" AS src
  ON src."slip_id" = tl."slip_id"
 AND src."no" = 1
 AND src."kind" = tl."kind"
 AND src."k" = tl."k"
 AND (tl."kind" <> 'rate' OR src."label" = tl."label")
WHERE t."id" = tl."id"
  AND tl."no" > 1
  AND NOT tl."limit_only"
  AND t."deductibles" IS DISTINCT FROM COALESCE(src."deductibles", '{}');
