# Judul cetak: ENDORSEMENT SLIP dan CANCELLATION SLIP

- **Tanggal:** 2026-11-11
- **Branch:** `fix/judul-endorsement-slip`
- **PR:** [#220](https://github.com/agussusanto17/lch-ins/pull/220)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Koreksi Harry di cetakan endorsement, diteruskan Agus pada 11 November 2026: judul "ENDORSEMENT" seharusnya "ENDORSEMENT SLIP". Lanjutan `cetak-endorsement-2026-11-10.md` (#215).

## Yang berubah

- **Judul cetak endorsement** menjadi ENDORSEMENT SLIP, dan cetak pembatalan menjadi CANCELLATION SLIP.
- **Menu baris Policy Database** menjadi "Cetak endorsement slip" dan "Cetak cancellation slip".

## File utama

- `lib/endorsement-slip.ts`, `components/policies/policy-database.tsx`, `tests/endorsement-slip.test.ts`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts` (187 tes), dan `npm run build`: lolos.
- **Uji browser lokal:** menu baris `SIT/PA/2026/001-END1` memuat "Cetak endorsement slip", dan halaman cetaknya berjudul ENDORSEMENT SLIP. Tidak ada error di console.

## Catatan untuk yang melanjutkan

- **Usulan Harry:** endorsement dan cancellation dibuat dari menu Placement sebagai jenis slip, dengan form slip dan cetakan seperti ini. Analisanya dikirim ke Agus dan belum diputuskan.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
