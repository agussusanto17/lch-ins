-- Label Detail tambahan bawaan dari contoh slip yang dikirim Harry 20 November 2026:
--   Directors and Officer Liability (0913), dari Quotation Slip D&O PT. Indo Bharat Rayon:
--     Territory & Jurisdiction, Retroactive Date, Prior and Pending Date.
--   Civil Engineering Completed Risk (0808), dari indikasi CECR PT Soechi Lines / Multi Ocean
--     Shipyard: Business, Basis of Indemnity, Limit of Liability (Any One Occurrence).
--   Travel Insurance (1208), dari Quotation Slip Zurich Travel Soegianto & Family:
--     Coverage Area, Benefit Plan, Type of Insured, Policy Type.
--   Health Insurance (1301), dari proposal kesehatan karyawan PT Salam Pacific Indonesia Lines:
--     Benefit Plan, Number of Participants.
-- Label hanya ditambahkan di akhir bila belum ada, jadi perubahan LCH di Master Data tetap.
-- Slip yang sudah ada tidak berubah.
UPDATE "cover_types" c
SET "detail_labels" = c."detail_labels" || ARRAY(
  SELECT t.l
  FROM unnest(n.labels) WITH ORDINALITY AS t(l, i)
  WHERE t.l <> ALL (c."detail_labels")
  ORDER BY t.i
)
FROM (VALUES
  ('0913', ARRAY['Territory & Jurisdiction', 'Retroactive Date', 'Prior and Pending Date']),
  ('0808', ARRAY['Business', 'Basis of Indemnity', 'Limit of Liability (Any One Occurrence)']),
  ('1208', ARRAY['Coverage Area', 'Benefit Plan', 'Type of Insured', 'Policy Type']),
  ('1301', ARRAY['Benefit Plan', 'Number of Participants'])
) AS n(code, labels)
WHERE c."code" = n.code;
