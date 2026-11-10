-- Endorsement: rate untuk premi prorata hari, biaya administrasi, dan bea meterai.
ALTER TABLE "policies" ADD COLUMN "rate" DECIMAL(12,6);
ALTER TABLE "policies" ADD COLUMN "premium_basis" DECIMAL(18,2);
ALTER TABLE "policies" ADD COLUMN "admin_cost" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "policies" ADD COLUMN "stamp_duty" DECIMAL(18,2) NOT NULL DEFAULT 0;
