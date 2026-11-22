-- Deklarasi MOP (Agus, 22 November 2026): premi deklarasi menjadi premi ke asuransi menurut rate
-- MOP, dan premi tagihan ke klien (rate yang diupload, misalnya 0,12% dari polis Merimen) disimpan
-- di kolom sendiri. Margin = premi tagihan ke klien − premi deklarasi. Sebelumnya (#297) premi
-- deklarasi adalah premi ke klien dan insurer_premium adalah premi ke asuransi.
ALTER TABLE "policies" RENAME COLUMN "insurer_premium" TO "client_premium";

-- Tukar isi deklarasi lama: premi ke klien pindah ke client_premium, premi ke asuransi (bila ada)
-- menjadi premium. Deklarasi tanpa premi ke asuransi tetap memakai premium yang sama, jadi
-- marginnya 0 sampai premi tagihan ke klien diubah.
UPDATE "policies"
SET "premium" = COALESCE("client_premium", "premium"),
    "client_premium" = "premium"
WHERE "policy_type_id" IN (
  SELECT "id" FROM "lookup_values" WHERE "lookup_type" = 'policy_type' AND "code" = 'declaration'
);
