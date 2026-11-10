-- Nama status klaim "Close" menjadi "Closed" (catatan meeting LCH,
-- 10 November 2026). Seed sudah menulis "Closed", tapi upsert seed tidak
-- menimpa nama yang sudah ada, jadi database lama masih "Close". Nama lain
-- yang diganti LCH sendiri di Master Data tidak disentuh.
UPDATE "lookup_values"
SET "name" = 'Closed', "updated_at" = now()
WHERE "lookup_type" = 'claim_status'
  AND "code" = 'closed'
  AND "name" = 'Close';
