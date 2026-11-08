-- Isi berkas unggahan pindah ke object storage (RustFS). Baris stored_files
-- tinggal metadata dan storage_key. Kolom data tetap ada untuk lingkungan
-- tanpa object storage (demo Vercel) dan untuk baris lama sebelum dipindah
-- dengan scripts/move-files-to-object-storage.ts.
ALTER TABLE "stored_files" ALTER COLUMN "data" DROP NOT NULL;
ALTER TABLE "stored_files" ADD COLUMN "storage_key" TEXT;

CREATE UNIQUE INDEX "stored_files_storage_key_key" ON "stored_files"("storage_key");

-- Tepat satu tempat isi: kolom data atau object storage.
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_content_check"
  CHECK (("data" IS NULL) <> ("storage_key" IS NULL));
