-- Baris rate utama yang batas OJK-nya terbaca sebagai kecelakaan diri (PA)
-- hanya karena labelnya memuat "driver" atau "passenger", misalnya
-- "Theft by Driver" dengan batas 0,5%. Batas itu salah dan ikut tersimpan saat
-- slip disimpan, jadi dikosongkan. Baris di bagian PA (jenis pa) tidak disentuh.
UPDATE "slip_rate_lines" l
SET "rate_min" = NULL,
    "rate_max" = NULL
FROM "lookup_values" k
WHERE k."id" = l."kind_id"
  AND k."lookup_type" = 'rate_line_kind'
  AND k."code" = 'rate'
  AND l."label" ~* '(driver|pengemudi|passenger|penumpang)'
  AND l."label" !~* '\m(pa|personal accident|kecelakaan diri)\M'
  AND (
    (l."rate_min" = 0.5 AND l."rate_max" = 0.5)
    OR (l."rate_min" = 0.1 AND l."rate_max" = 0.1)
  );
