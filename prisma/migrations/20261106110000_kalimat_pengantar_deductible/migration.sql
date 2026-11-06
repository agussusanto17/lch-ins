-- Kalimat di atas daftar deductible jadi isian manual (permintaan LCH,
-- 6 November 2026); sebelumnya dicetak otomatis di slip Property.
ALTER TABLE "placing_slips" ADD COLUMN "deductible_intro" TEXT;

-- Slip Property yang selama ini mencetak kalimat itu (punya deductible) diisi
-- kalimat yang sama, supaya cetakannya tidak berubah.
UPDATE "placing_slips" s
SET "deductible_intro" = 'Any one loss or series of losses arising out of any one event:'
FROM "classes_of_business" c
WHERE c."id" = s."cob_id"
  AND upper(btrim(c."name")) = 'PROPERTY'
  AND EXISTS (
    SELECT 1
    FROM "slip_rate_lines" r, unnest(r."deductibles") AS d
    WHERE r."slip_id" = s."id" AND btrim(d) <> ''
  );
