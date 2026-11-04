-- Rate slip: Property per mil, COB lain persen (permintaan 4 November 2026).
-- Master COB ikut diubah supaya kolom Mode rate di master data sesuai aturan
-- di lib/calc.ts (rateModeFor).
UPDATE "classes_of_business" AS c
SET "rate_mode_id" = rm."id",
    "updated_at" = CURRENT_TIMESTAMP
FROM "lookup_values" AS rm
WHERE rm."lookup_type" = 'rate_mode'
  AND rm."code" = 'percent'
  AND c."code" <> '01'
  AND c."rate_mode_id" <> rm."id";

-- Rate slip lama COB standar (selain Property dan Motor Vehicle) diisi per
-- mil. Nilainya dibagi 10 supaya premi yang tersimpan dan sudah tercetak tetap
-- sama: 1,35‰ menjadi 0,135%. Kolom premium tidak disentuh.
UPDATE "slip_rate_lines" AS r
SET "rate" = r."rate" / 10,
    "rate_min" = r."rate_min" / 10,
    "rate_max" = r."rate_max" / 10,
    "label" = CASE WHEN r."label" = 'Rate (‰)' THEN 'Rate (%)' ELSE r."label" END,
    "updated_at" = CURRENT_TIMESTAMP
FROM "placing_slips" AS s
JOIN "classes_of_business" AS c ON c."id" = s."cob_id"
JOIN "lookup_values" AS k ON k."lookup_type" = 'rate_line_kind' AND k."code" = 'rate'
WHERE s."id" = r."slip_id"
  AND r."kind_id" = k."id"
  AND c."code" NOT IN ('01', '02');
