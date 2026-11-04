# Klausula slip Property tidak boleh ada di kedua section

- **Tanggal:** 2026-11-04
- **Branch:** `feat/deductible-klausula-per-section`
- **PR:** TBA
- **Dikerjakan oleh:** Claude Code

## Latar belakang

PR #101 (`feat/klausula-per-section`) menambahkan dua menu klausula di slip Property:
- Section 1 — Material Damage (Clauses Section 1)
- Section 2 — Business Interruption (Clauses Section 2)

Namun, PR tersebut tidak mencegah pemilihan klausula yang sama di kedua section. Request LCH meminta satu klausula hanya boleh ada di SATU section.

## Yang berubah

- **Validasi di server (`lib/server/placing-slips.ts`):**
  - Fungsi `validateClauseUniquenessAcrossSections` dipanggil di `insertSlipClauses`
  - Mencegah penyimpanan jika ada klausula yang sama di Section 1 dan Section 2
  - Error message: "Klausula \"X, Y\" muncul di kedua section. Pilih klausula terpisah untuk Section 1 dan Section 2."

- **Validasi di UI (`components/underwriting/placing-slip-form.tsx`):**
  - Menampilkan peringatan merah/amber di bawah menu klausula Section 2
  - Peringatan muncul jika ada duplikasi klausula antar section
  - Membantu user memperbaiki sebelum save

- **Fix TypeScript error di `lib/server/placing-slips.ts`:**
  - Query `clauses` untuk `listPlacingSlips` dan `getPlacingSlipById` diperbaiki
  - Prisma client perlu di-generate ulang untuk mendukung field `section` di `SlipClause`

## File utama

- `lib/validation.ts`: `validateClauseUniquenessAcrossSections`
- `lib/server/placing-slips.ts`: validasi di `insertSlipClauses`
- `components/underwriting/placing-slip-form.tsx`: UI warning

## Dampak

- **Database:** tidak ada migrasi baru (field `section` sudah ada sejak PR #101)
- **Env:** tidak ada
- **Deploy:** tidak ada langkah tambahan

## Verifikasi

- `npx tsc --noEmit`: 0 error
- `npm run build`: success
- Graphify updated: 2653 nodes
- Manual test:
  - Select clause "C" di Section 1 dan Section 2 → warning muncul
  - Save → server menolak dengan error message
  - Pilih klausula berbeda di kedua section → save berhasil

## Catatan untuk yang melanjutkan

- Validasi mencegah duplikasi, tetapi tidak mencegah user menghapus satu section dan menyimpan
- Klausa yang sudah dipilih sebelumnya di Section 2 slip lama tidak dipindahkan otomatis
- Fungsi `insertSlipClauses` hanya menambahkan validasi untuk COB yang menggunakan section (Property)
