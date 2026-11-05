-- Singkatan type of cover dari kolom SINGKATAN TOC di file LCH "LIST COB DAN
-- TOC" (diperbarui LCH 21 Oktober 2026), atas permintaan Agus 5 November 2026.
-- Dikecualikan: PSAGBI (0105) tetap EQ (#122); Directors and Officer Liability
-- (0913) tetap DNO karena singkatan hanya boleh huruf dan angka, sedangkan file
-- LCH menulis D&O. Type of cover yang singkatannya kosong di file LCH tidak
-- diubah.
UPDATE "cover_types" AS ct
SET "abbreviation" = v.abbr, "updated_at" = CURRENT_TIMESTAMP
FROM (VALUES
  ('0103', 'BI'), ('0109', 'PAR'), ('0110', 'IAR'), ('0116', 'TS'),
  ('0201', 'MV'), ('0203', 'HE'), ('0205', 'MV'),
  ('0308', 'CIT'), ('0311', 'MOP'), ('0323', 'MC'),
  ('0401', 'HMH'), ('0402', 'HBR'), ('0403', 'HMHSV'), ('0405', 'SRLL'),
  ('0406', 'MII'), ('0407', 'MAPP'),
  ('0801', 'CAR'), ('0802', 'EAR'), ('0803', 'MB'), ('0804', 'EEI'),
  ('0805', 'CPM'), ('0808', 'CECR'),
  ('0901', 'PL'), ('0902', 'EL'), ('0903', 'WCI'), ('0905', 'PLI'),
  ('0906', 'PI'), ('0908', 'CGL'), ('0911', 'AL'), ('0912', 'EOI'),
  ('0914', 'TOL'),
  ('1004', 'PA'),
  ('1202', 'FG'), ('1203', 'CIS'), ('1208', 'TRAVEL'), ('1209', 'HIO'),
  ('1213', 'MAR')
) AS v(code, abbr)
WHERE ct."code" = v.code
  AND ct."abbreviation" IS DISTINCT FROM v.abbr;
