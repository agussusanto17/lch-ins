# Tes margin cetak mengikuti --print-x

- **Tanggal:** 2026-11-15
- **Branch:** `fix/tes-margin-cetak`
- **PR:** [#255](https://github.com/agussusanto17/lch-ins/pull/255)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Sejak PR #236 (12 November 2026), dokumen slip memakai margin kiri-kanan cetak 10 mm lewat variabel CSS `--print-x` di kelas `.doc-slip`; dokumen lain tetap 18 mm sebagai nilai default. Isi, kop berulang, dan footer cetak membaca variabel yang sama supaya tetap sejajar.
- Tiga tes di `tests/documents.test.ts` masih mencari angka 18 mm yang ditulis langsung (`left: 18mm`, `print:px-[18mm]`, `px-[18mm]`), jadi gagal sejak #236 walaupun cetakannya benar. Dari 257 automated test, 254 lolos.
- Sebelum demo Bagian A, semua automated test harus lolos.

## Yang berubah

- Tes `globals.css` mengecek `.print-header-fixed` memakai `var(--print-x, 18mm)` di kiri dan kanan, dan `.doc-slip` mengisi `--print-x: 10mm`.
- Tes `document-shell` mengecek sel isi cetak memakai `print:px-[var(--print-x,18mm)]` dan dokumen slip mendapat kelas `doc-slip`.
- Tes `letterhead` mengecek footer cetak memakai `px-[var(--print-x,18mm)]`.
- Tidak ada perubahan kode aplikasi; margin cetak tetap seperti hasil #236.

## File utama

- `tests/documents.test.ts`: tiga tes margin cetak disesuaikan dengan `--print-x`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada efek ke aplikasi; hanya tes.

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 257 tes, 257 lolos (sebelumnya 254 lolos, 3 gagal di tes margin cetak).
- `npx tsc --noEmit` dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- Kalau margin cetak diubah lagi, ubah nilai `--print-x` di `.doc-slip` (atau nilai default 18 mm di `var(--print-x, 18mm)`), lalu sesuaikan tes ini.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
