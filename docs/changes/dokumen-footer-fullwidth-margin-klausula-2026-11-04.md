# Penyesuaian Footer Lebar Penuh, Margin Konten Dokumen, dan Font Klausula

- **Tanggal:** 2026-11-04
- **Branch:** `fix/document-fullwidth-footer-margins-clause-font`
- **PR:** #114
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Berdasarkan tinjauan dokumen cetak dan tampilan layar oleh LCH:
1. Footer navy (`#2e243e`) pada dokumen harus tampil selebar penuh halaman (*full width* dari tepi kiri hingga tepi kanan tanpa celah putih), baik saat dicetak/disimpan ke PDF maupun di layar.
2. Posisi logo header dan tabel konten dokumen sebelumnya dinilai terlalu mepet ke tepi kertas (margin 12mm), sehingga perlu digeser masuk ke dalam sedikit agar lebih rapi dan lega (disesuaikan menjadi 18mm).
3. Pada ringkasan daftar klausula (`CLAUSES`), judul klausula tidak boleh ditebalkan (*normal font weight*), sedangkan pada lampiran wording lengkap (`CLAUSE WORDING`), judul klausula tetap dicetak tebal (*font-semibold*).

## Yang berubah

- **Footer Penuh (Full-Width Bleed):**
  - Memindahkan deklarasi `@page { size: A4; margin: 0; }` ke tingkat root pada `app/globals.css` agar peramban Chromium tidak memaksakan margin bawaan (0,4 inci / 10mm).
  - Menetapkan `.print-footer-fixed` dengan `position: fixed; bottom: 0; left: 0; right: 0; width: 100%;` untuk menjamin pita footer membentang 100% tepi-ke-tepi di setiap halaman cetak.
  - Menambahkan override `print:m-0 print:p-0 print:max-w-none print:w-full` pada pembungkus luar `DocumentShell` agar tidak membatasi elemen cetak tetap di dalamnya.
  - Menyesuaikan tampilan footer di layar (`DocumentFooter` dan `KycFooter`) menggunakan kelas *negative margin breakout* (`-mx-8 md:-mx-12 -mb-8 md:-mb-12 rounded-b-2xl rounded-t-none`) dan `overflow-hidden` pada kartu dokumen, sehingga footer menempel rapi dan rata ke tepi bawah kartu dokumen di browser.
- **Margin Header dan Konten Dokumen (18mm):**
  - Mengubah margin kiri-kanan header cetak `.print-header-fixed` dari `12mm` menjadi `18mm`.
  - Mengubah padding horizontal sel konten dokumen pada tabel layout `DocumentShell` dari `print:px-[12mm]` menjadi `print:px-[18mm]`.
  - Mengubah padding konten dalam footer cetak dari `px-[12mm]` menjadi `px-[18mm]` sehingga teks alamat dan logo OJK/APPARINDO sejajar secara presisi dengan garis margin konten dan logo di header.
- **Bobot Font Klausula:**
  - Pada `ClausesBlock` (`components/documents/doc-blocks.tsx`), mengubah judul klausula dan form wording agar tidak diberi `font-semibold` bila `inline` bernilai `false` (tampilan ringkasan daftar klausula).
  - Pada `ClauseWordingAppendix`, judul klausula tetap menggunakan `font-semibold`.
- **Pengujian:**
  - Menambahkan test di `tests/documents.test.ts` untuk memverifikasi top-level `@page`, sinkronisasi margin 18mm, full-bleed footer, dan pembatasan font-weight klausula.

## File utama

- `app/globals.css`: pemindahan `@page` ke root level, pembaruan margin `.print-header-fixed` ke 18mm, dan penegasan lebar 100% pada `.print-footer-fixed`.
- `components/documents/document-shell.tsx`: penambahan reset margin print pada kontainer luar, pergeseran konten ke `print:px-[18mm]`, dan `overflow-hidden` pada kartu dokumen.
- `components/documents/letterhead.tsx`: padding `px-[18mm]` untuk footer cetak dan breakout penuh di footer layar.
- `components/documents/doc-blocks.tsx`: peniadaan bold pada item daftar klausula ringkasan.
- `components/documents/sppa-documents.tsx`: penyesuaian breakout pada `KycFooter`.
- `app/(print)/layout.tsx`: penambahan `print:bg-white print:min-h-0` pada print layout.
- `tests/documents.test.ts`: test otomatis untuk aturan CSS print, dokumen shell, dan font weight klausula.

## Dampak

- **Database:** tidak ada perubahan schema atau data.
- **Env:** tidak ada.
- **Deploy:** standar.

## Verifikasi

- `npx tsx --test tests/access.test.ts tests/documents.test.ts` lolos (7 test).
- `npx tsc --noEmit` lolos tanpa error.
- `npm run build` berhasil selesai.
- Uji visual via `ego-browser` pada slip `005/LCH-PLCMT/PS-IAR/VIII/2026`:
  - `CLAUSES` list: `font-weight: 400` (normal).
  - `CLAUSE WORDING`: `font-weight: 600` (bold).
  - Footer layar: lebar 850px sejajar penuh dengan kartu 852px (margin difference < 2px).
  - PDF cetak: footer menempel di sudut bawah kertas A4 tanpa celah margin putih samping.

## Catatan untuk yang melanjutkan

- Format cetak A4 mengandalkan sinkronisasi antara `.print-header-fixed` (`left/right: 18mm`), sel isi `DocumentShell` (`print:px-[18mm]`), dan padding footer `px-[18mm]`. Bila kelak ada kebutuhan mengubah lebar margin kertas, ketiga angka ini perlu diubah bersamaan agar sejajar.
