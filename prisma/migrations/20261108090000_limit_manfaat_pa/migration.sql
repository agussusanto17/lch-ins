-- Limit manfaat PA untuk peringatan klaim (Harry, 7 November 2026): klaim PA
-- diberi peringatan bila nilainya melebihi UP peserta atau limit manfaat
-- meninggal, cacat, dan biaya medis.

-- Jenis manfaat PA di Master Data. Kodenya dipakai sistem untuk mencocokkan
-- limit, jadi baris bawaan ditandai sistem.
INSERT INTO "lookup_values" ("lookup_type", "code", "name", "sort_order", "is_system", "is_active", "updated_at")
VALUES
  ('pa_benefit', 'death', 'Meninggal Dunia', 1, true, true, CURRENT_TIMESTAMP),
  ('pa_benefit', 'disability', 'Cacat Tetap', 2, true, true, CURRENT_TIMESTAMP),
  ('pa_benefit', 'medical', 'Biaya Medis', 3, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("lookup_type", "code") DO NOTHING;

-- Limit dalam persen UP per kode manfaat, misalnya
-- {"death":100,"disability":100,"medical":10}. Polis menyalinnya dari slip.
ALTER TABLE "placing_slips" ADD COLUMN "pa_benefit_limits" JSONB;
ALTER TABLE "policies" ADD COLUMN "pa_benefit_limits" JSONB;

-- Jenis manfaat klaim PA.
ALTER TABLE "claims" ADD COLUMN "pa_benefit_id" UUID;
CREATE INDEX "claims_pa_benefit_id_idx" ON "claims"("pa_benefit_id");
ALTER TABLE "claims" ADD CONSTRAINT "claims_pa_benefit_id_fkey" FOREIGN KEY ("pa_benefit_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
