-- Periode bawaan per type of cover dari jawaban Harry (6 November 2026) atas
-- pertanyaan 9 dan 15 analisa contoh slip LCH:
-- - Single shipment: tanggal mulai = ETD atau stuffing, tanggal akhir polis
--   14 hari setelahnya dan tidak tercetak; dokumen menulis "until final
--   destination".
-- - Hole in One: periode boleh satu tanggal turnamen.
ALTER TABLE "cover_types" ADD COLUMN "period_days" INTEGER,
ADD COLUMN "period_end_text" TEXT;
ALTER TABLE "placing_slips" ADD COLUMN "period_end_text" TEXT;

UPDATE "cover_types"
SET "period_days" = 14, "period_end_text" = 'until final destination'
WHERE "code" = '0323';
UPDATE "cover_types" SET "period_days" = 0 WHERE "code" = '1209';
