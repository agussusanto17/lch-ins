-- Isian yang ada di CI LCH tetapi belum ada di slip (contoh CI SISKA RAHARJA
-- dan PT. TRUCKINDO BATAM, 5 November 2026):
-- - keterangan di bawah periode asuransi;
-- - nama type of cover yang dicetak di dokumen bila berbeda dari master.
ALTER TABLE "placing_slips" ADD COLUMN "period_note" TEXT,
ADD COLUMN "type_of_cover_label" TEXT,
ADD COLUMN "type_of_cover_2_label" TEXT;

-- Semua CI LCH mencetak keterangan ini di bawah periode, jadi slip yang sudah
-- ada ikut mendapatkannya. Bisa diubah atau dikosongkan per slip.
UPDATE "placing_slips"
SET "period_note" = 'Both days at 12 o''clock noon local time at the location of the insured object.'
WHERE "period_note" IS NULL;
