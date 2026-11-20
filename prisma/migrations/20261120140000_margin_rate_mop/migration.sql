-- Margin rate deklarasi MOP (Agus, 20 November 2026): premi deklarasi mengikuti rate ke klien
-- (misalnya 0,1% dari polis Merimen), sedangkan rate di slip MOP adalah rate ke asuransi (0,085%).
-- Kolom ini menyimpan premi ke asuransi; margin = premi − premi ke asuransi.
ALTER TABLE "policies" ADD COLUMN "insurer_premium" DECIMAL(18,2);

-- Deklarasi yang sudah ada: premi ke asuransi dihitung dari rate MOP bila slipnya hanya punya satu
-- rate berkategori dengan dasar persen. MOP dengan beberapa kategori atau rate per unit dibiarkan
-- kosong karena kategori tiap deklarasi tidak tercatat.
WITH single_rate AS (
  SELECT s.id AS slip_id, (MIN(x->>'rate'))::numeric AS rate, MIN(x->>'basis') AS basis
  FROM "placing_slips" s
  CROSS JOIN LATERAL jsonb_array_elements(s."open_cover_rates") x
  WHERE s."open_cover" = true
    AND btrim(coalesce(x->>'label', '')) <> ''
    AND jsonb_typeof(x->'rate') = 'number'
    AND (x->>'rate')::numeric > 0
  GROUP BY s.id
  HAVING COUNT(*) = 1
)
UPDATE "policies" d
SET "insurer_premium" = ROUND(d."sum_insured" * r.rate / 100, 2)
FROM "policies" m
JOIN single_rate r ON r.slip_id = m."placing_slip_id"
WHERE d."parent_policy_id" = m."id"
  AND r.basis = 'percent'
  AND d."policy_type_id" IN (
    SELECT "id" FROM "lookup_values" WHERE "lookup_type" = 'policy_type' AND "code" = 'declaration'
  );
