-- Asal batas OJK baris rate slip (okupasi lokasi atau panel Referensi Tarif OJK), supaya
-- tetap terbaca setelah slip dimuat ulang. Baris lama kosong sampai batasnya dihitung ulang.
ALTER TABLE "slip_rate_lines" ADD COLUMN "bound_source" TEXT;
