-- Nama tertanggung per lokasi slip Property (MoM review Phase 1, poin 6), seperti lampiran
-- polis SPIL 50013026001304. Kosong berarti sama dengan tertanggung slip.
ALTER TABLE "slip_locations" ADD COLUMN "insured_name" TEXT;
