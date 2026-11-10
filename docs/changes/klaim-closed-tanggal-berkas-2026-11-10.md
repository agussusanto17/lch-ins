# Status klaim Closed dan tanggal upload berkas sebagai tanggal diterima

- **Tanggal:** 2026-11-10
- **Branch:** `fix/klaim-closed-tanggal-berkas`
- **PR:** [#202](https://github.com/agussusanto17/lch-ins/pull/202)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dua catatan klaim dari meeting LCH, 10 November 2026:

- **Status klaim "Close" menjadi "Closed".** Seed sudah menulis "Closed", tapi upsert seed tidak menimpa nama yang sudah ada. Akibatnya database demo masih memakai nama lama "Close", dan badge serta filter klaim menampilkan nama itu (lihat #169).
- **Berkas dokumen: tanggal upload adalah tanggal dokumen diterima.** Sejak #124, upload file tidak mencentang "diterima", jadi petugas harus mengunggah lalu mencentang terpisah.

## Yang berubah

- **Migrasi `20261110160000_status_klaim_closed`** mengganti nama status klaim kode `closed` dari "Close" menjadi "Closed". Nama yang sudah diganti LCH sendiri di Master Data tidak disentuh.
- **Upload pertama menandai dokumen diterima** dengan tanggal hari ini (WIB). Tanggal dokumen lengkap klaim ikut diperbarui, sama seperti saat dicentang manual.
- **Dokumen yang sudah diterima tetap memakai tanggal diterimanya** saat file diganti atau ditambahkan belakangan, termasuk yang dicentang manual.
- **Centang manual tetap ada**, untuk dokumen yang diterima tanpa file.
- **Tanggal diterima dihitung di WIB.** Sebelumnya centang dan tanggal lengkap memakai tanggal UTC, yang sebelum pukul 07.00 WIB masih tanggal kemarin.
- **Teks petunjuk tab Berkas Dokumen** sekarang menjelaskan bahwa tanggal upload dicatat sebagai tanggal diterima.
- **Toast upload** menyebut "ditandai diterima" kalau upload itu yang menandai dokumen diterima.

## File utama

- `prisma/migrations/20261110160000_status_klaim_closed/migration.sql`
- `lib/server/claims.ts`:
  - `attachClaimDocumentFile` menandai diterima;
  - `syncDocumentCompleteDate` dipakai bersama centang manual dan upload;
  - tanggal memakai WIB.
- `components/claims/claim-detail-sheet.tsx`: tanggal WIB, teks petunjuk, toast upload.

## Dampak

- **Database:** satu migrasi data (ganti nama satu baris lookup). Tidak ada perubahan skema.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build seperti biasa.
- **Data lama:** berkas yang sudah diunggah sebelum perubahan ini dan belum dicentang tidak ikut ditandai diterima. Tanggal uploadnya tidak tercatat di baris dokumen, jadi centang manual saja kalau perlu.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (154 tes), dan `npm run build`: lolos.
- **Migrasi lokal:** status `closed` sekarang bernama "Closed".
- **Uji browser lokal** (Playwright dan Chrome, sesi admin sementara) memakai klaim CLM/2026/07/0028. Tiga dari empat dokumen wajib diset sudah diterima sebelum uji.

  | Uji | Hasil |
  |---|---|
  | Upload dokumen wajib terakhir (Formulir Klaim Bermaterai) | Diterima 10 November 2026. Tanggal dokumen lengkap klaim terisi 10 November 2026. Toast "ditandai diterima". |
  | Upload ke dokumen yang sudah diterima 1 November | Tetap diterima 1 November |
  | Teks petunjuk tab Berkas Dokumen | Tampil |

- Data uji dikembalikan dan berkas uji dihapus.
- Tidak ada error di console browser.

## Catatan untuk yang melanjutkan

- Satu berkas dokumen tetap menyimpan satu file. Catatan #124 soal tabel lampiran terpisah masih berlaku.
- `claims.ts` masih mencari nama "Close" sebagai cadangan saat mencocokkan status Closed. Cadangan itu tidak berbahaya dan bisa dihapus setelah semua database bermigrasi.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
