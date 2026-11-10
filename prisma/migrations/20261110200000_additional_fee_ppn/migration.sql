-- Additional fee placing slip bisa diisi termasuk PPN 2,2%, seperti Include VAT di brokerage.
ALTER TABLE "placing_slips" ADD COLUMN "additional_fee_include_vat" BOOLEAN NOT NULL DEFAULT false;
