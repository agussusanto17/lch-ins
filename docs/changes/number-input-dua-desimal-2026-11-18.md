# Tampilkan 2 desimal pada semua NumberInput nominal uang

- **Tanggal:** 2026-11-18
- **Branch:** `fix/number-input-dua-desimal`
- **PR:** #269
- **Dikerjakan oleh:** Zero dengan Antigravity

## Latar belakang

- Pada form input nominal uang (seperti baris nilai pada `Section 1 — Material Damage` di Placing Slip), angka bulat seperti `20518080000` tampil sebagai `20.518.080.000` tanpa `,00`, dan angka dengan 1 desimal seperti `390714004.2` tampil sebagai `390.714.004,2` (nol di belakang koma hilang).
- Hal ini terjadi karena preset `money` pada `NumberInput` memakai `minimumFractionDigits: 0`.
- Diminta agar semua `NumberInput` nominal uang selalu menampilkan 2 angka di belakang koma.

## Yang berubah

- Mengubah preset `money` pada `NumberInput` dari `minimumFractionDigits: 0` menjadi `minimumFractionDigits: 2` (tetap `maximumFractionDigits: 2`).
- Seluruh input uang yang memakai `NumberInput` dengan `preset="money"` (termasuk default tanpa prop `preset`) kini konsisten memformat nilai dengan 2 angka di belakang koma (misalnya `20.518.080.000,00` dan `390.714.004,20`).

## File utama

- `components/ui/number-input.tsx`: mengubah `PRESETS.money.minimumFractionDigits` menjadi `2`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npm run db:generate`
- `npx tsc --noEmit`
- `npm run build`
- `npx tsx --test tests/*.test.ts`

## Catatan untuk yang melanjutkan

- Preset `rate`, `percent`, dan `integer` tidak diubah.
- Tampilan teks ringkasan seperti `money()` di `lib/format.ts` tetap menyembunyikan `,00` pada nominal IDR bulat (berbeda dengan `moneyCents()`).
