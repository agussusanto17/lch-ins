-- Jadwal kapal Marine Hull format Patria atau MHL (Harry, 26 November 2026). NULL berarti slip tanpa
-- jadwal; slip lama tidak berubah.
ALTER TABLE "placing_slips" ADD COLUMN "hull_schedule" JSONB;
