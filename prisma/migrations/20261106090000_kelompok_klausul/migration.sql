-- Kelompok klausul berjudul di slip tanpa section, misalnya EXTENSIONS dan
-- GENERAL CONDITIONS pada CI Cendanawati (analisa 26 contoh slip LCH, 6
-- November 2026). Klausul slip yang sudah ada tetap tanpa judul kelompok.
ALTER TABLE "slip_clauses" ADD COLUMN "group_title" TEXT;
