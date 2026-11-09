# Tanda tangan Draft Cover Note dan Closing Instruction

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
- Coretan Agus di dokumen demo (9 November 2026):
  - **Cover Note:** tanggal pindah ke atas, tepat di bawah judul SIGNED;
    "Authorized Signatory" dan "Tanggal: ……" per asuransi dihapus.
  - **Closing Instruction:** bagian SIGNED dengan blok per asuransi dihapus.
    Closing Instruction dikirim ke masing-masing asuransi, bukan ditandatangani
    bersama seperti Cover Note, jadi tanda tangan asuransi cukup satu, di
    sebelah blok LCH.
- CI LCH yang sudah ditandatangani juga begitu: LCH di kiri, "Confirm &
  Acceptance" di kanan (`documents/SISKA RAHARJA - signed Closing Instruction
  PAR+EQVET 2026.pdf` dan CI TRUCKINDO).

## Yang berubah

- **Draft Cover Note** memakai blok tanda tangan baru (`CoverNoteSignature`):
  - judul SIGNED, lalu tempat dan tanggal tepat di bawahnya, tidak terpisah
    halaman dari baris pertama blok;
  - nama asuransi dalam huruf besar, kecuali "Tbk", seperti contoh;
  - co-insurance: dua kolom berurutan sesuai panel (leader di kiri atas), dan
    share serta peran tercetak miring di bawah nama;
  - satu asuransi: satu blok tanpa baris share;
  - ruang tanda tangan, lalu "( …… )";
  - "Authorized Signatory" dan "Tanggal: ……" tidak dicetak lagi.
  - Panel asuransi yang masih kosong tetap mendapat satu blok bertuliskan
    "Nama Perusahaan Asuransi".
- **Closing Instruction:**
  - bagian SIGNED dengan satu blok per asuransi dihapus;
  - di sebelah kanan blok Disiapkan oleh / Prepared by LCH, ada satu kolom
    "Diterima & Ditandatangani / Accepted & Signed by,";
  - nama asuransi dicetak di kolom itu bila panel hanya berisi satu asuransi.
    Co-insurance dibiarkan kosong untuk nama dan cap asuransi penerima.
- `InsurerSignatureGrid` (blok per asuransi yang dulu dipakai keduanya) dihapus
  karena tidak dipakai lagi.
- Format tanggal tetap seperti dokumen lain ("10 November 2026"), tidak memakai
  "28th" seperti contoh, supaya sama dengan keputusan #180.

## File utama

- `components/documents/doc-blocks.tsx`: `CoverNoteSignature`.
- `components/documents/slip-documents.tsx`: `CoverNoteDocument` dan
  `ClosingInstructionDocument`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint kedua file, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 140 lolos.
- **Uji cetak lokal** (Playwright dengan Chrome, sesi login sementara):
  - Draft Cover Note dari slip contoh dengan satu, dua, tiga, dan empat
    asuransi:
    - judul SIGNED, lalu tanggal tepat di bawahnya;
    - urutan blok sama dengan urutan panel;
    - co-insurance mencetak "(x% share as Leader)" atau "(x% share as
      Member)" di setiap blok; satu asuransi tanpa baris share;
    - jumlah baris "( …… )" sama dengan jumlah asuransi;
    - tidak ada Authorized Signatory dan Tanggal;
    - PDF A4 dua kolom; dengan tiga asuransi, blok ketiga pindah ke halaman
      berikutnya di kolom kiri tanpa terpotong.
  - Closing Instruction dari slip empat asuransi dan satu asuransi:
    - tidak ada bagian SIGNED dan tidak ada Tanggal;
    - satu kolom penerimaan, sejajar di kanan blok LCH;
    - nama asuransi hanya tercetak di slip satu asuransi.
  - Tanpa error halaman.
- Sesi sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- SIT-051 (tanda tangan per asuransi kiri-kanan di Cover Note dan Closing
  Instruction) perlu ditulis ulang: blok per asuransi sekarang hanya di Cover
  Note.
- Kalau LCH ingin tanggal bergaya "28th October 2026" seperti contoh, cukup
  ubah `place` di `CoverNoteDocument` dan tanggal di
  `ClosingInstructionDocument`.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
