-- Paket klausul bawaan per type of cover (analisa 26 contoh slip LCH, 6
-- November 2026): daftar 40 sampai 62 klausul dipasang dengan satu tombol di
-- placing slip, lengkap dengan kelompok dan urutannya. Diisi LCH di Master
-- Clauses; awalnya tidak ada klausul yang masuk paket.
ALTER TABLE "clauses" ADD COLUMN "in_package" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "package_group" TEXT,
ADD COLUMN "package_order" INTEGER NOT NULL DEFAULT 0;
