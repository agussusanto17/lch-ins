-- Polis Baru dan Renewal dari placing slip menyimpan admin cost dan stamp duty slip, supaya ikut
-- cicilan pertama premi installment di Policy Database (Agus, 22 November 2026). Sebelumnya hanya
-- endorsement, pembatalan, dan deklarasi yang menyimpannya. Slip PAR + EQVET: tiap polis yang
-- berpremi, seperti cetakan slip. Open cover dibayar per deklarasi, jadi dilewati.
UPDATE "policies" AS p
SET "admin_cost" = s."admin_cost",
    "stamp_duty" = s."stamp_duty"
FROM "placing_slips" AS s, "lookup_values" AS t
WHERE p."placing_slip_id" = s."id"
  AND t."id" = p."policy_type_id"
  AND t."lookup_type" = 'policy_type'
  AND t."code" IN ('new', 'renewal')
  AND s."open_cover" = false
  AND p."premium" > 0
  AND p."admin_cost" = 0
  AND p."stamp_duty" = 0;
