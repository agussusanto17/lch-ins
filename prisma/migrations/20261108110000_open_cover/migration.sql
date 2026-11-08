-- Open cover (analisa contoh slip LCH, Tahap 3 nomor 15): slip berisi rate per
-- kategori tanpa TSI dan premi, lalu premi dicatat per deklarasi sebagai polis
-- (jawaban Harry, 6 November 2026: MOP satu polis per deklarasi).

-- AlterTable
ALTER TABLE "cover_types" ADD COLUMN "open_cover" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "placing_slips" ADD COLUMN "open_cover" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "open_cover_rates" JSONB NOT NULL DEFAULT '[]';

-- Marine Cargo Open Cover (MOP) selalu open cover. Type of cover lain, misalnya
-- container open cover di Moveable All Risk, dinyalakan per slip.
UPDATE "cover_types" SET "open_cover" = true WHERE "code" = '0311';
