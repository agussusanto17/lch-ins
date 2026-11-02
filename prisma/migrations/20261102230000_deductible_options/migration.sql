-- Pilihan deductible per type of cover untuk isian deductible per cover di
-- placing slip. cover_type_id kosong berarti berlaku untuk semua type of
-- cover dalam COB itu.

-- CreateTable
CREATE TABLE "deductible_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cob_id" UUID NOT NULL,
    "cover_type_id" UUID,
    "text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deductible_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deductible_options_cob_id_cover_type_id_idx" ON "deductible_options"("cob_id", "cover_type_id");

-- AddForeignKey
ALTER TABLE "deductible_options" ADD CONSTRAINT "deductible_options_cob_id_fkey" FOREIGN KEY ("cob_id") REFERENCES "classes_of_business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deductible_options" ADD CONSTRAINT "deductible_options_cover_type_id_fkey" FOREIGN KEY ("cover_type_id") REFERENCES "cover_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
