-- Lampiran placing slip, misalnya vessel schedule, daftar unit, atau klausul
-- hasil scan (analisa contoh slip LCH, Tahap 3 nomor 19). Isi berkasnya di
-- stored_files dengan purpose slip_attachment.

-- CreateTable
CREATE TABLE "slip_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slip_id" UUID NOT NULL,
    "description" TEXT,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slip_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slip_files_slip_id_sort_order_idx" ON "slip_files"("slip_id", "sort_order");

-- AddForeignKey
ALTER TABLE "slip_files" ADD CONSTRAINT "slip_files_slip_id_fkey" FOREIGN KEY ("slip_id") REFERENCES "placing_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_files" ADD CONSTRAINT "slip_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
