-- Berkas polis terdiri dari Polis, Premium Note, dan Commission Note (Agus,
-- 9 November 2026). Berkas yang sudah ada adalah softcopy polis, jadi jenisnya
-- Policy. Versi dihitung per jenis.
CREATE TYPE "PolicyFileKind" AS ENUM ('Policy', 'PremiumNote', 'CommissionNote');

ALTER TABLE "policy_files" ADD COLUMN "kind" "PolicyFileKind" NOT NULL DEFAULT 'Policy';

DROP INDEX "policy_files_policy_id_version_key";
CREATE UNIQUE INDEX "policy_files_policy_id_kind_version_key" ON "policy_files"("policy_id", "kind", "version");

-- Potongan unggahan besar. Vercel menolak body request di atas 4,5 MB, jadi
-- berkas sampai 25 MB dikirim per potongan lalu digabung di server.
CREATE TABLE "upload_parts" (
    "upload_id" UUID NOT NULL,
    "part_no" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_parts_pkey" PRIMARY KEY ("upload_id","part_no")
);

CREATE INDEX "upload_parts_created_at_idx" ON "upload_parts"("created_at");

ALTER TABLE "upload_parts" ADD CONSTRAINT "upload_parts_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
