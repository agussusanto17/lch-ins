# Nomor Quotation Slip memakai kode QS, Closing Instruction ikut kode cover

- **Tanggal:** 2026-11-03
- **Branch:** `fix/nomor-quotation-closing`
- **PR:** [#96](https://github.com/agussusanto17/lch-ins/pull/96)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dokumen Quotation Slip mencetak nomor Placing Slip apa adanya, misalnya
`002/LCH-PLCMT/PS-MV/XI/2026`, padahal kodenya seharusnya QS. Closing
Instruction sudah memakai kode CI, tapi kode cover-nya hilang:
`002/LCH-PLCMT/CI/XI/2026` (Request & Temuan REQ-015).

Aturan dari Harry, 19 Oktober 2026: Placing Slip, Quotation Slip, dan Closing
Instruction untuk satu placement memakai nomor urut yang sama, hanya kode
dokumennya yang berbeda.

## Yang berubah

- `derivedDocNumber` menurunkan nomor QS, CN, dan CI dari nomor slip dengan
  mempertahankan kode cover: `PS-MV` menjadi `QS-MV`, `CN-MV`, dan `CI-MV`.
  Nomor urut, bulan, dan tahun tetap sama.
- Dokumen Quotation Slip memakai nomor QS.
- Closing Instruction sekarang ikut membawa kode cover (`CI-MV`, sebelumnya
  `CI`).
- Placing Slip dan Cover Note tidak berubah.

## File utama

- `components/underwriting/slip-model.ts`: `derivedDocNumber`.
- `components/documents/slip-documents.tsx`: nomor di Quotation Slip.

## Dampak

- **Database:** tidak ada. Nomor QS dan CI tidak disimpan, selalu diturunkan
  dari nomor slip saat dokumen dibuka.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Keempat dokumen dirender lewat skrip dengan nomor slip
  `002/LCH-PLCMT/PS-MV/XI/2026`:

  | Dokumen | Sebelum | Sesudah |
  |---|---|---|
  | Placing Slip | PS-MV | PS-MV |
  | Quotation Slip | PS-MV | QS-MV |
  | Cover Note | CN-MV | CN-MV |
  | Closing Instruction | CI | CI-MV |

- Slip tanpa kode cover (`001/LCH-PLCMT/PS/VIII/2026`) menjadi QS, CN, dan CI.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Format nomor Cover Note masih usulan, menunggu contoh dokumen dari LCH.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
