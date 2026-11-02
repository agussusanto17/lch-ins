-- Deductible per section dari sebelum aturan per cover (PR #53) dipindah ke
-- deductible per cover, supaya form placing slip hanya punya satu tempat
-- isian deductible. Tiap baris lama dipetakan ke cover lewat kata kunci
-- perilnya. Kode cover di dalam kurung, misalnya "(FLEXAS)", diutamakan.
-- Tanpa kode, baris yang menyebut dua peril (misalnya banjir dan gempa) masuk
-- ke keduanya. Baris yang tidak cocok masuk ke baris rate pertama slip, atau ke
-- baris BI pertama untuk deductible Section 2. Teks yang sudah ada di cover
-- tujuan tidak ditimpa; teks lama ditambahkan di belakangnya.
WITH legacy AS (
  SELECT i."id", i."slip_id", i."kind"::text AS kind, btrim(i."description") AS body, i."sort_order",
    substring(upper(i."description") from '\((FLEXAS|FWTWD|RSMDCC|EQVET)\)') AS code
  FROM "slip_items" i
  WHERE i."kind"::text IN ('DeductibleSection1', 'DeductibleSection2')
    AND btrim(i."description") <> ''
),
matched AS (
  SELECT l."id" AS item_id, r."id" AS line_id, l.body, l."sort_order"
  FROM legacy l
  JOIN "slip_rate_lines" r ON r."slip_id" = l."slip_id"
  WHERE (
    l.kind = 'DeductibleSection2' AND (
      (l.body ~* '(earthquake|gempa|eqvet)' AND r."label" ~* '^BI EQVET')
      OR (l.body !~* '(earthquake|gempa|eqvet)' AND r."label" ~* '^BI PAR')
    )
  ) OR (
    l.kind = 'DeductibleSection1' AND l.code IS NOT NULL AND r."label" ~* ('^' || l.code || '$')
  ) OR (
    l.kind = 'DeductibleSection1' AND l.code IS NULL AND (
      (l.body ~* '(eqvet|earthquake|gempa|tsunami|volcan)'
        AND (r."label" ~* '^EQVET$' OR r."label" ~* 'earthquake'))
      OR (l.body ~* '(fwtwd|flood|banjir|windstorm|tempest|water damage)'
        AND (r."label" ~* '^FWTWD$' OR r."label" ~* 'flood'))
      OR (l.body ~* '(rsmdcc|riot|strike|huru.?hara|civil commotion|malicious)'
        AND (r."label" ~* '^RSMDCC$' OR r."label" ~* 'riot'))
      OR (l.body ~* '(other.?s? loss|vehicle impact|tubrukan)'
        AND r."label" ~* '^other loss')
      OR (l.body ~* '(flexas|fire|kebakaran|lightning|material damage)'
        AND r."label" ~* '^FLEXAS$')
    )
  )
),
fallback AS (
  SELECT l."id" AS item_id,
    (
      SELECT r."id" FROM "slip_rate_lines" r
      WHERE r."slip_id" = l."slip_id"
      ORDER BY (l.kind = 'DeductibleSection2' AND r."label" ~* '^BI') DESC, r."sort_order"
      LIMIT 1
    ) AS line_id,
    l.body, l."sort_order"
  FROM legacy l
  WHERE NOT EXISTS (SELECT 1 FROM matched m WHERE m.item_id = l."id")
),
placed AS (
  SELECT x.line_id, string_agg(x.body, '; ' ORDER BY x."sort_order") AS body
  FROM (
    SELECT * FROM matched
    UNION ALL
    SELECT * FROM fallback WHERE line_id IS NOT NULL
  ) x
  GROUP BY x.line_id
)
UPDATE "slip_rate_lines" r
SET "deductible" = CASE
      WHEN coalesce(btrim(r."deductible"), '') = '' THEN p.body
      ELSE r."deductible" || '; ' || p.body
    END,
    "updated_at" = CURRENT_TIMESTAMP
FROM placed p
WHERE r."id" = p.line_id;

-- Slip tanpa baris rate tidak punya tempat deductible per cover; isinya
-- disimpan di special conditions supaya tidak hilang.
UPDATE "placing_slips" p
SET "special_conditions" = concat_ws(E'\n', nullif(btrim(p."special_conditions"), ''), 'Deductible: ' || x.body),
    "updated_at" = CURRENT_TIMESTAMP
FROM (
  SELECT i."slip_id", string_agg(btrim(i."description"), '; ' ORDER BY i."sort_order") AS body
  FROM "slip_items" i
  WHERE i."kind"::text IN ('DeductibleSection1', 'DeductibleSection2')
    AND btrim(i."description") <> ''
    AND NOT EXISTS (SELECT 1 FROM "slip_rate_lines" r WHERE r."slip_id" = i."slip_id")
  GROUP BY i."slip_id"
) x
WHERE p."id" = x."slip_id";

DELETE FROM "slip_items"
WHERE "kind"::text IN ('DeductibleSection1', 'DeductibleSection2');
