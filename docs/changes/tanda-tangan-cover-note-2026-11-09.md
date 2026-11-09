# Tanda tangan Draft Cover Note mengikuti contoh CN

- **Tanggal:** 2026-11-09
- **Branch:** `feat/tanda-tangan-cover-note`
- **PR:** [#192](https://github.com/agussusanto17/lch-ins/pull/192)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Permintaan 9 November 2026: kolom tanda tangan Draft Cover Note dibuat
  seperti contoh CN, tergantung asuransinya.
- Contohnya ada di `documents/contoh cover note`:
  - CN 728 (Mall Panakukkang, PAR+EQVET), co-insurance sembilan asuransi;
  - CN 743 (D'Best Group, Terrorism & Sabotage), satu asuransi 100%.
- Pola di kedua contoh:
  - "Jakarta, tanggal" di atas blok tanda tangan;
  - satu blok per asuransi berisi nama asuransi (huruf besar), ruang tanda
    tangan, lalu "( …… )";
  - co-insurance: dua kolom kiri-kanan, dengan "(25% share as Leader)" atau
    "(16% share as Member)" di bawah nama;
  - satu asuransi: cukup namanya, karena share 100% sudah tertulis di
    Security.
- Sebelumnya Draft Cover Note mencetak judul SIGNED, garis tanda tangan dengan
  nama, "Authorized Signatory", peran dan share, dan "Tanggal: ……" per asuransi,
  lalu tempat dan tanggal di bawahnya.

## Yang berubah

- **Draft Cover Note** memakai blok tanda tangan baru (`CoverNoteSignature`):
  - tempat dan tanggal di atas, tidak terpisah halaman dari baris pertama blok;
  - nama asuransi dalam huruf besar, kecuali "Tbk", seperti contoh;
  - co-insurance: dua kolom berurutan sesuai panel (leader di kiri atas), dan
    share serta peran tercetak miring di bawah nama;
  - satu asuransi: satu blok tanpa baris share;
  - ruang tanda tangan, lalu "( …… )";
  - judul SIGNED, "Authorized Signatory", dan "Tanggal: ……" tidak dicetak lagi.
- Panel asuransi yang masih kosong tetap mendapat satu blok bertuliskan
  "Nama Perusahaan Asuransi".
- Format tanggal tetap seperti dokumen lain ("10 November 2026"), tidak memakai
  "28th" seperti contoh, supaya sama dengan keputusan #180.
- **Closing Instruction tidak berubah**: tetap memakai blok Disiapkan oleh LCH
  dan Diterima & Ditandatangani per asuransi.

## File utama

- `components/documents/doc-blocks.tsx`: `CoverNoteSignature`.
- `components/documents/slip-documents.tsx`: `CoverNoteDocument`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint kedua file, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 140 lolos.
- **Uji cetak lokal** (Playwright dengan Chrome, sesi login sementara), Draft
  Cover Note dari empat slip contoh dengan satu, dua, tiga, dan empat asuransi:
  - tanggal di atas blok, dan urutan blok sama dengan urutan panel;
  - co-insurance mencetak "(x% share as Leader)" atau "(x% share as Member)"
    di setiap blok; satu asuransi tanpa baris share;
  - jumlah baris "( …… )" sama dengan jumlah asuransi;
  - tidak ada SIGNED dan Authorized Signatory;
  - PDF A4: tiga asuransi tercetak dua kolom, dan blok ketiga pindah ke halaman
    berikutnya di kolom kiri tanpa terpotong;
  - tanpa error halaman.
- Sesi sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- SIT-051 (tanda tangan per asuransi kiri-kanan) tetap berlaku untuk Cover
  Note dan Closing Instruction.
- Kalau LCH ingin tanggal bergaya "28th October 2026" seperti contoh, cukup
  ubah `place` di `CoverNoteDocument`.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
