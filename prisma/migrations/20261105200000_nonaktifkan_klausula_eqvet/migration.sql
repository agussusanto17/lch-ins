-- Klausula kelompok EQVET dinonaktifkan (Harry, 5 November 2026): judulnya
-- kembar dengan klausula PAR, jadi membingungkan saat memilih klausula di slip.
-- Dinonaktifkan, bukan dihapus: salinan klausula di slip lama tetap utuh, dan
-- klausulanya masih ada di database kalau nanti perlu diaktifkan lagi.
UPDATE "clauses"
SET "is_active" = false, "updated_at" = CURRENT_TIMESTAMP
WHERE "source_group" = 'EQVET' AND "is_active" = true;
