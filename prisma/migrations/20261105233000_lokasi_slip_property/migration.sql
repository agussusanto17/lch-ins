-- Slip Property bisa punya beberapa lokasi risiko (Harry, 5 November 2026,
-- REQ-036). Tiap lokasi punya okupasi, kelas konstruksi, sum insured Section 1
-- dan 2, serta baris rate sendiri. Okupasi, risk location, dan kelas di
-- placing_slips tetap diisi dari lokasi pertama.
CREATE TABLE "slip_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slip_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "risk_location" TEXT,
    "occupation_id" UUID,
    "occupation_label" TEXT,
    "construction_class_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slip_locations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "slip_items" ADD COLUMN "location_id" UUID;

ALTER TABLE "slip_rate_lines" ADD COLUMN "location_id" UUID;

CREATE INDEX "slip_locations_slip_id_sort_order_idx" ON "slip_locations"("slip_id", "sort_order");

ALTER TABLE "slip_locations" ADD CONSTRAINT "slip_locations_slip_id_fkey" FOREIGN KEY ("slip_id") REFERENCES "placing_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slip_locations" ADD CONSTRAINT "slip_locations_occupation_id_fkey" FOREIGN KEY ("occupation_id") REFERENCES "occupations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "slip_locations" ADD CONSTRAINT "slip_locations_construction_class_id_fkey" FOREIGN KEY ("construction_class_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "slip_items" ADD CONSTRAINT "slip_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "slip_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slip_rate_lines" ADD CONSTRAINT "slip_rate_lines_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "slip_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Slip Property yang sudah ada mendapat satu lokasi dari isian slip. Baris sum
-- insured Section 1 dan 2 serta baris rate (bukan TPL/PA) ditautkan ke lokasi
-- itu, jadi premi dan dokumen slip lama tidak berubah.
INSERT INTO "slip_locations" ("slip_id", "sort_order", "risk_location", "occupation_id", "occupation_label", "construction_class_id", "updated_at")
SELECT s."id", 0, s."risk_location", s."occupation_id", s."occupation_label", s."construction_class_id", CURRENT_TIMESTAMP
FROM "placing_slips" AS s
JOIN "classes_of_business" AS c ON c."id" = s."cob_id"
WHERE upper(trim(c."name")) = 'PROPERTY';

UPDATE "slip_items" AS i
SET "location_id" = l."id"
FROM "slip_locations" AS l
WHERE i."slip_id" = l."slip_id"
  AND i."kind" IN ('SumInsuredSection1', 'SumInsuredSection2');

UPDATE "slip_rate_lines" AS r
SET "location_id" = l."id"
FROM "slip_locations" AS l, "lookup_values" AS k
WHERE r."slip_id" = l."slip_id"
  AND r."kind_id" = k."id"
  AND k."lookup_type" = 'rate_line_kind'
  AND k."code" = 'rate';
