-- Isi lampiran slip bisa ikut tercetak di dokumen (jawaban Harry, 9 November
-- 2026, pertanyaan 3): gambar per halaman, Excel sebagai tabel, PDF per
-- halaman. Bawaannya menyala, termasuk untuk lampiran yang sudah ada; user
-- bisa mematikannya per lampiran.

-- AlterTable
ALTER TABLE "slip_files" ADD COLUMN "print_content" BOOLEAN NOT NULL DEFAULT true;
