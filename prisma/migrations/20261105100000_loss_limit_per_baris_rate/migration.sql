-- Loss limit slip Property pindah dari isian nominal di slip ke persentase per
-- baris rate (Harry, 5 November 2026): premi = sum insured × rate × persentase.
-- Persen premi loss limit slip lama disalin ke baris rate selain BI, jadi premi
-- baris itu tetap sama. Kolom loss_limit dan loss_limit_premium_pct di
-- placing_slips dibiarkan supaya kode versi sebelumnya tetap jalan selama
-- deploy, tapi tidak dibaca lagi.
ALTER TABLE "slip_rate_lines" ADD COLUMN "loss_limit_pct" DECIMAL(7,4);

UPDATE "slip_rate_lines" AS r
SET "loss_limit_pct" = s."loss_limit_premium_pct"
FROM "placing_slips" AS s, "lookup_values" AS k
WHERE r."slip_id" = s."id"
  AND r."kind_id" = k."id"
  AND k."lookup_type" = 'rate_line_kind'
  AND k."code" = 'rate'
  AND s."loss_limit_premium_pct" IS NOT NULL
  AND s."loss_limit_premium_pct" < 100
  AND r."label" NOT IN ('BI PAR (FLEXAS + FWTWD + RSMDCC + Others)', 'BI EQVET');
