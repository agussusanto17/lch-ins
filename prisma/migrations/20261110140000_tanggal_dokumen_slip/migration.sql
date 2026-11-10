-- Tanggal dokumen per jenis (jawaban Harry no. 10, 10 November 2026):
-- Placing Slip memakai tanggal release, Quotation Slip dan Draft Cover Note
-- tanggal quoted, Closing Instruction tanggal closing.
ALTER TABLE "placing_slips"
  ADD COLUMN "release_date" DATE,
  ADD COLUMN "quoted_date" DATE,
  ADD COLUMN "closing_date" DATE;

-- Slip lama. Tanggal release dari released_at; slip yang sudah lewat release
-- tanpa released_at (data contoh) memakai tanggal terakhir disimpan, sama
-- dengan yang tercetak sebelum perubahan ini.
UPDATE "placing_slips"
SET "release_date" = COALESCE(
  ("released_at" AT TIME ZONE 'Asia/Jakarta')::date,
  ("updated_at" AT TIME ZONE 'Asia/Jakarta')::date
)
WHERE "released_at" IS NOT NULL
   OR "status" IN ('Released', 'Quoted', 'Closed');

-- Tanggal quoted dari perpindahan status pertama ke Quoted (atau langsung ke
-- Closed) di audit trail. Tanpa jejak audit: tanggal terakhir disimpan.
UPDATE "placing_slips" s
SET "quoted_date" = COALESCE(
  (
    SELECT (MIN(a."created_at") AT TIME ZONE 'Asia/Jakarta')::date
    FROM "audit_logs" a
    WHERE a."entity" = 'placing_slips'
      AND a."entity_id" = s."id"
      AND a."changes" -> 'status' ->> 'after' IN ('Quoted', 'Closed')
  ),
  (s."updated_at" AT TIME ZONE 'Asia/Jakarta')::date
)
WHERE s."status" IN ('Quoted', 'Closed');

-- Tanggal closing dari perpindahan status pertama ke Closed.
UPDATE "placing_slips" s
SET "closing_date" = COALESCE(
  (
    SELECT (MIN(a."created_at") AT TIME ZONE 'Asia/Jakarta')::date
    FROM "audit_logs" a
    WHERE a."entity" = 'placing_slips'
      AND a."entity_id" = s."id"
      AND a."changes" -> 'status' ->> 'after' = 'Closed'
  ),
  (s."updated_at" AT TIME ZONE 'Asia/Jakarta')::date
)
WHERE s."status" = 'Closed';
