# Cetak daftar dan lembar detail klaim

- **Tanggal:** 2026-11-05
- **Branch:** `feat/cetak-klaim`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

SIT-066 (hasil analisis SIT Minggu 4) mencatat tombol cetak pada daftar klaim
hanya memanggil `window.print()` dari tampilan layar yang terpaginasi 10 baris,
sehingga daftar klaim tidak dapat dicetak secara utuh. Selain itu, belum ada
lembar cetak dokumen resmi untuk rincian per klaim.

## Yang berubah

- **Cetak daftar klaim (`/claims/print`):**
  - Tombol Print pada toolbar daftar klaim sekarang mengarah ke rute cetak
    khusus, membawa parameter filter yang sedang aktif (status, tahapan, COB,
    dan kata kunci pencarian).
  - Dokumen cetak menampilkan seluruh baris yang sesuai filter tanpa paginasi.
  - Memakai layout kop surat resmi LCH, judul dokumen, ringkasan filter, dan
    baris total nilai dalam IDR (konversi otomatis via `toIdr` untuk mata uang
    campuran).
  - Tombol "Kembali" membawa pengguna kembali ke layar daftar klaim dengan filter
    yang sama.
- **Cetak detail klaim (`/claims/print/[id]`):**
  - Lembar cetak detail per klaim dapat dibuka lewat aksi baris "Cetak detail"
    pada tabel klaim maupun tombol "Cetak" di header sheet detail klaim.
  - Berisi kelompok informasi terstruktur: identitas polis & tertanggung,
    kronologi & informasi kerugian, rincian nilai klaim, status & timeline,
    catatan tambahan, checklist kelengkapan berkas dokumen, serta histori
    tindak lanjut (follow-up).
- **Modul filter klaim (`lib/claim-filter.ts`):**
  - Logika filter diekstrak menjadi modul murni yang dipakai bersama oleh
    layar interaktif (`claims-view.tsx`) dan halaman cetak (`/claims/print`),
    sehingga data yang tampil di layar dan di cetakan selalu konsisten.
- **Hak akses:** kedua rute cetak berada di grup `(print)` dan mewarisi hak
  akses menu `/claims` via middleware `requireAccess`.

## File utama

- `lib/claim-filter.ts`: fungsi murni `filterClaims`, `parseClaimFilters`,
  `claimFilterQuery`, `claimPrintHref`, dan `claimBackHref`.
- `tests/claim-filter.test.ts`: 7 unit test untuk fungsi penyaringan klaim.
- `components/documents/claim-documents.tsx`: komponen `ClaimListDocument`
  dan `ClaimDetailDocument` dengan layout `DocumentShell`.
- `app/(print)/claims/print/page.tsx`: halaman server-side rekap cetak klaim.
- `app/(print)/claims/print/[id]/page.tsx`: halaman server-side cetak detail klaim.
- `components/claims/claims-view.tsx`: tombol Print toolbar dan menu aksi baris.
- `components/claims/claim-detail-sheet.tsx`: tombol Cetak di header sheet.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** setelah merge, sinkronkan fork
  (`gh repo sync vourdev/lch-ins -b main`).

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 21 test lolos (7 test baru `claim-filter`).
- `npx tsc --noEmit` lolos (0 error).
- `npm run build` lolos.
- Uji di browser (ego-browser, server lokal, DB lokal):
  - Klik "Print" di toolbar membawa ke `/claims/print` dengan kop surat LCH,
    seluruh data tampil tanpa paginasi 10 baris, total IDR muncul di tfoot.
  - Filter `status=Settled` dibawa ke URL cetak dan hanya memunculkan data
    klaim berstatus Settled dengan sub-judul ringkasan filter otomatis.
  - Aksi baris "Cetak detail" dan tombol "Cetak" di sheet membuka
    `/claims/print/<id>` dengan data polis, kerugian, nilai, berkas, dan
    follow-up lengkap.
  - Tombol "Kembali" menjaga kondisi filter tetap utuh.

## Catatan untuk yang melanjutkan

- Layout cetak menggunakan `DocumentShell` yang sudah mendukung kop surat
  dan footer navy berulang di setiap halaman A4 saat dicetak fisik/PDF via browser.
- Bila nanti ada penambahan kolom kustom pada master klaim, pastikan
  `ClaimDetailDocument` ikut menampilkan kolom tersebut.
