# Upload deklarasi MOP dari Excel

- **Tanggal:** 2026-11-17
- **Branch:** `feat/upload-deklarasi-excel`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Sejak PR #257 (catatan `deklarasi-mop-2026-11-16.md`), deklarasi MOP dicatat satu per satu lewat Tambah deklarasi di polis MOP.
- Agus, 17 November 2026: deklarasi bisa ratusan, jadi datanya perlu bisa diupload dari Excel dan tetap menjadi deklarasi di bawah polis MOP-nya.

## Yang berubah

- **Upload deklarasi (Excel)** di menu baris polis MOP, di bawah Tambah deklarasi. Drawer-nya menampilkan polis MOP, periode, dan rate slip, lalu:
  - **Template Excel** per polis MOP. Isinya sheet Deklarasi, sheet Rate (kategori dari slip), dan sheet Petunjuk. Kolom Kategori Rate berupa dropdown dari sheet Rate.
  - **Pilih file Excel:** file dicek per baris dan kesalahannya ditampilkan dengan nomor baris Excel. Kalau semua benar, muncul pratinjau berisi jumlah, total nilai, dan total premi.
  - **Simpan:** dikirim per 100 baris dengan progres. Satu kelompok tersimpan dalam satu transaksi. Kalau satu kelompok gagal, kelompok sebelumnya tetap tersimpan dan sisanya bisa disimpan ulang.
- **Kolom template:**
  - wajib: No. Sertifikat / Deklarasi, Tanggal Deklarasi, Nilai Deklarasi;
  - opsional: Kategori Rate, Jumlah Unit, Premium, Keterangan.
- **Perhitungan premi:**
  - Premi = nilai × rate, atau jumlah unit × tarif untuk rate per unit, sama dengan form Tambah deklarasi.
  - Kolom Premium yang diisi dipakai apa adanya.
  - Slip dengan satu rate boleh tanpa kategori.
- **Validasi per baris:**
  - nomor kosong, dobel di file, atau sudah dipakai polis lain;
  - tanggal tidak dikenali atau di luar periode polis MOP;
  - nilai bukan angka atau kurang dari atau sama dengan 0;
  - kategori tidak ada di slip;
  - jumlah unit kosong untuk rate per unit;
  - tanpa kategori dan tanpa premi.
- **Deklarasi yang sudah tercatat** di polis MOP yang sama dilewati, bukan ditolak. File yang sama atau daftar kumulatif bisa diupload ulang tanpa dobel.
- **Batas:** 1.000 baris baru per file, 100 baris per simpan.
- **Isian lain ikut polis MOP** dan diambil di server dari polis MOP, bukan dari browser: tertanggung, asuransi, brokerage, fee, COB, type of cover, mata uang, dan akhir periode. Form Tambah deklarasi dan upload memakai `declarationPreset` yang sama.
- **File sertifikat** tidak ikut di Excel. File diunggah per deklarasi lewat Berkas polis.

## File utama

- `lib/declaration-import.ts`: kolom template, baca dan validasi baris, isi template.
- `components/policies/declaration-upload.tsx`: drawer upload, pratinjau, simpan per kelompok.
- `app/(app)/policies/actions.ts`: `importDeclarationsAction`.
- `lib/server/policies.ts`: `createPolicies`, simpan banyak polis dalam satu transaksi dengan alur yang sama dengan `createPolicy`.
- `lib/open-cover.ts`: `declarationPreset`.
- `components/policies/policy-database.tsx`: menu Upload deklarasi (Excel).
- `lib/slip-participants.ts`: `cellText` dan `cellValue` diekspor untuk dipakai bersama.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 270 tes, 270 lolos. `tests/declaration-import.test.ts` menguji:
  - premi dari rate persen dan per unit, serta kolom Premium;
  - kategori tunggal;
  - kesalahan per baris;
  - deklarasi yang sudah tercatat dilewati;
  - batas baris;
  - template yang diisi lalu dibaca lagi lewat ExcelJS;
  - `declarationPreset`.
- **Browser lokal, polis MOP 023/LCH-PLCMT/CI-MOP/XI/2026:**
  - template terunduh (`template-deklarasi-023-LCH-PLCMT-CI-MOP-XI-2026.xlsx`);
  - file salah menampilkan kesalahan baris 3 (tanggal di luar periode) dan baris 4 (kategori BULK), dan SIT/MOP/023/0001 yang sudah tercatat dilewati;
  - file 300 baris tampil di pratinjau (nilai IDR 165 M, premi IDR 136.370.736), lalu tersimpan dalam 3,6 detik, tiga kelompok dengan progres;
  - cek database: 300 deklarasi tipe declaration di bawah polis MOP, premi sesuai rate (200 jt × 0,075% = 150.000; REEFER 400 jt × 0,0975% = 390.000), override Premium 123.456 terpakai, akhir periode dan brokerage ikut polis MOP, 300 baris audit Create;
  - data uji 300 baris dihapus lagi dari DB lokal.

## Catatan untuk yang melanjutkan

- Agus mengirim contoh `General Marine Report (93).xls`, laporan deklarasi yang nanti diupload. File itu hanya pembungkus Web Page Excel; tabelnya ada di folder `..._files/sheet001.htm` yang tidak ikut. Begitu file berisi datanya ada, petakan kolomnya di `DECLARATION_COLUMNS` (alias judul kolom). Kalau formatnya HTML seperti ini, baca tabel HTML-nya di browser selain .xlsx.
- Waktu simpan di Vercel lebih lambat daripada lokal karena database-nya jauh. Satu kelompok 100 baris menjaga satu request tetap singkat.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
