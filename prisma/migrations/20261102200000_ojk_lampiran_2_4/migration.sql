-- Data Lampiran II sampai IV SE OJK 6/SEOJK.05/2017 disamakan dengan PDF.

-- 1. Nama provinsi zona gempa (Lampiran III Tabel III.D) yang terpotong saat
--    ekstraksi: nama provinsi dua baris hanya terbaca baris pertamanya, dan
--    NTB serta NTT tergabung menjadi "NUSA TENGGARA". Zona tidak berubah.
UPDATE "eq_zones"
SET "province" = 'KEPULAUAN BANGKA BELITUNG', "updated_at" = CURRENT_TIMESTAMP
WHERE "province" = 'KEPULAUAN BANGKA';

UPDATE "eq_zones"
SET "province" = 'NANGGROE ACEH DARUSSALAM', "updated_at" = CURRENT_TIMESTAMP
WHERE "province" = 'NANGGROE ACEH';

UPDATE "eq_zones"
SET "province" = 'NUSA TENGGARA BARAT', "updated_at" = CURRENT_TIMESTAMP
WHERE "province" = 'NUSA TENGGARA'
  AND "regency" IN (
    'KAB. BIMA',
    'KAB. DOMPU',
    'KAB. LOMBOK BARAT',
    'KAB. LOMBOK TENGAH',
    'KAB. LOMBOK TIMUR',
    'KAB. LOMBOK UTARA',
    'KAB. SUMBAWA',
    'KAB. SUMBAWA BARAT',
    'KOTA BIMA',
    'KOTA MATARAM'
  );

UPDATE "eq_zones"
SET "province" = 'NUSA TENGGARA TIMUR', "updated_at" = CURRENT_TIMESTAMP
WHERE "province" = 'NUSA TENGGARA';

UPDATE "eq_zones"
SET "regency" = regexp_replace("regency", '\s+', ' ', 'g'), "updated_at" = CURRENT_TIMESTAMP
WHERE "regency" ~ '\s\s';

-- 2. Perluasan banjir (Tabel II.B) dan gempa (Tabel III.E) KBM ditulis per
--    wilayah, menggantikan satu rentang gabungan semua wilayah.
DELETE FROM "tariff_motor_extension"
WHERE "cover" IN ('Banjir termasuk angin topan', 'Gempa bumi dan tsunami');

INSERT INTO "tariff_motor_extension" ("cover", "coverage_type", "basis", "rate_min", "rate_max", "note", "updated_at")
SELECT v."cover", v."coverage_type"::"CoverageType", v."basis", v."rate_min", v."rate_max", v."note", CURRENT_TIMESTAMP
FROM (VALUES
  ('Banjir termasuk angin topan', 'Comprehensive', 'Uang pertanggungan, Wilayah 1: Sumatera dan kepulauannya', 0.075, 0.1, 'Lampiran II Tabel II.B. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Banjir termasuk angin topan', 'Comprehensive', 'Uang pertanggungan, Wilayah 2: DKI Jakarta, Jawa Barat, Banten', 0.1, 0.125, 'Lampiran II Tabel II.B. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Banjir termasuk angin topan', 'Comprehensive', 'Uang pertanggungan, Wilayah 3: selain Wilayah 1 dan 2', 0.075, 0.1, 'Lampiran II Tabel II.B. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Banjir termasuk angin topan', 'TotalLossOnly', 'Uang pertanggungan, Wilayah 1: Sumatera dan kepulauannya', 0.05, 0.075, 'Lampiran II Tabel II.B. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Banjir termasuk angin topan', 'TotalLossOnly', 'Uang pertanggungan, Wilayah 2: DKI Jakarta, Jawa Barat, Banten', 0.075, 0.1, 'Lampiran II Tabel II.B. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Banjir termasuk angin topan', 'TotalLossOnly', 'Uang pertanggungan, Wilayah 3: selain Wilayah 1 dan 2', 0.05, 0.075, 'Lampiran II Tabel II.B. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Gempa bumi dan tsunami', 'Comprehensive', 'Uang pertanggungan, Wilayah 1: Sumatera dan kepulauannya', 0.12, 0.135, 'Lampiran III Tabel III.E. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Gempa bumi dan tsunami', 'Comprehensive', 'Uang pertanggungan, Wilayah 2: DKI Jakarta, Jawa Barat, Banten', 0.1, 0.125, 'Lampiran III Tabel III.E. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Gempa bumi dan tsunami', 'Comprehensive', 'Uang pertanggungan, Wilayah 3: selain Wilayah 1 dan 2', 0.075, 0.135, 'Lampiran III Tabel III.E. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Gempa bumi dan tsunami', 'TotalLossOnly', 'Uang pertanggungan, Wilayah 1: Sumatera dan kepulauannya', 0.085, 0.11, 'Lampiran III Tabel III.E. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Gempa bumi dan tsunami', 'TotalLossOnly', 'Uang pertanggungan, Wilayah 2: DKI Jakarta, Jawa Barat, Banten', 0.075, 0.1, 'Lampiran III Tabel III.E. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian'),
  ('Gempa bumi dan tsunami', 'TotalLossOnly', 'Uang pertanggungan, Wilayah 3: selain Wilayah 1 dan 2', 0.05, 0.075, 'Lampiran III Tabel III.E. Risiko sendiri 10% dari ganti rugi, minimal Rp500.000 per kejadian')
) AS v("cover", "coverage_type", "basis", "rate_min", "rate_max", "note");
