# The Business dicetak di bawah Correspondence Address

- **Tanggal:** 2026-11-13
- **Branch:** `fix/urutan-business-dokumen`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- The Business diisi lewat Detail tambahan slip. Semua Detail tambahan
  dicetak di akhir tabel detail, setelah Period of Insurance dan Risk
  Location.
- LCH minta baris The Business dicetak tepat di bawah Correspondence
  Address. Permintaan ini datang lewat screenshot print out slip GPA
  PT. Salam Pacific Indonesia Lines.

## Yang berubah

- Baris Detail tambahan berlabel "The Business" atau "Business" (huruf besar
  kecil bebas) dicetak tepat setelah Correspondence Address, sebelum Period
  of Insurance.
- Detail tambahan lain tetap di akhir tabel detail, di urutan yang sama.
- Berlaku untuk Placing Slip, Quotation Slip, Cover Note, dan Closing
  Instruction, karena keempatnya memakai tabel detail yang sama.
- Form input tidak berubah. Urutan di form tetap seperti yang diisi user.

## File utama

- `lib/slip-details.ts`: `isBusinessLabel()`.
- `components/documents/doc-blocks.tsx`: `DetailTable` menaruh baris The
  Business setelah Correspondence Address.
- `tests/slip-details.test.ts`: test `isBusinessLabel`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos. Test `slip-details` lolos.
- Cek E2E di browser lokal (mode cetak). Slip Marine Cargo diberi Detail
  tambahan sementara "Voyage" lalu "The Business", kemudian dikembalikan.
  Urutan cetak: Correspondence Address, The Business, Period of Insurance,
  Risk Location, Voyage.

## Catatan untuk yang melanjutkan

- Label lain yang mengandung kata business, misalnya "Nature of Business",
  tidak ikut dipindah. Kalau LCH memakai label itu untuk maksud yang sama,
  tambahkan polanya di `isBusinessLabel()`.
