# Isi lampiran slip tercetak di dokumen

- **Tanggal:** 2026-11-09
- **Branch:** `feat/cetak-isi-lampiran-slip`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Lampiran slip (#167) berupa vessel schedule, daftar unit alat berat, atau
  klausul hasil scan. Selama ini hanya namanya yang tercetak di daftar
  ATTACHMENTS, sedangkan isinya dikirim terpisah bersama PDF slip.
- Pertanyaan nomor 3 ke Harry: cukup dikirim terpisah, atau harus ikut
  tercetak? Jawaban Harry (9 November 2026): bisa dibuat lampiran dan bisa
  tercetak di slip.

## Yang berubah

- **Centang Cetak isi** per lampiran di bagian Lampiran form slip.
  - Bawaannya tercentang, termasuk untuk lampiran yang sudah ada.
  - Dilepas berarti hanya namanya yang tercetak di daftar ATTACHMENTS.
  - Mengikuti aturan ubah lampiran: terkunci untuk slip Closed dan Cancelled,
    dan tercatat di Audit Trail.
- **Halaman akhir dokumen** Placing Slip, Quotation Slip, Closing Instruction,
  dan Cover Note mencetak isi lampiran yang dicentang. Tiap lampiran mulai di
  halaman baru dengan judul `ATTACHMENT n: <keterangan>`, bernomor sama dengan
  daftar ATTACHMENTS.
  - **Gambar** (JPG, PNG, WebP): satu halaman, diperkecil sampai muat.
  - **PDF:** tiap halaman PDF menjadi satu halaman cetak, maksimal 30 halaman.
    Halaman kedua dan seterusnya diberi keterangan
    `Attachment n · page x of y`.
  - **Excel:** tiap sheet yang terlihat dicetak sebagai tabel.
    - Ikut dibawa: sel gabungan, huruf tebal, dan format angka sel, misalnya
      `USD 8.000.000,00`, `8.500`, atau `0,45%`.
    - Angka berformat General dicetak apa adanya, jadi tahun pembuatan tetap
      2010.
    - Maksimal 500 baris dan 30 kolom per sheet, dengan catatan bila
      dipotong.
    - Sheet tersembunyi dan sheet kosong dilewati.
  - Isi yang gagal dibaca tercetak "See the attached file.", dan alasannya
    hanya tampil di layar.
- **Jenis lampiran** dibaca dari isi berkas yang diperiksa server saat unggah,
  bukan dari nama file.
- **Tombol Print / Save PDF** menunggu gambar dan halaman PDF selesai dimuat.
  Selama menunggu, tombolnya bertuliskan "Menyiapkan lampiran…".

## Cara kerja

- **Excel** diurai di server (exceljs) saat halaman dokumen dibuka, lalu
  dikirim ke halaman sebagai tabel.
- **Gambar** dibuka langsung dari `/api/files/<id>`, dengan pemeriksaan login
  dan hak akses yang sama seperti sebelumnya.
- **PDF** dirender di browser dengan pdf.js menjadi gambar per halaman. Isi
  PDF di iframe tidak ikut tercetak, jadi cara ini yang dipakai.
  - Worker pdf.js dimuat lewat `new Worker(new URL(...))`, yang didukung
    Turbopack.
  - Rendernya tanpa eval dan tanpa XFA.
- **Dependensi baru:** `pdfjs-dist` 5.5.207, dipasang dengan versi tepat.
  - Versi 5.6.x terkena advisory GHSA-hq66-cqwq-w95j (PDF berbahaya bisa
    menjalankan JavaScript, rentang >=5.6.83 <6.2.108).
  - Seri 6.x meminta Node 22, sedangkan mesin lokal Node 20.

## File utama

- `components/documents/attachment-contents.tsx`: tampilan isi lampiran dan
  render PDF.
- `lib/excel-table.ts`: workbook menjadi tabel, termasuk format angka.
- `lib/server/slip-attachment-print.ts`: isi lampiran yang dicetak per slip.
- `lib/attachment-print.ts`: tipe bersama dan jenis cetak dari jenis berkas.
- `lib/print-tasks.ts` dan `components/documents/document-shell.tsx`: tombol
  cetak menunggu isi lampiran.
- `components/underwriting/slip-attachments.tsx`, `lib/server/slip-files.ts`,
  dan `setSlipAttachmentPrintAction`: centang Cetak isi.
- Empat halaman di `app/(print)/underwriting/*/[id]/page.tsx`.

## Dampak

- **Database:** kolom baru `slip_files.print_content`, boolean, bawaan
  `true`. Migrasi `20261109170000_cetak_isi_lampiran_slip`.
- **Dokumen dengan lampiran yang sudah ada:** isinya mulai tercetak di halaman
  akhir. Lepas centangnya kalau tidak perlu.
- **Env:** tidak ada.
- **Deploy:**
  - Migrasi berjalan otomatis saat build.
  - `npm install` memasang `pdfjs-dist`, di Vercel dan VPS.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 122 lolos, termasuk 4 test baru di
  `tests/attachment-print.test.ts`:
  - jenis cetak;
  - format angka;
  - vessel schedule dengan sel gabungan, header tebal, tanggal, dan rumus;
  - pemotongan 500 baris.
- `npm audit`: tidak ada advisory untuk `pdfjs-dist` 5.5.207.
- **Uji browser lokal** (Playwright, dev server, sesi login sementara), dengan
  berkas uji sintetis: Excel vessel schedule, PDF 3 halaman, dan PNG.
  - Ketiga lampiran tercentang Cetak isi saat diunggah.
  - Centang PNG dilepas: tersimpan di database dan tetap lepas setelah reload.
  - **Placing Slip:**
    - ATTACHMENT 1 berisi tabel Excel dengan `USD 8.000.000,00`, total
      `USD 11.650.000,50`, dan tahun 2010;
    - ATTACHMENT 2 berisi 3 halaman PDF;
    - isi PNG tidak tercetak, tetapi namanya tetap ada di daftar ATTACHMENTS.
  - **Closing Instruction** setelah PNG dicentang lagi: ATTACHMENT 3 berisi
    gambarnya.
  - Tanpa error halaman maupun console.
  - **PDF hasil cetak Chrome:** 6 halaman. Lampiran mulai di halaman 3, tiap
    halaman PDF di halaman sendiri, di antara kop dan footer.
- **Build produksi** (`next start`):
  - worker pdf.js disajikan sebagai `application/javascript`;
  - 3 dari 3 halaman PDF dirender di Quotation Slip, tanpa error.
- Draft uji, berkas uji, dan sesi sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- PDF lebih dari 30 halaman hanya dicetak 30 halaman pertama. Excel di atas
  500 baris atau 30 kolom dipotong. Keduanya diberi catatan di dokumen.
- Tabel Excel lebar (banyak kolom) dicetak di A4 portrait dengan huruf 10px.
  Kalau terlalu rapat, pertimbangkan sheet yang lebih ringkas.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
