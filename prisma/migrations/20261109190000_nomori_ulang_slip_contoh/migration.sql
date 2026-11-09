-- Nomori ulang slip data contoh (Agus, 9 November 2026). Nomornya ditulis
-- tangan di data contoh (bulan VII/VIII), tidak lewat counter, sehingga di
-- daftar terlihat kembar dengan nomor bulan berjalan, misalnya
-- 002/LCH-PLCMT/PS-PAREQ/VIII/2026 di samping 002/LCH-PLCMT/PS-MV/XI/2026.
--
-- Running nomor dipakai bersama semua COB dan mulai dari 1 tiap tanggal 1
-- (WIB). Slip contoh mendapat nomor berikutnya dari counter bulan saat slip
-- itu di-release, atau saat dibuat bila belum pernah di-release. Kode cover
-- di nomornya tetap. Hanya kelima nomor data contoh yang disentuh, dan hanya
-- bila bulan di nomornya berbeda dari bulan rilisnya; nomor slip lain tidak
-- berubah. Nomor QS, CI, dan Cover Note diturunkan dari nomor PS, jadi ikut.
DO $$
DECLARE
  r RECORD;
  v_pattern TEXT;
  v_reset TEXT;
  v_romans TEXT[] := ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  v_yr INT;
  v_mon INT;
  v_period TEXT;
  v_digits INT;
  v_seq INT;
  v_cover TEXT;
  v_new_no TEXT;
BEGIN
  SELECT dt.number_pattern, lv.code INTO v_pattern, v_reset
  FROM document_types dt JOIN lookup_values lv ON lv.id = dt.reset_period_id
  WHERE dt.code = 'PS';
  IF v_pattern IS NULL THEN
    RETURN;
  END IF;
  v_digits := coalesce(substring(v_pattern FROM '\{seq:(\d+)\}')::int, 4);

  FOR r IN
    SELECT id, slip_no, coalesce(released_at, created_at) AS issued_at
    FROM placing_slips
    WHERE slip_no IN (
      '001/LCH-PLCMT/PS/VIII/2026',
      '002/LCH-PLCMT/PS-PAREQ/VIII/2026',
      '003/LCH-PLCMT/PS-MC/VIII/2026',
      '004/LCH-PLCMT/PS-CAR/VII/2026',
      '005/LCH-PLCMT/PS-IAR/VIII/2026'
    )
    ORDER BY coalesce(released_at, created_at), slip_no
  LOOP
    v_yr := extract(year FROM r.issued_at AT TIME ZONE 'Asia/Jakarta')::int;
    v_mon := extract(month FROM r.issued_at AT TIME ZONE 'Asia/Jakarta')::int;
    CONTINUE WHEN split_part(r.slip_no, '/', 4) = v_romans[v_mon]
      AND split_part(r.slip_no, '/', 5) = v_yr::text;

    v_period := CASE v_reset
      WHEN 'continuous' THEN 'ALL'
      WHEN 'yearly' THEN v_yr::text
      ELSE v_yr::text || '-' || lpad(v_mon::text, 2, '0')
    END;
    v_cover := nullif(regexp_replace(split_part(r.slip_no, '/', 3), '^PS-?', ''), '');

    -- Nomor yang sudah dipakai slip lain dilewati, sama seperti counter biasa.
    LOOP
      INSERT INTO number_counters (document_type_code, period, last_number, updated_at)
      VALUES ('PS', v_period, 1, now())
      ON CONFLICT (document_type_code, period)
      DO UPDATE SET last_number = number_counters.last_number + 1, updated_at = now()
      RETURNING last_number INTO v_seq;

      v_new_no := CASE WHEN v_cover IS NULL
        THEN regexp_replace(v_pattern, '[-/]?\{COVER\}', '', 'g')
        ELSE replace(v_pattern, '{COVER}', v_cover)
      END;
      v_new_no := regexp_replace(v_new_no, '\{seq(:\d+)?\}', lpad(v_seq::text, v_digits, '0'), 'g');
      v_new_no := replace(v_new_no, '{MMROMAN}', v_romans[v_mon]);
      v_new_no := replace(v_new_no, '{MM}', lpad(v_mon::text, 2, '0'));
      v_new_no := replace(v_new_no, '{YYYY}', v_yr::text);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM placing_slips WHERE slip_no = v_new_no);
    END LOOP;

    UPDATE placing_slips SET slip_no = v_new_no, updated_at = now() WHERE id = r.id;
    RAISE NOTICE 'Slip % dinomori ulang menjadi %', r.slip_no, v_new_no;
  END LOOP;
END $$;
