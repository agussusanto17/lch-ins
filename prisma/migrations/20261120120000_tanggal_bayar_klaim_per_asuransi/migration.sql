-- Tanggal bayar klaim per asuransi polis (Agus, 20 November 2026): asuransi co-insurance membayar
-- bagiannya sendiri-sendiri, dan kecepatan bayarnya dihitung dari tanggal LOD ke asuransi.
CREATE TABLE "claim_insurer_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claim_id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "paid_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "claim_insurer_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "claim_insurer_payments_claim_id_insurer_id_key" ON "claim_insurer_payments"("claim_id", "insurer_id");

CREATE INDEX "claim_insurer_payments_insurer_id_idx" ON "claim_insurer_payments"("insurer_id");

ALTER TABLE "claim_insurer_payments" ADD CONSTRAINT "claim_insurer_payments_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "claim_insurer_payments" ADD CONSTRAINT "claim_insurer_payments_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
