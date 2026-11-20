-- Judul klausul dari contoh slip yang dikirim Harry 20 November 2026 yang belum tampil di
-- picker slip, tanpa wording seperti impor 9 dan 12 November (wording dilengkapi LCH di Master
-- Clauses):
--   30 Quotation Slip Billboard All Risks CV. Prima and Clear 2025 (TOC 1206): 10 judul.
--      Klausul Miscellaneous yang mirip terikat ke TOC lain (Cash In Safe, Movable All Risk),
--      jadi tidak tampil di slip TOC 1206.
--   32 Indikasi Civil Engineering Completed Risks PT Soechi Lines / Multi Ocean Shipyard: 3
--      judul Engineering. Delapan judul lain sudah ada dengan nama mirip; batas per slip cukup
--      ditulis di judul klausul slip.
--   35 Quotation Slip D&O PT. Indo Bharat Rayon 2022: 32 judul Liability, 24 khusus D&O (0913)
--      dan 8 umum untuk semua type of cover Liability.
-- Daftar yang sama ada di prisma/seed-data/judul-klausul-contoh-slip.csv. Dilewati bila judul itu
-- sudah ada di kelompoknya, atau sudah ada sebagai klausul aktif yang tampil di slip COB dan type
-- of cover yang sama (tanpa membedakan huruf besar dan kecil).
INSERT INTO "clauses" ("title", "cob_id", "cover_type_id", "wording_html", "source_group", "updated_at")
SELECT v.title, c."id", ct."id", '', v.grp, now()
FROM (VALUES
  ('Compliance Clause', 'Billboard', '12', '1206'),
  ('Communicable Disease Endorsement', 'Billboard', '12', '1206'),
  ('Cyber Risk Exclusion', 'Billboard', '12', '1206'),
  ('Dispute Clause', 'Billboard', '12', '1206'),
  ('Extra Contractual Obligation Exclusion', 'Billboard', '12', '1206'),
  ('Forfeiture of Right to Indemnification', 'Billboard', '12', '1206'),
  ('Loss Notification Clause (30 days)', 'Billboard', '12', '1206'),
  ('Notice of Cancellation (30 days)', 'Billboard', '12', '1206'),
  ('Premium Payment (30 days)', 'Billboard', '12', '1206'),
  ('Waiver to Waive Article 1266 and 1267 of the Indonesian Civil Code', 'Billboard', '12', '1206'),
  ('Appraisement Clause', 'CECR', '08', NULL),
  ('Burglary and Theft Cover Endorsement', 'CECR', '08', NULL),
  ('Deferred Premium Clause', 'CECR', '08', NULL),
  ('Arbitration Clause', 'DNO', '09', NULL),
  ('Choice of Law: Indonesia', 'DNO', '09', NULL),
  ('Claim Cooperation Clause (NMA 2737)', 'DNO', '09', NULL),
  ('Currency Clause', 'DNO', '09', NULL),
  ('Policy Interpretation – Indonesia', 'DNO', '09', NULL),
  ('Several Liability Notice (LSW 1001)', 'DNO', '09', NULL),
  ('Sanction Exclusion Clause', 'DNO', '09', NULL),
  ('Pollution Exclusion with Exception', 'DNO', '09', NULL),
  ('Definition Amendment', 'DNO', '09', '0913'),
  ('Disclosure Management Coverage', 'DNO', '09', '0913'),
  ('Emergency Cost', 'DNO', '09', '0913'),
  ('Employment Claim Extension', 'DNO', '09', '0913'),
  ('Entity Employment Practice Liability Extension', 'DNO', '09', '0913'),
  ('Entity Securities Claim Extension', 'DNO', '09', '0913'),
  ('Absolute Insolvency Exclusion', 'DNO', '09', '0913'),
  ('Formal Investigation / Legal Representation Expenses Extension', 'DNO', '09', '0913'),
  ('Major Shareholder Exclusion', 'DNO', '09', '0913'),
  ('No Hammer Clause', 'DNO', '09', '0913'),
  ('Shareholder Derivative Claims', 'DNO', '09', '0913'),
  ('Defense Cost (Inclusive)', 'DNO', '09', '0913'),
  ('Retired Insured Person Coverage Extension', 'DNO', '09', '0913'),
  ('Fair Labor Standard Acts Exclusion', 'DNO', '09', '0913'),
  ('Payment & Gratuities Exclusion', 'DNO', '09', '0913'),
  ('Money Laundering Exclusion', 'DNO', '09', '0913'),
  ('Absolute Bodily Injury / Property Damage Exclusion', 'DNO', '09', '0913'),
  ('Absolute Professional Indemnity Exclusion', 'DNO', '09', '0913'),
  ('Absolute Product Liability Exclusion', 'DNO', '09', '0913'),
  ('Absolute Intellectual Property Exclusion', 'DNO', '09', '0913'),
  ('Network Security and Privacy Liability Exclusion', 'DNO', '09', '0913'),
  ('No Cover for ERP Discovery Period', 'DNO', '09', '0913'),
  ('Specific Entity Exclusion', 'DNO', '09', '0913'),
  ('Withdrawal of Financial Support Exclusion', 'DNO', '09', '0913')
) AS v(title, grp, cob_code, toc_code)
JOIN "classes_of_business" c ON c."code" = v.cob_code
LEFT JOIN "cover_types" ct ON ct."code" = v.toc_code
WHERE NOT EXISTS (
  SELECT 1 FROM "clauses" x
  WHERE (x."title" = v.title AND x."source_group" = v.grp)
     OR (x."is_active" AND x."cob_id" = c."id" AND lower(x."title") = lower(v.title)
         AND (x."cover_type_id" IS NULL OR x."cover_type_id" IS NOT DISTINCT FROM ct."id"))
);
