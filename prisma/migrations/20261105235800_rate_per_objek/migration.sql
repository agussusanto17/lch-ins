-- Rate slip COB selain Property dan Motor Vehicle per objek (Agus, 5 November
-- 2026), misalnya peserta PA atau unit MB dan CPM. Baris rate menunjuk
-- objeknya (baris Interest) lewat vehicle_item_id, kolom yang sama dengan rate
-- per kendaraan.

-- Objek slip COB lain yang sudah ada, bernomor sesuai urutannya.
CREATE TEMP TABLE "std_items" AS
SELECT i."slip_id", i."id", COALESCE(i."amount", 0) AS "amount",
       ROW_NUMBER() OVER (PARTITION BY i."slip_id" ORDER BY i."sort_order", i."created_at", i."id") AS "no",
       COUNT(*) OVER (PARTITION BY i."slip_id") AS "total"
FROM "slip_items" AS i
JOIN "placing_slips" AS s ON s."id" = i."slip_id"
JOIN "classes_of_business" AS c ON c."id" = s."cob_id"
WHERE upper(trim(c."name")) NOT IN ('PROPERTY', 'MOTOR VEHICLE')
  AND i."kind" = 'Interest';

-- Semua baris rate yang sudah ada menjadi milik objek pertama.
UPDATE "slip_rate_lines" AS r
SET "vehicle_item_id" = v."id"
FROM "std_items" AS v
WHERE r."slip_id" = v."slip_id"
  AND v."no" = 1
  AND r."vehicle_item_id" IS NULL;

-- Slip dengan beberapa objek dulu memakai satu rate untuk total nilai. Objek
-- lain mendapat salinan baris rate dengan rate yang sama, jadi total premi
-- tetap. Salinan tidak membawa deductible; deductible per cover tetap di
-- objek pertama.
INSERT INTO "slip_rate_lines" ("slip_id", "kind_id", "label", "limit_amount", "rate", "premium", "rate_min", "rate_max", "loss_limit_pct", "out_of_bounds_reason", "deductible", "deductibles", "sort_order", "vehicle_item_id", "updated_at")
SELECT r."slip_id", r."kind_id", r."label", NULL, r."rate",
       ROUND(v."amount" * COALESCE(r."rate", 0) / 100, 2),
       r."rate_min", r."rate_max", NULL, r."out_of_bounds_reason", NULL, '{}',
       r."sort_order" + 100 * (v."no" - 1)::INTEGER, v."id", CURRENT_TIMESTAMP
FROM "slip_rate_lines" AS r
JOIN "std_items" AS first ON first."id" = r."vehicle_item_id" AND first."no" = 1
JOIN "std_items" AS v ON v."slip_id" = r."slip_id" AND v."no" > 1;

-- Premi baris objek pertama slip itu kini dari nilai objek pertama saja.
UPDATE "slip_rate_lines" AS r
SET "premium" = ROUND(v."amount" * COALESCE(r."rate", 0) / 100, 2)
FROM "std_items" AS v
WHERE r."vehicle_item_id" = v."id"
  AND v."no" = 1
  AND v."total" > 1;

DROP TABLE "std_items";
