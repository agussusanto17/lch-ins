-- Data uji yang tertinggal di produksi. Dihapus berdasarkan id dan nama, dan
-- hanya kalau belum dipakai, supaya di database lain migrasi ini tidak berefek.

-- COB "Superman", dibuat dari aplikasi 24 Oktober 2026 saat uji coba.
DELETE FROM "classes_of_business" c
WHERE c."id" = 'be17d4ee-1b9d-4947-96a4-4a29090e8e43'
  AND c."name" = 'Superman'
  AND NOT EXISTS (SELECT 1 FROM "cover_types" WHERE "cob_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "cob_rate_lines" WHERE "cob_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "clauses" WHERE "cob_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "clients" WHERE "cob_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "sppa" WHERE "cob_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "placing_slips" WHERE "cob_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "policies" WHERE "cob_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "insurer_claim_pics" WHERE "cob_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "claim_document_types" WHERE "cob_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "deductible_options" WHERE "cob_id" = c."id");

-- Clause uji SIT-029 dan SIT-030. TEST-SIT030 tanpa COB, jadi ikut tampil di
-- pemilih clause semua slip.
DELETE FROM "clauses" cl
WHERE (
    (cl."id" = 'cb547dae-d4e1-4435-a3af-36b7276a1afd' AND cl."title" = 'TEST-SIT030 Sanitasi Script')
    OR (cl."id" = '8b76b626-9dde-489c-b0a3-d5e8ba618ee7' AND cl."title" = 'TEST-SIT029 Format Wording Clause')
  )
  AND NOT EXISTS (SELECT 1 FROM "slip_clauses" WHERE "clause_id" = cl."id");
