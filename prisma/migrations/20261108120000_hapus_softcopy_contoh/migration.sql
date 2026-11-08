-- Hapus baris softcopy polis contoh yang tidak punya isi berkas.
--
-- Baris ini dibuat seedInitialPoliciesIfEmpty (22 Oktober 2026) dengan
-- file_path berupa nama file saja, sebelum seed data contoh dimatikan di
-- produksi (3 November 2026). Upload sungguhan sejak PR #151 selalu merujuk ke
-- stored_files/<id>, dan sebelum itu upload dari UI tidak pernah masuk database.
DELETE FROM "policy_files" WHERE "file_path" NOT LIKE 'stored_files/%';
