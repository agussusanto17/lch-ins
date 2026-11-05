-- 62 klausula Engineering (kelompok MB) berlaku untuk semua type of cover
-- Engineering, bukan hanya Machinery Breakdown (SIT-035, opsi A, 5 November
-- 2026). Slip CAR, EAR, EEI, CPM, dan CECR sebelumnya tidak menemukan
-- klausula Engineering sama sekali.
UPDATE "clauses"
SET "cover_type_id" = NULL, "updated_at" = CURRENT_TIMESTAMP
WHERE "source_group" = 'MB' AND "cover_type_id" IS NOT NULL;
