# Klausula slip Property tidak boleh ada di kedua section

- **Tanggal:** 2026-11-04
- **Branch:** `feat/deductible-klausula-per-section`
- **PR:** #104
- **Dikerjakan oleh:** Claude Code

## Latar belakang

PR #101 (`feat/klausula-per-section`) menambahkan dua menu klausula di slip Property:
- Section 1 — Material Damage (Clauses Section 1)
- Section 2 — Business Interruption (Clauses Section 2)

Namun, PR tersebut tidak mencegah pemilihan klausula yang sama di kedua section. Request LCH meminta satu klausula hanya boleh ada di SATU section.

## Yang berubah

- **Validasi di UI (`components/underwriting/placing-slip-form.tsx`):**
  - Menampilkan peringatan amber dengan ikon `AlertTriangle` di bawah menu klausula Section 2 bila ada klausula yang terpilih di kedua section
  - Menyelesaikan nama judul klausula dari master data (`clauseTitleLookup`) sehingga pesan peringatan dan toast error menampilkan judul asli klausula, bukan raw UUID
  - Mengirim `masterClauses` ke kedua komponen `ClausePicker` sehingga tidak ada duplicate network request
  - Menambahkan guard validasi di `handleSave` dan `goTo` yang menampilkan toast error dan memblokir penyimpanan jika ada duplikasi klausula
  - Memperbarui teks petunjuk Section 2 menjadi: "Pilih klausula khusus Section 2. Setiap klausula hanya boleh dipilih di salah satu section."

- **Validasi Pre-release (`components/underwriting/slip-model.ts` & `lib/server/tariffs.ts`):**
  - Mencegah release slip jika ada duplikasi klausula antar section

- **Validasi di server (`lib/server/placing-slips.ts`):**
  - Fungsi `validateClauseUniquenessAcrossSections` dipanggil di `insertSlipClauses`
  - Mencegah penyimpanan transaksi ke database jika ada klausula yang sama di Section 1 dan Section 2
  - Error message: "Klausula \"X, Y\" muncul di kedua section. Pilih klausula terpisah untuk Section 1 dan Section 2."

- **Fix TypeScript error di `lib/server/placing-slips.ts`:**
  - Query `clauses` untuk `listPlacingSlips` dan `getPlacingSlipById` diperbaiki
  - Prisma client perlu di-generate ulang untuk mendukung field `section` di `SlipClause`

## File utama

- `lib/validation.ts`: fungsi murni `validateClauseUniquenessAcrossSections` dengan lookup judul
- `lib/server/placing-slips.ts`: validasi server di `insertSlipClauses`
- `components/underwriting/placing-slip-form.tsx`: UI warning, title resolution, dan pre-submit guards
- `components/underwriting/slip-model.ts`: release blocker di `releaseIssues`
- `lib/server/tariffs.ts`: release blocker di `validatePlacingSlipForRelease`

## Dampak

- **Database:** tidak ada migrasi baru (field `section` sudah ada sejak PR #101)
- **Env:** tidak ada
- **Deploy:** tidak ada langkah tambahan

## Verifikasi

- `npx tsc --noEmit`: 0 error
- `npm run build`: success (Next.js 16.2.6 Turbopack)
- E2E test via `ego-browser` di `http://localhost:3000/underwriting/new`:
  - Deductible per cover muncul untuk setiap baris tarif (FLEXAS, EQVET, FWTWD, BI PAR, dll.)
  - Pilih Section 1: "Account Receivable Clause"
  - Pilih Section 2: "Account Receivable Clause" (duplikat)
  - Box peringatan muncul: `Klausula "Account Receivable Clause" muncul di kedua section. Pilih klausula terpisah untuk Section 1 dan Section 2.`
  - Klik "Simpan Draft" → Save diblokir, muncul toast error: `Klausula tidak valid: Klausula "Account Receivable Clause" muncul di kedua section...`
  - Batalkan pilihan duplikat di Section 2 → Peringatan otomatis hilang
  - Pilih klausula berbeda di Section 2 ("Accumulated Stock Clause") → Tidak ada peringatan duplikasi, form valid

## Catatan untuk yang melanjutkan

- Validasi mencegah duplikasi, tetapi tidak mencegah user menghapus satu section dan menyimpan
- Klausa yang sudah dipilih sebelumnya di Section 2 slip lama tidak dipindahkan otomatis
- Fungsi `insertSlipClauses` hanya menambahkan validasi untuk COB yang menggunakan section (Property)
