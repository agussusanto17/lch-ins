-- Tanda tangan dan cap LCH untuk cetak Placing Slip, Quotation Slip, dan Closing Instruction
-- (Harry, 19 November 2026). Gambarnya di stored_files dengan purpose signature, jadi di VPS
-- tetap tersimpan di object storage. Tabel ini hanya menyimpan nama dan pilihan default.
CREATE TABLE "document_signatories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "document_signatories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_signatories_name_key" ON "document_signatories"("name");
