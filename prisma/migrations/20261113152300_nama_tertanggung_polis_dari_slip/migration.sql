-- Nama tertanggung polis dari isian slip (Agus, 13 November 2026).
--
-- Polis yang dicatat dari slip (otomatis saat Closing Instruction terbit,
-- tombol Catat polis dari CI, Tambah Polis dari slip, dan record
-- endorsement/cancellation slip) memakai nama klien di Data Klien sebagai
-- nama tertanggung, bukan isian Nama Tertanggung slip. Contohnya slip klien
-- D'BEST GROUP dengan tertanggung PT Margamas Indah Development tercatat
-- sebagai D'BEST GROUP. Polis yang nama tertanggungnya masih sama persis
-- dengan nama klien, artinya belum diubah petugas polis, diganti dengan
-- isian slip.

-- 1) Polis yang tertaut ke slip.
UPDATE "policies" AS p
SET "insured_name" = btrim(s."insured_name"),
    "updated_at" = CURRENT_TIMESTAMP
FROM "placing_slips" AS s
JOIN "clients" AS c ON c."id" = s."client_id"
WHERE p."placing_slip_id" = s."id"
  AND p."insured_name" = c."name"
  AND btrim(coalesce(s."insured_name", '')) <> ''
  AND p."insured_name" <> btrim(s."insured_name");

-- 2) Endorsement dan pembatalan yang dicatat manual dari polis induk itu
--    menyalin nama tertanggung induknya, jadi ikut disamakan.
UPDATE "policies" AS ch
SET "insured_name" = parent."insured_name",
    "updated_at" = CURRENT_TIMESTAMP
FROM "policies" AS parent
JOIN "clients" AS c ON c."id" = parent."client_id"
WHERE ch."parent_policy_id" = parent."id"
  AND ch."placing_slip_id" IS NULL
  AND ch."insured_name" = c."name"
  AND parent."placing_slip_id" IS NOT NULL
  AND parent."insured_name" <> c."name"
  AND ch."policy_type_id" IN (
    SELECT "id" FROM "lookup_values"
    WHERE "lookup_type" = 'policy_type' AND "name" IN ('Endorsement', 'Cancellation')
  );
