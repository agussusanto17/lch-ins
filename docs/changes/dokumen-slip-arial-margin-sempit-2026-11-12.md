# Dokumen slip memakai Arial dan margin kiri-kanan lebih sempit

- **Tanggal:** 2026-11-12
- **Branch:** `feat/dokumen-slip-arial-margin-sempit`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- Permintaan untuk dokumen slip (placing slip, quotation slip, dan sejenisnya):
  - kurangi ruang kosong di kiri dan kanan halaman;
  - pakai font Arial.
- Sebelumnya semua dokumen cetak memakai Inter dengan margin kiri-kanan 18mm.
  Dokumen slip panjang dan padat tabel, jadi ruang kosongnya terasa boros.

## Yang berubah

- **Dokumen yang berubah:**
  - Placing Slip
  - Quotation Slip
  - Cover Note
  - Closing Instruction
  - Endorsement/Cancellation Slip
- **Font:** dokumen di atas memakai Arial (fallback Helvetica, lalu sans-serif).
  Ini berlaku di layar dan di hasil cetak.
- **Cetak dan PDF:** margin kiri-kanan isi menjadi 10mm, sebelumnya 18mm.
  - Kop logo yang berulang dan pita footer navy ikut bergeser, jadi ketiganya tetap sejajar.
  - Margin atas dan bawah tidak berubah.
- **Layar:** padding kartu dokumen dikurangi dari 48px ke 32px (desktop) dan
  dari 32px ke 24px (mobile). Footer layar ikut menyesuaikan.
- **Dokumen lain tidak berubah:** klaim, SPPA, endorsement polis, dan renewal
  tetap Inter dengan margin 18mm.

## File utama

- `app/globals.css`:
  - kelas `.doc-slip` memasang Arial dan variabel `--print-x: 10mm`;
  - `.print-header-fixed` membaca `--print-x`, default 18mm.
- `components/documents/document-shell.tsx`: prop baru `slip`. Prop ini memasang
  `.doc-slip`, padding kartu yang lebih kecil, dan margin isi cetak
  `var(--print-x, 18mm)`.
- `components/documents/letterhead.tsx`, `components/documents/printed-at.tsx`:
  - padding footer cetak membaca `--print-x`;
  - prop `compact` untuk margin footer layar.
- `components/documents/slip-documents.tsx`,
  `components/documents/endorsement-slip-document.tsx`: memakai `slip`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos.
- Cetak PDF lokal dengan Chrome (A4, background graphics aktif) untuk Placing
  Slip, Quotation Slip, Closing Instruction, dan Cover Note:
  - font yang tertanam di PDF hanya ArialMT, Arial-BoldMT, dan Arial-ItalicMT;
  - isi, kop, dan footer berjarak 10mm dari tepi kiri dan kanan;
  - footer navy tetap muncul di setiap halaman.
- Di layar, lebar footer sama dengan lebar kartu dokumen.
- Endorsement Slip tidak diuji visual karena DB lokal tidak punya datanya.
  Dokumen ini memakai shell dan prop yang sama.

## Catatan untuk yang melanjutkan

- Kenapa 10mm: ruang isi bertambah 16mm per halaman. Angka ini juga masih di
  atas batas area tak tercetak printer kantor pada umumnya (sekitar 4-5mm).
  Kalau perlu diubah, cukup ganti `--print-x` di `.doc-slip`.
- Kenapa Arial tidak dimuat lewat `next/font`: Arial sudah terpasang di Windows
  dan macOS, tempat dokumen dicetak. Di Linux tanpa Arial, browser jatuh ke
  Helvetica atau sans-serif bawaan.
- Ukuran huruf per blok (13px, 12.5px, dan seterusnya di `doc-blocks.tsx`) tidak
  diubah.
- Kalau dokumen lain perlu gaya yang sama, cukup tambah prop `slip` di
  `DocumentShell`.
