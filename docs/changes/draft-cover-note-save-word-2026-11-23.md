# Simpan Draft Cover Note ke format Word (.docx)

- **Tanggal:** 2026-11-23
- **Branch:** `feat/draft-cover-note-save-word`
- **PR:** #313 (https://github.com/agussusanto17/lch-ins/pull/313)
- **Dikerjakan oleh:** Zero dengan Antigravity

## Latar belakang

- Pengguna membutuhkan opsi untuk menyimpan/mengunduh dokumen Draft Cover Note (`/placement/cover-note/[id]`) langsung ke format Microsoft Word (.docx).
- Selama ini halaman cetak slip hanya menyediakan tombol `Print / Save PDF`. Dengan format Word (.docx), broker dan pengguna dapat meninjau, mengedit teks, atau melampirkan berkas secara fleksibel sesuai alur kerja operasional kantor sebelum penerbitan resmi.

## Yang berubah

- Menambahkan pustaka standar `docx` untuk merender berkas OpenXML (`.docx`) murni yang kompatibel dengan Microsoft Word dan Google Docs tanpa peringatan berkas rusak atau peringatan ekstensi tidak cocok.
- Membuat modul `lib/cover-note-docx.ts` untuk mengonversi data placing slip cover note menjadi dokumen Word yang rapi dan terstruktur:
  - Font Arial dengan margin halaman 10 mm (konsisten dengan CSS cetak `.doc-slip`).
  - Judul `COVER NOTE` tebal di bagian atas (tanpa kop surat broker dan nomor, sesuai contoh Draft Cover Note PR #159).
  - Tabel 3 kolom borderless untuk detail slip (Type of Cover, Wording Form, Insured Name, Address, Period, Occupation, Risk Location, Class, dll.) dengan titik dua sejajar.
  - Penanganan khusus untuk multi kendaraan (Object of Insured dengan sub-tabel terstruktur dan titik dua sejajar).
  - Blok section lengkap: COVERAGE, INTEREST INSURED, DEDUCTIBLE & CONDITIONS, CLAUSES, EXCLUSIONS, PREMIUM CALCULATION, SUBJECTIVITY, SECURITY, REMARKS, dan SIGNED.
  - Penomoran halaman otomatis ("Halaman X dari Y") pada footer.
- Memperluas `DocumentShell` dengan prop `actions?: React.ReactNode` untuk mengakomodasi tombol aksi tambahan di toolbar dokumen.
- Memasang tombol `Save Word` (dengan ikon `FileDown` dan status loading) di toolbar `CoverNoteDocument` (`components/documents/slip-documents.tsx`). Modul docx dimuat secara dinamis saat tombol diklik sehingga tidak membebani ukuran bundle awal halaman.
- Menambahkan pengujian otomatis unit test di `tests/cover-note-docx.test.ts`.

## File utama

- `lib/cover-note-docx.ts`: generator OpenXML `.docx` untuk Draft Cover Note dan fungsi trigger download browser.
- `components/documents/document-shell.tsx`: penambahan prop `actions` pada toolbar dokumen.
- `components/documents/slip-documents.tsx`: integrasi tombol `Save Word` pada `CoverNoteDocument`.
- `components/documents/doc-blocks.tsx`: ekspor interface dan fungsi `clauseGroups` agar konsisten dengan tampilan cetak.
- `tests/cover-note-docx.test.ts`: pengujian validasi pembuatan dokumen dan buffer OpenXML PK header.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` lolos (0 error).
- `npx eslint components/documents/document-shell.tsx components/documents/slip-documents.tsx components/documents/doc-blocks.tsx lib/cover-note-docx.ts` lolos (0 error, 0 warning).
- `npx tsx --test tests/*.test.ts`: 427/427 lolos.
- `npm run build` lolos.
- Pengujian E2E headless browser: tombol `Save Word` muncul di toolbar dokumen, klik memicu event unduhan, dan berkas `.docx` tersimpan dengan ukuran valid (>14 KB).
- Contoh berkas hasil unduhan untuk PT Margamas Indah Development dan PT Graha Sentosa Properti telah dibuat dan terverifikasi.

## Catatan untuk yang melanjutkan

- Tidak ada.
