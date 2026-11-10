-- Tanggal premi dibayar per polis (meeting LCH, 10 November 2026). Kosong
-- berarti belum dibayar; tampil sebagai info saat klaim dicatat.
ALTER TABLE "policies" ADD COLUMN "premium_paid_date" DATE;
