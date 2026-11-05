-- Rate slip Motor Vehicle per kendaraan (Harry, 5 November 2026, REQ-036
-- tahap 2). Baris rate casco dan perluasan, TPL, dan PA menunjuk kendaraannya,
-- yaitu baris Interest di slip_items.
ALTER TABLE "slip_rate_lines" ADD COLUMN "vehicle_item_id" UUID;

ALTER TABLE "slip_rate_lines" ADD CONSTRAINT "slip_rate_lines_vehicle_item_id_fkey" FOREIGN KEY ("vehicle_item_id") REFERENCES "slip_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Kendaraan slip Motor Vehicle yang sudah ada, bernomor sesuai urutannya.
CREATE TEMP TABLE "mv_vehicles" AS
SELECT i."slip_id", i."id", COALESCE(i."amount", 0) AS "amount",
       ROW_NUMBER() OVER (PARTITION BY i."slip_id" ORDER BY i."sort_order", i."created_at", i."id") AS "no",
       COUNT(*) OVER (PARTITION BY i."slip_id") AS "total"
FROM "slip_items" AS i
JOIN "placing_slips" AS s ON s."id" = i."slip_id"
JOIN "classes_of_business" AS c ON c."id" = s."cob_id"
WHERE upper(trim(c."name")) = 'MOTOR VEHICLE'
  AND i."kind" = 'Interest';

-- Semua baris rate, TPL, dan PA yang sudah ada menjadi milik kendaraan
-- pertama.
UPDATE "slip_rate_lines" AS r
SET "vehicle_item_id" = v."id"
FROM "mv_vehicles" AS v
WHERE r."slip_id" = v."slip_id"
  AND v."no" = 1;

-- Slip dengan beberapa kendaraan dulu memakai satu set rate untuk total TSI.
-- Kendaraan lain mendapat salinan baris rate casco dan perluasan dengan rate
-- yang sama, jadi total premi tetap. Salinan tidak membawa deductible
-- (deductible per cover tetap di kendaraan pertama) dan tidak membawa batas
-- OJK tersimpan, supaya batasnya dihitung ulang per kendaraan. TPL dan PA
-- tetap di kendaraan pertama.
INSERT INTO "slip_rate_lines" ("slip_id", "kind_id", "label", "limit_amount", "rate", "premium", "rate_min", "rate_max", "loss_limit_pct", "out_of_bounds_reason", "deductible", "deductibles", "sort_order", "vehicle_item_id", "updated_at")
SELECT r."slip_id", r."kind_id", r."label", NULL, r."rate",
       ROUND(v."amount" * COALESCE(r."rate", 0) / 100, 2),
       NULL, NULL, NULL, r."out_of_bounds_reason", NULL, '{}',
       r."sort_order" + 100 * (v."no" - 1)::INTEGER, v."id", CURRENT_TIMESTAMP
FROM "slip_rate_lines" AS r
JOIN "lookup_values" AS k ON k."id" = r."kind_id"
JOIN "mv_vehicles" AS first ON first."id" = r."vehicle_item_id" AND first."no" = 1
JOIN "mv_vehicles" AS v ON v."slip_id" = r."slip_id" AND v."no" > 1
WHERE k."lookup_type" = 'rate_line_kind'
  AND k."code" = 'rate';

-- Premi casco dan perluasan kendaraan pertama slip itu kini dari TSI
-- kendaraan pertama saja, dan batas OJK-nya dihitung ulang per kendaraan.
UPDATE "slip_rate_lines" AS r
SET "premium" = ROUND(v."amount" * COALESCE(r."rate", 0) / 100, 2),
    "rate_min" = NULL,
    "rate_max" = NULL
FROM "mv_vehicles" AS v, "lookup_values" AS k
WHERE r."vehicle_item_id" = v."id"
  AND v."no" = 1
  AND v."total" > 1
  AND r."kind_id" = k."id"
  AND k."lookup_type" = 'rate_line_kind'
  AND k."code" = 'rate';

DROP TABLE "mv_vehicles";
