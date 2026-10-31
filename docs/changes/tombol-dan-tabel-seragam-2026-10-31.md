# Tombol setinggi input dan tabel Master Data bergaya Manajemen Pengguna

- **Tanggal:** 2026-10-31
- **Branch:** `fix/tombol-dan-tabel-seragam` (ditumpuk di atas `fix/pisah-menu-wording`)
- **PR:** [#66](https://github.com/agussusanto17/lch-ins/pull/66)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus meninjau Master Data pada 31 Oktober 2026:

- Teks tombol terlalu kecil. Tombol di Master Data memakai `text-xs` (12px).
- Tombol Batal dan Simpan di dialog Klasifikasi OJK menempel. Footer dialognya
  memakai `sm:gap-0`.
- Aturan dari Agus: tinggi dan ukuran huruf tombol sama dengan input teks di
  form, yaitu 36px dan 14px. Tombol ukuran `sm` hanya 32px.
- Bagian atas tabel Master Data tidak seragam: ada toolbar di dalam card, ada
  yang tanpa card, dan ada card tabel dengan ruang kosong di atas judul kolom.
  Agus memilih gaya halaman Manajemen Pengguna.

## Yang berubah

- **Tombol `sm` setinggi input (36px).** Perubahan di `Button` sehingga semua
  tombol ukuran `sm` ikut, termasuk yang dibuat nanti. Ukuran huruf tetap 14px.
- **Select `sm` setinggi input (36px),** jadi filter di toolbar sejajar dengan
  kolom pencarian dan tombol, misalnya di Manajemen Pengguna, Database Klien,
  dan Audit Trail. Select ukuran halaman di pagination tetap 32px supaya sama
  dengan tombol navigasinya.
- **Penimpa ukuran dibuang** dari tombol di Master Data, Audit Trail, dan popover
  notifikasi (`text-xs`, `h-8.5`, `h-9`). Tombol ringkas di dalam baris tabel
  tetap 28px, tapi hurufnya 14px.
- **Dialog Master Data seukuran form standar:**
  - input, select, label, dan deskripsi dialog 14px;
  - input dan select 36px, select dialog selebar kolom;
  - judul baris switch 14px.
- **Jarak tombol di footer dialog Klasifikasi OJK** kembali 8px seperti dialog
  lain.
- **Contoh gaya Manajemen Pengguna** di dua halaman, Klasifikasi OJK (masih
  kosong) dan Wording Form (ada isinya):
  - toolbar tanpa card, pencarian di kiri dan tombol tambah di kanan;
  - kolom Aksi (menu titik tiga) di kolom pertama. Edit dan aktif/nonaktif
    pindah ke menu ini dari switch dan ikon pensil di ujung kanan;
  - pagination di bawah tabel;
  - deskripsi singkat di bawah judul halaman.

Asumsi:
- Tombol di dalam baris tabel tetap ringkas supaya baris tidak membengkak.
- Tombol ikon dan komponen `Tabs` tidak diubah.
- Enam halaman Master Data lain menunggu persetujuan Agus atas contoh ini.

## File utama

- `components/ui/button.tsx`, `components/ui/select.tsx`: tinggi ukuran `sm`.
- `components/shared/table-pagination.tsx`: select ukuran halaman tetap 32px.
- `components/master-data/*.tsx`: penimpa ukuran dibuang; Klasifikasi OJK dan
  Wording Form bergaya Manajemen Pengguna.
- `app/(app)/master-data/ojk-classes/page.tsx`,
  `app/(app)/master-data/wording-forms/page.tsx`: deskripsi halaman.
- `components/audit/audit-table.tsx`,
  `components/layout/notification-popover.tsx`: ukuran huruf tombol.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- `npx eslint` pada file yang diubah lolos, kecuali error lama
  `react-hooks/set-state-in-effect` di `notification-popover.tsx` baris 50.
  Error itu sudah ada di `main` dan tidak disentuh di sini.
- Ukuran terukur di localhost:
  - Dialog Tambah Klasifikasi OJK: input dan dua tombol 36px, huruf 14px,
    jarak antar tombol 8px.
  - Wording Form: pencarian dan tombol tambah 36px; select ukuran halaman dan
    tombol navigasi pagination 32px.
  - Manajemen Pengguna: pencarian, filter Peran, filter Status, dan tombol
    Tambah Pengguna 36px.

## Catatan untuk yang melanjutkan

- Enam halaman Master Data lain belum memakai gaya Manajemen Pengguna: COB &
  Cover Type, Tarif Baku OJK, Asuransi & Adjuster, Rekening & Mata Uang,
  Kendaraan, dan Nilai Pilihan Dropdown.
- PR ini ditumpuk di atas #65, yang ditumpuk di atas #64. Merge berurutan
  #64, #65, lalu PR ini, dan pindahkan base ke `main` sebelum merge.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
