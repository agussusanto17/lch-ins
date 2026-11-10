# Perbaikan Footer Bar Navy pada Dokumen Cetak A4

- **Tanggal:** 2026-11-10
- **Branch:** `fix/footer-cetak-dokumen`
- **PR:** #199
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Pada dialog print preview dokumen Placing Slip (dan dokumen cetak lainnya seperti Quotation Slip, Cover Note, Closing Instruction, Renewal, SPPA, dan Klaim), footer bar navy (`#2e243e` berisi alamat kantor Springhill Office Tower dan badge regulasi OJK & APPARINDO) tidak muncul di halaman cetak.

Pemeriksaan mendalam dan pengujian DOM/CDP menemukan akar masalah utama:
1. Pada `app/globals.css`, `@layer base` mendefinisikan `html, body { overflow-x: clip; }`. Namun pada blok `@media print`, properti `overflow` tidak di-reset kembali menjadi `visible`. Pada mesin Chromium/Blink, `overflow: clip` atau `overflow` selain `visible` pada elemen `html` atau `body` membatasi viewport paged media ke batas tinggi window layar (sekitar 746px) alih-alih tinggi halaman fisik A4 (297mm), sehingga elemen `position: fixed; bottom: 0` terdorong ke luar area cetak atau dihilangkan (*culled*) oleh layout engine.
2. Wrapper kontainer `DocumentShell` menggunakan `display: flex` tanpa override `print:block`, yang dapat mengganggu fragmentasi dan repetisi CSS paged media pada layout multi-halaman.
3. Elemen `.print-footer-fixed` dan `footer` di `letterhead.tsx` memerlukan deklarasi eksplisit `print-color-adjust: exact` dan `-webkit-print-color-adjust: exact` agar pita warna navy dan teks putih tetap tercetak solid tanpa bergantung pada opsi manual "Background graphics" di browser user.

## Yang berubah

- **Reset Overflow dan Tinggi Halaman Cetak (`globals.css`):**
  - Menambahkan `overflow: visible !important`, `overflow-x: visible !important`, `overflow-y: visible !important`, serta `height: auto !important` dan `min-height: 0 !important` pada `html, body` di dalam `@media print`.
  - Menambahkan `print-color-adjust: exact` dan `-webkit-print-color-adjust: exact` pada `.print-footer-fixed`.
- **Layout Cetak Block Container (`document-shell.tsx`):**
  - Menambahkan utilitas `print:block print:gap-0` pada wrapper kontainer `DocumentShell` agar beralih dari Flexbox ke Block layout standar saat dicetak.
- **Warna Latar Belakang Pasti (`letterhead.tsx`):**
  - Menambahkan `[print-color-adjust:exact] [-webkit-print-color-adjust:exact]` pada tag `<footer isPrintFixed>` agar warna pita navy `#2e243e` konsisten dicetak.
- **Kontainer Print Layout (`app/(print)/layout.tsx`):**
  - Menambahkan `print:overflow-visible print:h-auto` pada pembungkus rute cetak.

## File utama

- `app/globals.css`: override `overflow: visible` dan `height: auto` untuk `html, body` pada `@media print`, serta `print-color-adjust: exact` pada `.print-footer-fixed`.
- `components/documents/document-shell.tsx`: penambahan `print:block print:gap-0` pada kontainer luar dokumen.
- `components/documents/letterhead.tsx`: penambahan `print-color-adjust: exact` pada elemen footer tetap.
- `app/(print)/layout.tsx`: penambahan `print:overflow-visible print:h-auto` pada root pembungkus rute print.
- `tests/documents.test.ts`: penambahan pengujian unit untuk memvalidasi reset overflow `@media print`, atribut `print-color-adjust: exact` pada footer, dan `print:block` pada `document-shell`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah khusus.

## Verifikasi

- **Unit Test:** `npx tsx --test tests/*.test.ts` (148/148 pengujian lulus 100%).
- **Typecheck:** `npx tsc --noEmit` bersih tanpa error (0 errors).
- **Production Build:** `npm run build` berhasil membuat artefak produksi Turbopack.
- **E2E Visual (`ego-browser`):**
  - Pengujian visual lewat browser headless dengan CDP `Page.printToPDF` pada Placing Slip membuktikan footer bar navy (`#2e243e`) dengan alamat Springhill Office Tower dan badge OJK/APPARINDO kini tampil di bagian bawah setiap halaman (termasuk dokumen 6 halaman: halaman 1 sampai 6 seluruhnya memiliki kop surat atas dan footer navy bawah).
