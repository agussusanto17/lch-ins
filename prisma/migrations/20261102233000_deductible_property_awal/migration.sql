-- Pilihan deductible awal untuk COB Property (kode 01), berlaku untuk semua
-- type of cover. Daftar dari Harry, 2 Nov 2026; sisanya LCH tambahkan sendiri
-- di Master Data > Deductible. Teks yang sudah ada tidak ditambah lagi.
INSERT INTO "deductible_options" ("cob_id", "text", "updated_at")
SELECT c."id", v."text", CURRENT_TIMESTAMP
FROM "classes_of_business" c
CROSS JOIN (VALUES
  ('Fire, Lightning, Explosion, Impact by Falling Aircraft and Smoke Damage (FLEXAS) : NIL'),
  ('Flood, Windstorm, Tempes, Water Damage (FWTWD) : 10% of Claim'),
  ('Riots, Strikes, Malicious Damage, Civil Commotion: 5% of claim, minimum IDR 5,000,000'),
  ('Vehicle Impact : NIL'),
  ('Others Losses : IDR 1,000,000'),
  ('Earthquake, Volcanic Eruption and Tsunami (EQVET) : 2.5% of Total Sum Insured / declare value any one risk at any one location')
) AS v("text")
WHERE c."code" = '01'
  AND NOT EXISTS (
    SELECT 1 FROM "deductible_options" d
    WHERE d."cob_id" = c."id" AND d."text" = v."text"
  );
