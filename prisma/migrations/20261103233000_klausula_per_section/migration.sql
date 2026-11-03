-- Klausula slip Property dipilih per section: 1 Material Damage, 2 Business
-- Interruption. Klausula yang berlaku untuk keduanya disimpan satu baris per
-- section, jadi kunci unik ikut memuat section. Klausula yang sudah ada masuk
-- Section 1 lewat nilai default.

-- DropIndex
DROP INDEX "slip_clauses_slip_id_clause_id_key";

-- AlterTable
ALTER TABLE "slip_clauses" ADD COLUMN     "section" SMALLINT NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "slip_clauses_slip_id_section_clause_id_key" ON "slip_clauses"("slip_id", "section", "clause_id");
