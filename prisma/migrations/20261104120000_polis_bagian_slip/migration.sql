-- Bagian slip PAR + EQVET yang menjadi polis (PAR atau EQVET). Slip PAR + EQVET
-- terbit sebagai dua polis; slip lain satu polis. Polis yang sudah ada kosong.

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "slip_part" TEXT;
