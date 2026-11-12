-- Polis yang tercatat dari placing slip sebelum Additional Fee ikut disalin ke
-- polis (#213, 10 November 2026) masih bernilai 0, padahal slipnya punya fee,
-- jadi fee itu tidak muncul di Report Operational. Samakan dengan pencatatan
-- sekarang (policyFieldsFromSlip): fee slip ikut ke polis Baru atau Renewal dari
-- slip itu, kecuali bagian EQVET (fee slip PAR + EQVET ikut polis PAR).
-- Hanya polis yang fee-nya masih 0, jadi fee yang sudah diisi atau diubah di
-- Policy Database tidak tertimpa.
UPDATE "policies" AS p
SET "additional_fee" = s."additional_fee",
    "updated_at" = now()
FROM "placing_slips" AS s, "lookup_values" AS t
WHERE p."placing_slip_id" = s."id"
  AND s."kind" = 'Placing'
  AND t."id" = p."policy_type_id"
  AND t."code" IN ('new', 'renewal')
  AND p."additional_fee" = 0
  AND s."additional_fee" <> 0
  AND p."slip_part" IS DISTINCT FROM 'EQVET';
