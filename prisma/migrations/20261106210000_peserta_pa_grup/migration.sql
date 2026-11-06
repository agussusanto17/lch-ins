-- Peserta PA grup per orang (jawaban Harry, 6 November 2026 atas pertanyaan 14
-- analisa contoh slip LCH): data peserta diinput satu per satu, dicetak
-- sebagai lampiran slip, dan nantinya dipakai klaim serta endorsement.
CREATE TABLE "slip_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slip_id" UUID NOT NULL,
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "slip_participants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "slip_participants_slip_id_sort_order_idx" ON "slip_participants"("slip_id", "sort_order");

ALTER TABLE "slip_participants" ADD CONSTRAINT "slip_participants_slip_id_fkey" FOREIGN KEY ("slip_id") REFERENCES "placing_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
