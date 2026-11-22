-- Polis MV multi tahun: nilai casco per tahun polis bisa diisi manual karena harga kendaraan tidak
-- selalu turun dengan persen yang sama (Harry, 22 November 2026). Kosong berarti mengikuti
-- penyusutan per tahun polis di slip.
-- AlterTable
ALTER TABLE "slip_items" ADD COLUMN     "year_values" JSONB;
