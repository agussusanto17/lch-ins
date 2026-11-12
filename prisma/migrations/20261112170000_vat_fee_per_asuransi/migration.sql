-- Status PPN additional fee per asuransi (Harry, 12 November 2026): fee
-- tiap asuransi di panel bisa termasuk atau belum termasuk PPN.
ALTER TABLE "slip_security_panel" ADD COLUMN "additional_fee_include_vat" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "policy_insurers" ADD COLUMN "additional_fee_include_vat" BOOLEAN NOT NULL DEFAULT false;

-- Status lama berlaku untuk satu slip atau polis; salin ke setiap asuransinya.
-- Kolom lama di placing_slips dan policies dibiarkan supaya kode versi
-- sebelumnya tetap jalan selama deploy.
UPDATE "slip_security_panel" AS sp
SET "additional_fee_include_vat" = true
FROM "placing_slips" AS ps
WHERE ps."id" = sp."slip_id" AND ps."additional_fee_include_vat";

UPDATE "policy_insurers" AS pi
SET "additional_fee_include_vat" = true
FROM "policies" AS p
WHERE p."id" = pi."policy_id" AND p."additional_fee_include_vat";
