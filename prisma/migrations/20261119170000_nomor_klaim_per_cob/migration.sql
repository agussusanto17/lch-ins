-- Nomor klaim berurutan per COB (Team LCH, 19 November 2026): CLM-LCH001/MV/XI/2026,
-- CLM-LCH002/MV/XI/2026, lalu CLM-LCH001/PAR/XI/2026 untuk PAR. Counter klaim sekarang per kode
-- cover di nomor, dengan kunci periode "<periode>/<kode>", misalnya "2026-11/MV".
--
-- Counter per kode diisi dari nomor klaim yang sudah ada, supaya klaim baru tidak memakai nomor
-- yang sudah terpakai. Nomor klaim lama tidak diubah. Periode mengikuti periode reset jenis
-- dokumen CLM, sama dengan counterPeriod di server/services/number-generator.ts.
INSERT INTO "number_counters" ("document_type_code", "period", "last_number", "updated_at")
SELECT 'CLM', s."period", max(s."seq"), now()
FROM (
  SELECT
    (c.m[1])::int AS "seq",
    CASE rp."code"
      WHEN 'continuous' THEN 'ALL'
      WHEN 'yearly' THEN c.m[4]
      ELSE c.m[4] || '-' || lpad(
        array_position(
          ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'],
          c.m[3]
        )::text,
        2,
        '0'
      )
    END || '/' || c.m[2] AS "period"
  FROM (
    SELECT regexp_match(
      "claim_no",
      '^CLM-LCH([0-9]+)/([^/]+)/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)/([0-9]{4})$'
    ) AS m
    FROM "claims"
  ) c
  CROSS JOIN (
    SELECT lv."code"
    FROM "document_types" dt
    JOIN "lookup_values" lv ON lv."id" = dt."reset_period_id"
    WHERE dt."code" = 'CLM'
  ) rp
  WHERE c.m IS NOT NULL
) s
GROUP BY s."period"
ON CONFLICT ("document_type_code", "period")
DO UPDATE SET
  "last_number" = GREATEST("number_counters"."last_number", EXCLUDED."last_number"),
  "updated_at" = now();
