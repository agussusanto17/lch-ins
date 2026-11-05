-- Loading Rate Comprehensive bukan rate casco, tetapi baris itu dulu ikut
-- mendapat batas casco OJK karena namanya memuat "Comprehensive", sehingga
-- loading 0,15% dianggap di bawah batas. Batas yang sempat tersimpan dihapus.
UPDATE "slip_rate_lines"
SET "rate_min" = NULL, "rate_max" = NULL
WHERE "label" ILIKE 'loading%'
  AND ("rate_min" IS NOT NULL OR "rate_max" IS NOT NULL);
