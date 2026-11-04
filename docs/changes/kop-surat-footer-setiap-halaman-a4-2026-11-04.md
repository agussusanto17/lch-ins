# Kop Surat dan Footer Bar Tampil di Setiap Halaman Dokumen Cetak A4

- **Tanggal:** 2026-11-04
- **Branch:** `feat/kop-surat-footer-setiap-halaman-a4`
- **PR:** #109
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

LCH meminta agar kop surat header (logo resmi PT. LCH Insurance Brokers beserta SKOJK) dan footer bar navy (`#2e243e` berisi alamat kantor lengkap serta badge resmi OJK dan APPARINDO) tampil seragam di **setiap halaman** cetak dokumen (PDF ukuran A4), bukan hanya di halaman pertama atau halaman terakhir saja.

## Yang berubah

- **Arsitektur Cetak Multi-Halaman Bersih (Hybrid Table Spacers + Fixed Bleed):**
  - `@page` diatur ke `size: A4; margin: 0;` untuk memungkinkan footer bar navy merentang penuh (*bleed*) 210mm di tepi bawah kertas tanpa terpotong margin bawaan browser.
  - Header logo (`.print-header-fixed`) diposisikan `position: fixed; top: 10mm; left: 12mm; right: 12mm;` agar otomatis berulang di bagian atas setiap halaman dokumen A4.
  - Footer bar navy (`.print-footer-fixed`) diposisikan `position: fixed; bottom: 0; left: 0; right: 0;` agar otomatis berulang menempel di tepi bawah setiap halaman dokumen A4.
  - Kontainer dokumen (`DocumentShell`) membungkus isi dengan tabel cetak (`table.print-page-table`) yang menyediakan spacer `thead` (`32mm`) dan `tfoot` (`22mm`) di setiap halaman secara otomatis. Ini menjamin konten dokumen di halaman mana pun tidak pernah bertabrakan atau menimpa header dan footer.
- **Penyembunyian Elemen Duplikat Saat Cetak:**
  - Komponen inline `<Letterhead />` dan inline `<DocumentFooter />` ditandai `print:hidden` sehingga tetap tampil natural saat dokumen dibuka di layar browser, namun tidak menduplikasi logo di halaman 1 atau footer di halaman terakhir saat dicetak/diekspor ke PDF.
  - Komponen `<DocumentFooter isPrintFixed />` dan `<PrintedAt isPrintFixed />` menyediakan varian khusus untuk rendering cetak fixed.

## File utama

- `components/documents/document-shell.tsx`: pembungkus seluruh dokumen cetak dengan tabel spacer `thead`/`tfoot` serta elemen header/footer fixed berulang.
- `components/documents/letterhead.tsx`: implementasi `print:hidden` pada `<Letterhead />` dan penambahan mode `isPrintFixed` pada `<DocumentFooter />`.
- `components/documents/printed-at.tsx`: dukungan parameter `isPrintFixed` untuk menyalurkan timestamp cetak ke footer berulang.
- `components/documents/sppa-documents.tsx`: penyesuaian header KYC dan `KycFooter` dengan `print:hidden` agar tidak menduplikasi header/footer cetak.
- `app/globals.css`: definisi aturan cetak `@media print` (`@page`, `.print-header-fixed`, `.print-footer-fixed`, spacer `thead`/`tfoot`).

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** standar.

## Verifikasi

- `npx tsc --noEmit` lolos tanpa error.
- `npm run build` lolos (Turbopack production build).
- Verifikasi E2E visual via `ego-browser` (CDP `Page.printToPDF`) & render multi-halaman Swift PDFKit:
  - Placing Slip (`/underwriting/slip/27a7fc6c-0536-44a7-8f57-25b4da6de66e` - 6 halaman): logo LCH dan footer bar navy ter-render konsisten di halaman 1 s.d. 6 tanpa duplikasi di halaman 1 maupun tabrakan konten.
  - Quotation Slip (`/underwriting/quotation/27a7fc6c-0536-44a7-8f57-25b4da6de66e` - 5 halaman): logo LCH dan footer bar navy ter-render rapi dan konsisten di seluruh 5 halaman.

## Catatan untuk yang melanjutkan

- Layout cetak dokumen dikendalikan secara terpusat di `DocumentShell`. Dokumen cetak baru cukup dibungkus dengan `<DocumentShell>` untuk secara otomatis mendapatkan kop surat header dan footer bar navy di setiap halaman A4.
