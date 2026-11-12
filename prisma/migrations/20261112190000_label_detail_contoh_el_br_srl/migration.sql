-- Label Detail tambahan bawaan untuk tiga type of cover dari contoh slip baru
-- LCH (12 November 2026):
--   Employer's Liability (0902), dari Placing Slip EL PT. Permata Lintas Abadi:
--     Insured Business, Territorial Limit, Jurisdiction. Workmen's Compensation
--     (0903) ikut, karena contoh itu satu slip EL / Workmen Compensation.
--   Marine Builder Risk (0402), dari slip PT. Multi Ocean Shipyard:
--     Vessels, Contract Value, Location of Yard, Warranties.
--   Ship Repairers Legal Liability (0405), dari slip PT Dok Pantai Lamongan:
--     Vessels, Location of Yard, Estimated Annual Turnover, Adjustable Rate,
--     Warranties.
-- Label hanya ditambahkan di akhir bila belum ada, jadi perubahan LCH di Master
-- Data tetap. Slip yang sudah ada tidak berubah.
UPDATE "cover_types" c
SET "detail_labels" = c."detail_labels" || ARRAY(
  SELECT t.l
  FROM unnest(n.labels) WITH ORDINALITY AS t(l, i)
  WHERE t.l <> ALL (c."detail_labels")
  ORDER BY t.i
)
FROM (VALUES
  ('0902', ARRAY['Insured Business', 'Territorial Limit', 'Jurisdiction']),
  ('0903', ARRAY['Insured Business', 'Territorial Limit', 'Jurisdiction']),
  ('0402', ARRAY['Vessels', 'Contract Value', 'Location of Yard', 'Warranties']),
  ('0405', ARRAY['Vessels', 'Location of Yard', 'Estimated Annual Turnover', 'Adjustable Rate', 'Warranties'])
) AS n(code, labels)
WHERE c."code" = n.code;
