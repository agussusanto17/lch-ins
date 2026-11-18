-- Occupation / bisnis utama klien menggantikan COB utama (MoM review Phase 1, 17 November 2026,
-- poin 2). Daftar awal: 21 kategori KBLI 2020, sebagian nama diringkas; Team LCH bisa menambah
-- dan mengubahnya di Master Data. Kolom cob_id tetap ada supaya nilai lama tidak hilang.
INSERT INTO "lookup_values" ("lookup_type", "code", "name", "sort_order", "is_system", "is_active", "updated_at")
VALUES
  ('business_line', 'A', 'Pertanian, Kehutanan dan Perikanan', 1, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'B', 'Pertambangan dan Penggalian', 2, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'C', 'Industri Pengolahan', 3, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'D', 'Pengadaan Listrik, Gas, Uap/Air Panas dan Udara Dingin', 4, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'E', 'Pengelolaan Air, Air Limbah, Sampah dan Remediasi', 5, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'F', 'Konstruksi', 6, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'G', 'Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor', 7, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'H', 'Pengangkutan dan Pergudangan', 8, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'I', 'Penyediaan Akomodasi dan Makan Minum', 9, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'J', 'Informasi dan Komunikasi', 10, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'K', 'Aktivitas Keuangan dan Asuransi', 11, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'L', 'Real Estat', 12, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'M', 'Aktivitas Profesional, Ilmiah dan Teknis', 13, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'N', 'Aktivitas Penyewaan, Ketenagakerjaan, Agen Perjalanan dan Penunjang Usaha', 14, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'O', 'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib', 15, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'P', 'Pendidikan', 16, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'Q', 'Aktivitas Kesehatan Manusia dan Aktivitas Sosial', 17, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'R', 'Kesenian, Hiburan dan Rekreasi', 18, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'S', 'Aktivitas Jasa Lainnya', 19, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'T', 'Aktivitas Rumah Tangga sebagai Pemberi Kerja', 20, false, true, CURRENT_TIMESTAMP),
  ('business_line', 'U', 'Aktivitas Badan Internasional dan Badan Ekstra Internasional', 21, false, true, CURRENT_TIMESTAMP)
ON CONFLICT ("lookup_type", "code") DO NOTHING;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "business_line_id" UUID;

-- CreateIndex
CREATE INDEX "clients_business_line_id_idx" ON "clients"("business_line_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_business_line_id_fkey" FOREIGN KEY ("business_line_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;
