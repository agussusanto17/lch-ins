-- Additional discount Quotation ikut ke polis (Agus, 25 November 2026): persen dari gross premium,
-- ditanggung LCH, tidak mengurangi premi ke asuransi.
ALTER TABLE "policies" ADD COLUMN "additional_discount_pct" DECIMAL(12,6) NOT NULL DEFAULT 0;

-- Polis Baru/Renewal dari slip yang sudah punya additional discount ikut persennya.
UPDATE "policies" AS p
SET "additional_discount_pct" = s."additional_discount_pct"
FROM "placing_slips" AS s, "lookup_values" AS t
WHERE s."id" = p."placing_slip_id"
  AND t."id" = p."policy_type_id"
  AND t."code" IN ('new', 'renewal')
  AND s."open_cover" = false
  AND s."additional_discount_pct" > 0;
