-- Tanggal LOD (Letter of Discharge) dikirim ke asuransi, untuk batas pembayaran klaim 30 hari kalender.
ALTER TABLE "claims" ADD COLUMN "lod_date" DATE;
