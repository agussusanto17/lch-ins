-- Peserta PA grup per polis (jawaban Harry, 6 November 2026): disalin dari slip
-- saat polis dibuat, lalu bertambah atau berkurang lewat endorsement dengan
-- tanggal berlakunya. Klaim PA nantinya menunjuk peserta ini.

-- CreateTable
CREATE TABLE "policy_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policy_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "id_number" TEXT,
    "birth_date" DATE,
    "gender" TEXT,
    "position" TEXT,
    "level" TEXT,
    "work_location" TEXT,
    "sum_insured" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "beneficiary" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "added_by_policy_id" UUID,
    "removed_by_policy_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "policy_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "policy_participants_policy_id_sort_order_idx" ON "policy_participants"("policy_id", "sort_order");

-- CreateIndex
CREATE INDEX "policy_participants_added_by_policy_id_idx" ON "policy_participants"("added_by_policy_id");

-- CreateIndex
CREATE INDEX "policy_participants_removed_by_policy_id_idx" ON "policy_participants"("removed_by_policy_id");

-- AddForeignKey
ALTER TABLE "policy_participants" ADD CONSTRAINT "policy_participants_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_participants" ADD CONSTRAINT "policy_participants_added_by_policy_id_fkey" FOREIGN KEY ("added_by_policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_participants" ADD CONSTRAINT "policy_participants_removed_by_policy_id_fkey" FOREIGN KEY ("removed_by_policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
