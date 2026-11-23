-- Tanggal ETD deklarasi MOP dari kolom ETD General Marine Report (Agus, 23 November 2026). Tanggal
-- deklarasi tetap inception_date (Date of Issue).
ALTER TABLE "policies" ADD COLUMN "etd_date" DATE;

-- Deklarasi hasil upload sebelumnya menyimpan ETD di keterangan ("ETD dd/mm/yyyy"); pindahkan ke
-- kolom baru. Keterangannya tidak diubah.
UPDATE "policies" AS p
SET "etd_date" = to_date(substring(p."remarks" from 'ETD (\d{2}/\d{2}/\d{4})'), 'DD/MM/YYYY')
FROM "lookup_values" AS t
WHERE t."id" = p."policy_type_id"
  AND t."code" = 'declaration'
  AND p."remarks" ~ 'ETD \d{2}/\d{2}/\d{4}';
