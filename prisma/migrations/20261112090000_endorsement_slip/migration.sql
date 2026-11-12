-- Endorsement dan cancellation slip di Placement (Harry, 11 November 2026).
CREATE TYPE "SlipKind" AS ENUM ('Placing', 'Endorsement', 'Cancellation');

ALTER TABLE "placing_slips" ADD COLUMN     "base_slip_id" UUID,
ADD COLUMN     "before_calc" JSONB,
ADD COLUMN     "change_description" TEXT,
ADD COLUMN     "effective_date" DATE,
ADD COLUMN     "kind" "SlipKind" NOT NULL DEFAULT 'Placing',
ADD COLUMN     "parent_policy_id" UUID;

CREATE INDEX "placing_slips_parent_policy_id_idx" ON "placing_slips"("parent_policy_id");

ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_parent_policy_id_fkey" FOREIGN KEY ("parent_policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "placing_slips" ADD CONSTRAINT "placing_slips_base_slip_id_fkey" FOREIGN KEY ("base_slip_id") REFERENCES "placing_slips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
