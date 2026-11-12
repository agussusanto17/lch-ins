# COVERAGE dicetak di atas INTEREST INSURED

- **Tanggal:** 2026-11-12
- **Branch:** `fix/urutan-coverage-di-atas-interest-insured`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- Sejak 5 November 2026, section COVERAGE dicetak setelah INTEREST INSURED,
  mengikuti CI Machinery Breakdown LCH. Lihat
  `cetak-coverage-interest-nomor-klausula-2026-11-05.md`.
- LCH sekarang meminta COVERAGE dicetak di atas INTEREST INSURED. Permintaan
  ini datang lewat screenshot print out slip.

## Yang berubah

- COVERAGE sekarang dicetak sebelum INTEREST INSURED di:
  - Placing Slip
  - Quotation Slip
  - Cover Note
  - Closing Instruction
- Isi kedua section tidak berubah. Section lain juga tetap di urutan yang
  sama.
- Slip tanpa isian coverage, termasuk Motor Vehicle, tidak berubah, karena
  section COVERAGE memang tidak dicetak di slip itu.

## File utama

- `components/documents/slip-documents.tsx`: urutan `CoverageBlock` dan
  `InterestBlock` ditukar di keempat dokumen.
- `components/documents/doc-blocks.tsx`: komentar `CoverageBlock` diperbarui
  dengan urutan baru.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos.
- Buka Placing Slip yang punya isian coverage, lalu cetak:
  - COVERAGE muncul tepat setelah tabel detail;
  - INTEREST INSURED dan Total Limit of Liability muncul setelah COVERAGE.

## Catatan untuk yang melanjutkan

- Endorsement Slip tidak memakai `CoverageBlock`, jadi tidak ikut berubah.
