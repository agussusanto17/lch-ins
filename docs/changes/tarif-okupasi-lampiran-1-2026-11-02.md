# Tarif okupasi OJK lengkap sesuai Lampiran I

- **Tanggal:** 2026-11-02
- **Branch:** `fix/tarif-okupasi-lampiran-1`
- **PR:** [#68](https://github.com/agussusanto17/lch-ins/pull/68)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry (LCH) melaporkan tarif okupasi belum lengkap dibanding Lampiran I SE OJK
6/SEOJK.05/2017. Contohnya kode 29371 tidak ada, juga private warehouse dan
public warehouse. Pengecekan terhadap PDF Lampiran I (Tabel I.A) menemukan dua
penyebab.

1. **Halaman Master Data > Tarif Baku OJK hanya memuat 300 dari 369 okupasi**,
   urut kode. Sebanyak 69 kode mulai 2937 sampai 318 tidak pernah tampil, dan
   pencarian hanya menyaring yang sudah dimuat. 29378 Public Warehouses
   sebenarnya ada di database tapi tidak terlihat.
2. **Data lama hasil ekstraksi PDF per baris teks.** Kode dan tarif di PDF
   berada di tengah sel, sedangkan keterangannya bisa beberapa baris, sehingga
   keterangan bercampur dengan baris tetangga dan beberapa kode hilang:
   - 8 kode bertarif tidak ada: 200, 201, 203, 2058, 230011, 230012, 29371,
     300. Grade B dari 29313 juga hilang karena barisnya tanpa kode. 2935 tidak
     ada di daftar pilihan form.
   - 5 kode memakai tarif kode lain: 2937 (tarif 29371), 205 (tarif 2058), 23001
     (tarif 230011), 29313 (tarif Grade A), 2992 (tarif 300 Kina). 2937, 205,
     23001, dan 29313 di PDF adalah judul tanpa tarif; 2992 Rents tarifnya
     mengikuti okupasi.
   - 2 tarif tidak lengkap: batas atas Kelas I kode 219 dan batas bawah Kelas I
     kode 2935.
   - Sekitar separuh keterangan tercampur, misalnya 2936 tertulis "Others
     Private and public warehouse".
   - Tarif 362 kode lainnya sudah benar.

## Yang berubah

- **Data okupasi diekstrak ulang per sel tabel**, memakai garis tabel PDF
  (pdfplumber), dari `SAL - Lampiran I - Property Amandemen.pdf`. Hasilnya 376
  okupasi:
  - 374 okupasi bertarif;
  - 2992 Rents dan 40 (bangunan di lokasi perkebunan perorangan) tanpa tarif
    sendiri; catatan dari kolom tarif PDF ditulis di akhir namanya;
  - 85 baris judul tanpa tarif tidak dimasukkan, termasuk 237 yang sel tarifnya
    kosong.
- **Keterangan sama dengan kolom Keterangan di PDF.** Keterangan panjang tetap
  utuh, misalnya 29371 berisi syarat private warehouse nomor 1 sampai 3.
- **29313 Shopping mall/center dipecah menjadi 29313A (Grade A) dan 29313B
  (Grade B)**, karena PDF memberi tarif terpisah tanpa kode sendiri.
- **219 batas atas Kelas I = 3,9054‰**, sesuai tulisan PDF. Kemungkinan salah
  ketik untuk 3,905 (batas bawah 3,124 dikali 1,25); selisihnya 0,0004‰.
- **Master Data > Tarif Baku OJK memuat semua okupasi**, tidak lagi dibatasi
  300.
- **SPPA mengenali kode okupasi berhuruf** (29313A, 29313B). Placing slip dan
  rate engine sudah mengenalinya.
- **Migration memperbaiki database yang sudah berjalan:**
  - 2937, 205, 23001, dan 29313 diganti kodenya menjadi 29371, 2058, 230011, dan
    29313A. Tarifnya memang milik kode tujuan, dan SPPA atau slip yang sudah
    memakainya ikut pindah karena relasinya lewat id.
  - Nama dan tarif semua okupasi disamakan dengan Lampiran I; kode yang belum
    ada ditambah.
  - Okupasi di luar Lampiran I dinonaktifkan, tidak dihapus.
  - Tarif di luar Lampiran I dihapus (tarif Kina yang menempel di 2992).

## File utama

- `prisma/seed-data/tarif-ojk-okupasi.csv`: data okupasi untuk seed.
- `lib/data/ojk-tariff.ts`: `OCCUPATION_TARIFFS` untuk pilihan okupasi di
  form, panel tarif, dan rate engine. Isinya sama dengan CSV.
- `prisma/migrations/20261102150000_occupation_tariff_lampiran_1/migration.sql`:
  perbaikan data `occupations` dan `tariff_occupation`.
- `lib/server/master-data.ts`, `app/(app)/master-data/tariff-ojk/page.tsx`:
  batas 300 dihapus.
- `lib/server/sppa.ts`: pembacaan kode okupasi berhuruf.

## Dampak

- **Database:** migration baru, jalan otomatis saat build. Tidak ada perubahan
  schema. Seed CSV ikut diperbarui.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Hasil ekstraksi dicek silang dengan `pdftotext -layout`: semua kode 3 sampai
  6 digit cocok. Angka tarif cocok, kecuali baris yang tarifnya tercetak satu
  baris di bawah kode; baris itu dicek manual ke PDF.
- Migration di database lokal: 376 okupasi dan 1.048 baris tarif, nama dan
  tarifnya sama persis dengan hasil ekstraksi. 1 SPPA dan 1 slip yang memakai
  2937 pindah ke 29371; 2 slip yang memakai 29313 pindah ke 29313A.
- Cek sisi server dengan fungsi yang dipakai halaman:
  - `listOccupations()` mengembalikan 376 okupasi;
  - pencarian "warehouse" menemukan 29371, 29378, dan 29394;
  - `getOccupationBounds` 29371 Kelas II = 1,691 sampai 1,890‰, 29313B Kelas I
    = 2,234 sampai 2,792‰;
  - `OCCUPATION_TARIFFS` berisi kode yang sama dengan database.
- `npx tsc --noEmit`, `npm run build`, dan `npx eslint` pada file kode yang
  diubah: lolos.
- Halaman master data belum dicek di browser karena browser pane belum login.

## Catatan untuk yang melanjutkan

- Lampiran I juga berisi Tabel I.B (skala tarif polis loss limit) dan Tabel I.D
  (kode okupasi dengan risiko sendiri minimum / time excess). Keduanya belum
  ada di aplikasi. Tabel I.C (skala BI) sudah ada di `BI_SCALE_OJK`.
- Keterangan generik seperti "Others" dan "Mixed" mengikuti PDF; artinya
  bergantung pada kode induknya. Kalau LCH ingin judul induk ikut tampil,
  tambahkan saat membangkitkan data, bukan dengan mengedit nama satu per satu.
- Salinan `tarif-ojk-okupasi.csv` di folder `documents/` di luar repo masih
  versi lama.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
