-- Additional fee menjadi persen per asuransi di panel Security saat closing,
-- dan polis menyimpan status PPN brokerage serta additional fee dari slip
-- (Harry, 12 November 2026).
ALTER TABLE "slip_security_panel" ADD COLUMN "additional_fee_pct" DECIMAL(12,6) NOT NULL DEFAULT 0;
ALTER TABLE "policy_insurers" ADD COLUMN "additional_fee_pct" DECIMAL(12,6) NOT NULL DEFAULT 0;
ALTER TABLE "policies" ADD COLUMN "include_vat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "additional_fee_include_vat" BOOLEAN NOT NULL DEFAULT false;

-- Isian lama "Additional Fee" di slip berupa angka. Angka sampai 100 adalah
-- persen (contoh Harry: 15 berarti 15%, bukan Rp 15), berlaku untuk semua
-- asuransi di panel slip itu.
UPDATE "slip_security_panel" AS sp
SET "additional_fee_pct" = s."additional_fee"
FROM "placing_slips" AS s
WHERE sp."slip_id" = s."id"
  AND s."additional_fee" > 0
  AND s."additional_fee" <= 100;

-- Polis: angka 0 < fee <= 100 menjadi persen. Fee lain (di atas 100, atau
-- negatif pada pembatalan) tetap nominalnya: persennya dihitung dari premi,
-- supaya nominal tidak berubah saat polis dihitung ulang.
UPDATE "policy_insurers" AS pi
SET "additional_fee_pct" = CASE
    WHEN p."additional_fee" > 0 AND p."additional_fee" <= 100 THEN p."additional_fee"
    WHEN p."premium" <> 0 THEN round(p."additional_fee" / p."premium" * 100, 6)
    ELSE 0
  END
FROM "policies" AS p
WHERE pi."policy_id" = p."id"
  AND p."additional_fee" <> 0;

-- Nominal fee polis yang tadinya persen: premi × fee (%) tertimbang share.
UPDATE "policies" AS p
SET "additional_fee" = round(p."premium" * w."pct" / 100, 2)
FROM (
  SELECT "policy_id", sum("share_pct" * "additional_fee_pct") / 100 AS "pct"
  FROM "policy_insurers"
  GROUP BY "policy_id"
) AS w
WHERE w."policy_id" = p."id"
  AND p."additional_fee" > 0
  AND p."additional_fee" <= 100;

-- Status PPN brokerage dan additional fee polis mengikuti slipnya.
UPDATE "policies" AS p
SET "include_vat" = s."include_vat",
    "additional_fee_include_vat" = s."additional_fee_include_vat"
FROM "placing_slips" AS s
WHERE p."placing_slip_id" = s."id";
