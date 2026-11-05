-- Objek "limit saja" di Interest Insured COB selain Property dan Motor
-- Vehicle: nilainya hanya batas (misalnya limit any one carrying CIT), tidak
-- ikut total sum insured dan premi (analisa contoh slip LCH, 6 November 2026).
ALTER TABLE "slip_items" ADD COLUMN "is_limit_only" BOOLEAN NOT NULL DEFAULT false;
