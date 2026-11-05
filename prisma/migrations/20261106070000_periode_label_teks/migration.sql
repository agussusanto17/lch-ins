-- Label dan teks periode di dokumen slip (analisa 26 contoh slip LCH, 6
-- November 2026): "Estimated Time of Departure (ETD)" untuk single shipment,
-- "Date of Tournament" untuk Hole in One, dan teks periode bebas seperti
-- "23rd / 24th / 25th October 2026 until final destination" atau periode
-- proyek T.B.A. Slip yang sudah ada tetap mencetak "Period of Insurance".
ALTER TABLE "cover_types" ADD COLUMN "period_label" TEXT;
ALTER TABLE "placing_slips" ADD COLUMN "period_label" TEXT,
ADD COLUMN "period_text" TEXT;

-- Label periode bawaan dari contoh slip.
UPDATE "cover_types" SET "period_label" = 'Estimated Time of Departure (ETD)' WHERE "code" = '0323';
UPDATE "cover_types" SET "period_label" = 'Date of Tournament' WHERE "code" = '1209';

-- ETD Marine Cargo pindah dari Detail tambahan ke label periode, hanya bila
-- label awal dari 20261106020000_detail_tambahan_slip belum diubah LCH.
UPDATE "cover_types"
SET "detail_labels" = ARRAY['Voyage', 'Conveyance', 'Consignee', 'Basis of Valuation', 'Packing Method']
WHERE "code" = '0323'
  AND "detail_labels" = ARRAY['Estimated Time of Departure (ETD)', 'Voyage', 'Conveyance', 'Consignee', 'Basis of Valuation', 'Packing Method'];
