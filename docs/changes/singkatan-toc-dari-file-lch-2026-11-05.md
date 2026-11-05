# Singkatan type of cover dari file LCH

- **Tanggal:** 2026-11-05
- **Branch:** `fix/singkatan-toc-dari-file-lch`
- **PR:** [#123](https://github.com/agussusanto17/lch-ins/pull/123)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Singkatan type of cover menentukan kode cover di nomor slip, misalnya
`PS-MOP`, dan di nomor klaim. Di aplikasi baru 16 dari 47 type of cover yang
punya singkatan, dan sebagian diambil dari kode lama di `TYPE_OF_COVER`. File
LCH "LIST COB DAN TOC" (diperbarui LCH 21 Oktober 2026) sudah mengisi kolom
SINGKATAN TOC untuk 39 type of cover. Agus minta singkatan diisi dari file itu
(5 November 2026).

## Yang berubah

- **Migrasi `20261105230000_singkatan_toc_file_lch`** menyamakan 37 type of
  cover dengan file LCH:
  - 23 yang sebelumnya kosong diisi: TS, MV (PSKBI dan Motor Cycle), HE, CIT,
    HBR, HMHSV, SRLL, MII, MAPP, CPM, CECR, EL, WCI, CGL, AL, EOI, TOL, FG, CIS,
    TRAVEL, HIO, dan MAR.
  - 3 yang berbeda diganti mengikuti file LCH: Marine Cargo Open Cover MC
    menjadi MOP, Marine Hull MH menjadi HMH, Product Liability PRL menjadi PLI.
  - Yang sudah sama (BI, PAR, IAR, MC, CAR, EAR, MB, EEI, PL, PI, PA) tidak
    disentuh.
- **Pengecualian:**
  - PSAGBI (0105) tetap EQ, bukan EQVET seperti di file LCH, supaya slip PAR +
    Earthquake bernomor PS-PAREQ ([#122](https://github.com/agussusanto17/lch-ins/pull/122)).
  - Directors and Officer Liability (0913) tetap DNO. File LCH menulis D&O,
    tapi singkatan di Master Data hanya boleh huruf dan angka.
  - Tujuh type of cover yang singkatannya kosong di file LCH tidak diubah:
    Pasar Consortium, PSAKI, Buy Back Deductible, Comprehensive All Risk,
    Burglary, Neon Sign, dan Health Insurance. Marine Cargo Stock Throughput
    juga kosong di file LCH dan tetap MC.
- **Seed:** `COVER_ABBREVIATIONS` disamakan, sehingga database baru langsung
  memakai singkatan yang sama.
- **Lewat migrasi**, supaya database Vercel dan VPS sama-sama berubah.

## File utama

- `prisma/migrations/20261105230000_singkatan_toc_file_lch/migration.sql`.
- `prisma/seed.ts`: `COVER_ABBREVIATIONS`.

## Dampak

- **Database:** migrasi data, jalan otomatis saat build di Vercel dan VPS.
  Hanya mengubah `abbreviation` dan `updated_at` type of cover yang nilainya
  berbeda dari file LCH. Perubahan dari migrasi tidak tercatat di Audit Trail.
- **Nomor dokumen:** slip yang di-release dan klaim yang dibuat setelah ini
  memakai singkatan baru, misalnya Marine Cargo Open Cover menjadi `PS-MOP`.
  Nomor yang sudah terbit tidak berubah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Database lokal**, sebelum dan sesudah migrasi:
  - 26 type of cover berubah: 23 diisi dan 3 diganti.
  - Dibandingkan dengan file LCH, yang berbeda hanya PSAGBI (EQ) dan 0913
    (DNO).
  - Tujuh yang kosong di file LCH tetap kosong.
- `npx tsc --noEmit`, `npx eslint prisma/seed.ts`,
  `npx tsx --test tests/access.test.ts tests/clause-filter.test.ts tests/documents.test.ts`,
  dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- Type of cover yang ditambah LCH sendiri di demo (misalnya 0112, PAR +
  Earthquake) tidak ada di file dan tidak disentuh.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
