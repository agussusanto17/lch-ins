-- Deklarasi MOP (Agus, 16 November 2026): slip open cover tercatat sebagai satu polis induk MOP
-- dari Closing Instruction, dan tiap deklarasi pengiriman menjadi polis bertipe Deklarasi di
-- bawahnya dengan nomor sertifikat dan premi sendiri.

-- Tipe polis Deklarasi. Kodenya dipakai sistem, jadi baris ini ditandai sistem.
INSERT INTO "lookup_values" ("lookup_type", "code", "name", "sort_order", "is_system", "is_active", "updated_at")
VALUES ('policy_type', 'declaration', 'Deklarasi', 4, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("lookup_type", "code") DO NOTHING;

-- Data lama: sebelum perubahan ini setiap deklarasi dicatat sebagai polis baru dari slip open
-- cover tanpa polis induk. Untuk tiap slip itu dibuat polis induk MOP dari polis pertamanya
-- (nomor sementara dari CI, nilai dan premi 0, periode slip), lalu polis lamanya menjadi
-- deklarasi di bawahnya. Slip yang nomor CI-nya sudah dipakai polis lain dilewati.
DO $$
DECLARE
  s RECORD;
  first_id UUID;
  master_id UUID;
  ci_no TEXT;
  declaration_type UUID;
BEGIN
  SELECT "id" INTO declaration_type
  FROM "lookup_values"
  WHERE "lookup_type" = 'policy_type' AND "code" = 'declaration';

  FOR s IN
    SELECT ps."id", ps."slip_no", ps."inception_date", ps."expiry_date"
    FROM "placing_slips" ps
    WHERE ps."open_cover" = true
      AND ps."slip_no" IS NOT NULL
      AND EXISTS (SELECT 1 FROM "policies" p WHERE p."placing_slip_id" = ps."id")
  LOOP
    SELECT p."id" INTO first_id
    FROM "policies" p
    JOIN "lookup_values" lv ON lv."id" = p."policy_type_id"
    WHERE p."placing_slip_id" = s."id"
      AND p."parent_policy_id" IS NULL
      AND lv."lookup_type" = 'policy_type'
      AND lv."code" IN ('new', 'renewal')
    ORDER BY p."created_at", p."policy_no"
    LIMIT 1;
    CONTINUE WHEN first_id IS NULL;

    ci_no := replace(s."slip_no", '/PS-', '/CI-');
    CONTINUE WHEN ci_no = s."slip_no"
      OR EXISTS (SELECT 1 FROM "policies" WHERE "policy_no" = ci_no);

    master_id := gen_random_uuid();
    INSERT INTO "policies" (
      "id", "policy_no", "placing_slip_id", "client_id", "cob_id", "cover_type_id",
      "insured_name", "risk_location", "inception_date", "expiry_date", "currency_code",
      "sum_insured", "premium", "brokerage_pct", "policy_type_id", "parent_policy_id",
      "created_at", "updated_at", "type_of_cover", "cob_ojk_class_id", "endorsement_seq",
      "grouping_insured", "placement_location_id", "additional_fee", "slip_part",
      "pa_benefit_limits", "previous_policy_no", "premium_paid_date", "remarks", "rate",
      "premium_basis", "admin_cost", "stamp_duty", "include_vat", "additional_fee_include_vat"
    )
    SELECT
      master_id, ci_no, p."placing_slip_id", p."client_id", p."cob_id", p."cover_type_id",
      p."insured_name", p."risk_location",
      COALESCE(s."inception_date", p."inception_date"), COALESCE(s."expiry_date", p."expiry_date"),
      p."currency_code",
      0, 0, p."brokerage_pct", p."policy_type_id", NULL,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, p."type_of_cover", p."cob_ojk_class_id", NULL,
      p."grouping_insured", p."placement_location_id", 0, NULL,
      p."pa_benefit_limits", p."previous_policy_no", NULL, NULL, NULL,
      NULL, 0, 0, p."include_vat", p."additional_fee_include_vat"
    FROM "policies" p
    WHERE p."id" = first_id;

    INSERT INTO "policy_insurers" (
      "id", "policy_id", "insurer_id", "share_pct", "position_id", "created_at", "updated_at",
      "additional_fee_pct", "additional_fee_include_vat"
    )
    SELECT
      gen_random_uuid(), master_id, pi."insurer_id", pi."share_pct", pi."position_id",
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, pi."additional_fee_pct", pi."additional_fee_include_vat"
    FROM "policy_insurers" pi
    WHERE pi."policy_id" = first_id;

    UPDATE "policies" p
    SET "policy_type_id" = declaration_type,
        "parent_policy_id" = master_id,
        "updated_at" = CURRENT_TIMESTAMP
    FROM "lookup_values" lv
    WHERE lv."id" = p."policy_type_id"
      AND lv."lookup_type" = 'policy_type'
      AND lv."code" IN ('new', 'renewal')
      AND p."placing_slip_id" = s."id"
      AND p."parent_policy_id" IS NULL
      AND p."id" <> master_id;
  END LOOP;
END $$;
