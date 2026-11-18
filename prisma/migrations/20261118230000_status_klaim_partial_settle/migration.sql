-- Status klaim Partial Settle (MoM review Phase 1, poin 9): klaim yang baru diselesaikan sebagian,
-- tetap dihitung klaim berjalan. Urutan: Outstanding, Partial Settle, Settled, Closed, Rejected.
UPDATE "lookup_values"
SET "sort_order" = "sort_order" + 1, "updated_at" = CURRENT_TIMESTAMP
WHERE "lookup_type" = 'claim_status' AND "code" IN ('settled', 'closed', 'rejected');

INSERT INTO "lookup_values" ("lookup_type", "code", "name", "sort_order", "is_system", "is_active", "updated_at")
VALUES ('claim_status', 'partial_settle', 'Partial Settle', 1, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("lookup_type", "code") DO NOTHING;
