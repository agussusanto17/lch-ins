-- Polis multi tahun Motor Vehicle (Agus, 20 November 2026; contoh polis MAG PT Diraja Traillindo
-- 10 Juni 2024 s/d 10 Juni 2028): premi dihitung per tahun polis bila periode lebih dari satu
-- tahun, dengan nilai kendaraan turun sebesar persen ini dari nilai tahun sebelumnya.
-- Slip yang sudah ada mendapat 0, jadi nilainya tidak menyusut sampai diisi.
ALTER TABLE "placing_slips" ADD COLUMN "multi_year_depreciation_pct" DECIMAL(5,2) NOT NULL DEFAULT 0;
