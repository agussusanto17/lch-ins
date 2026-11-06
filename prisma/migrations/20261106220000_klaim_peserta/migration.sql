-- Klaim PA grup menunjuk peserta yang mengalami kejadian (jawaban Harry,
-- 6 November 2026). Peserta yang sudah punya klaim tidak bisa dihapus.

-- AlterTable
ALTER TABLE "claims" ADD COLUMN "participant_id" UUID;

-- CreateIndex
CREATE INDEX "claims_participant_id_idx" ON "claims"("participant_id");

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "policy_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
