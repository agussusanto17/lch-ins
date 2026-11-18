-- Diskon polis (MoM review Phase 1, poin 19): Gross Premium = premi − diskon. Brokerage dan
-- additional fee tetap dihitung dari premi sebelum diskon.
ALTER TABLE "policies" ADD COLUMN "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- Polis dari slip yang berdiskon: diskon = premi × diskon slip (%), sama dengan hitungan slip
-- per polis (termasuk per bagian PAR/EQVET dan selisih premi endorsement/cancellation).
-- Deklarasi MOP tidak ikut karena preminya dihitung per pengiriman.
UPDATE "policies" p
SET "discount_amount" = ROUND(p."premium" * s."discount_pct" / 100, 2)
FROM "placing_slips" s
WHERE p."placing_slip_id" = s."id"
  AND s."discount_pct" > 0
  AND p."policy_type_id" NOT IN (
    SELECT "id" FROM "lookup_values" WHERE "lookup_type" = 'policy_type' AND "code" = 'declaration'
  );
