# Daftar deductible di print out memakai bullet

- **Tanggal:** 2026-11-03
- **Branch:** `fix/deductible-bullet-print`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Sejak PR #84 ([cetak-deductible-tanpa-kolom-cover-2026-11-03.md](cetak-deductible-tanpa-kolom-cover-2026-11-03.md)),
bagian DEDUCTIBLE & CONDITIONS mencetak teks deductible sebagai baris-baris
bergaris tanpa penanda. Diminta memakai bullet, misalnya tanda "-", supaya
print out lebih rapi (Request & Temuan REQ-018).

## Yang berubah

- Setiap deductible dicetak dengan tanda "-", sama dengan daftar rate dari PR
  #92. Garis antarbaris dihapus.
- Teks yang panjang menjorok sejajar teks di baris berikutnya, bukan sejajar
  tanda "-".
- Berlaku di keempat dokumen: Placing Slip, Quotation Slip, Cover Note, dan
  Closing Instruction. Special Conditions tidak berubah.

## File utama

- `components/documents/doc-blocks.tsx`: `DeductibleBlock`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- `DeductibleBlock` dirender dengan CSS hasil build, sebelum dan sesudah,
  memakai enam teks deductible Property dari master data. Teks EQVET yang
  panjang terlipat dan menjorok sejajar teks.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
