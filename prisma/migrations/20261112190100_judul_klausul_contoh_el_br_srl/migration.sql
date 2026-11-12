-- Judul klausul dari tiga contoh slip baru LCH (12 November 2026) yang belum ada
-- di Master Clauses, tanpa wording seperti impor 9 November (jawaban Harry
-- pertanyaan 4: wording dilengkapi LCH di Master Clauses):
--   27 Placing Slip Employers Liability PT. Permata Lintas Abadi 2026 (EL),
--   28 Signed Slip Builder's Risks PT. Multi Ocean Shipyard H7034/H7035 (BR),
--   29 Signed Slip Shiprepairers Legal Liability PT Dok Pantai Lamongan 2022 (SRL).
-- 27 judul: Hull 23 (BR 5, SRL 6, keduanya 12), EL 4. Daftar yang sama ada di
-- prisma/seed-data/judul-klausul-contoh-slip.csv. Dilewati bila judul itu sudah
-- ada di kelompoknya, atau sudah ada sebagai klausul aktif yang tampil di slip COB
-- dan type of cover yang sama (tanpa membedakan huruf besar dan kecil).
INSERT INTO "clauses" ("title", "cob_id", "cover_type_id", "wording_html", "source_group", "updated_at")
SELECT v.title, c."id", ct."id", '', v.grp, now()
FROM (VALUES
  ('INSTITUTE CLAUSES FOR BUILDERS'' RISKS (1/6/88)', 'Hull', '04', '0402'),
  ('INSTITUTE WAR CLAUSES BUILDERS'' RISKS (1/6/88) CL 349', 'Hull', '04', '0402'),
  ('INSTITUTE STRIKES CLAUSES BUILDERS'' RISKS (1/6/88) CL 350', 'Hull', '04', '0402'),
  ('BUILDERS'' RISKS INSTITUTE CLAUSE FOR LIMITATION OF LIABILITY IN RESPECT OF FAULTY DESIGN & P&I RISKS CL 352', 'Hull', '04', '0402'),
  ('FULL VALUE CLAUSE', 'Hull', '04', '0402'),
  ('SHIPREPAIRERS LIABILITY CLAUSES LSW 169/A (1/90)', 'Hull', '04', '0405'),
  ('DETENTION ENDORSEMENT LSW 170 (5/89)', 'Hull', '04', '0405'),
  ('PERSONAL INJURY ENDORSEMENT LSW 171A (5/89)', 'Hull', '04', '0405'),
  ('OTHER WORK ENDORSEMENT LSW 172 (5/89)', 'Hull', '04', '0405'),
  ('TRAVELLING WORKMEN (LSW 180)', 'Hull', '04', '0405'),
  ('CLAIMS CO-OPERATION CLAUSE', 'Hull', '04', '0405'),
  ('WAIVER OF SUBROGATION IN FAVOUR OF PRINCIPAL, PARENT, SUBSIDIARY AND ASSOCIATED COMPANIES', 'Hull', '04', NULL),
  ('LAW AND JURISDICTION CLAUSE', 'Hull', '04', NULL),
  ('SURVEY, DIVER, CLASS SURVEY FEES CLAUSE', 'Hull', '04', NULL),
  ('LSW1001 SEVERAL LIABILITY NOTICE', 'Hull', '04', NULL),
  ('CONTRACTS (RIGHTS OF THIRD PARTIES) ACT 1999 (UK) OR OTHER SUBSTANTIVELY SIMILAR LEGISLATION EXCLUSION CLAUSE', 'Hull', '04', NULL),
  ('COMMUNICABLE DISEASE EXCLUSION LMA 5397', 'Hull', '04', NULL),
  ('COMMUNICABLE DISEASE EXCLUSION (JL2020-013)', 'Hull', '04', NULL),
  ('CLAIMS SERVICE LEVEL AGREEMENT', 'Hull', '04', NULL),
  ('FULL FOLLOW CLAUSE', 'Hull', '04', NULL),
  ('SEEPAGE AND POLLUTION BUY BACK (72 HOURS CLAUSE)', 'Hull', '04', NULL),
  ('PRINCIPAL CLAUSE', 'Hull', '04', NULL),
  ('CROSS LIABILITY CLAUSE', 'Hull', '04', NULL),
  ('Cross Liability Clause', 'EL', '09', NULL),
  ('Defence Cost Inclusive within the Limit of Liability', 'EL', '09', NULL),
  ('Memorandum on Dispute Clause (C)', 'EL', '09', NULL),
  ('Bodily Injury shall include death, sickness, disease, illness, disability, mental anguish, mental injury', 'EL', '09', '0902')
) AS v(title, grp, cob_code, toc_code)
JOIN "classes_of_business" c ON c."code" = v.cob_code
LEFT JOIN "cover_types" ct ON ct."code" = v.toc_code
WHERE NOT EXISTS (
  SELECT 1 FROM "clauses" x
  WHERE (x."title" = v.title AND x."source_group" = v.grp)
     OR (x."is_active" AND x."cob_id" = c."id" AND lower(x."title") = lower(v.title)
         AND (x."cover_type_id" IS NULL OR x."cover_type_id" IS NOT DISTINCT FROM ct."id"))
);
