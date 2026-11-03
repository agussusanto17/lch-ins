-- Nama okupasi yang dicetak di dokumen slip, diedit khusus per slip. Kosong
-- berarti nama sesuai OJK dari master okupasi.
ALTER TABLE "placing_slips" ADD COLUMN "occupation_label" TEXT;
