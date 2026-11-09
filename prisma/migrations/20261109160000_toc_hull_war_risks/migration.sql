-- Type of cover Hull War Risks (HWR) di Marine Hull, dari jawaban Harry
-- (9 November 2026) atas pertanyaan 2. Contohnya CI War Eng Lee (contoh slip
-- 11, CI-HWR) dan Section C Patria (contoh 16). Kode 0404 masih kosong di
-- daftar COB dan TOC LCH.
-- Nama sengaja tanpa "Marine Hull", karena klausul diikat ke nama type of
-- cover. Label detail mengikuti jawaban Harry 6 November 2026: Existing
-- Policy No. untuk semua type of cover, Vessels dan Trading Limits untuk Hull.
-- Dilewati bila kode 0404 atau nama yang sama sudah ditambahkan LCH di
-- Master Data.
INSERT INTO "cover_types" ("cob_id", "code", "name", "abbreviation", "detail_labels", "updated_at")
SELECT c."id", '0404', 'Hull War Risks', 'HWR',
       ARRAY['Existing Policy No.', 'Vessels', 'Trading Limits'], now()
FROM "classes_of_business" c
WHERE c."code" = '04'
  AND NOT EXISTS (SELECT 1 FROM "cover_types" WHERE "code" = '0404')
  AND NOT EXISTS (
    SELECT 1 FROM "cover_types" t
    WHERE t."cob_id" = c."id" AND lower(trim(t."name")) = 'hull war risks'
  );
