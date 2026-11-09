# Judul section form slip tidak tertimpa ringkasan

- **Tanggal:** 2026-11-09
- **Branch:** `fix/judul-section-tertimpa-ringkasan`
- **PR:** [#191](https://github.com/agussusanto17/lch-ins/pull/191)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Temuan Harry (9 November 2026): di form placing slip, judul **Informasi
  Dasar** tertimpa nama tertanggung yang panjang, misalnya "PT. HABCO PRIMATAMA
  and/or PT. BRIGADE GARDA NASIONAL and/or … for their respective rights and
  interests."
- Header section yang bisa dilipat memakai grid dua kolom. Kolom kanan berisi
  ringkasan (nama tertanggung, total premi, jumlah lokasi), dan lebarnya
  mengikuti panjang teks ringkasan.
- Nama yang panjang membuat kolom kanan memakan hampir seluruh lebar kartu.
  Kolom judul menyempit sampai nol, judul pecah menjadi "Informasi" dan "Dasar",
  lalu tertimpa teks ringkasan.

## Yang berubah

- **Judul memakai lebar aslinya** dan tetap satu baris.
- **Ringkasan mengisi sisa ruang** di kanan judul, satu baris. Kalau terlalu
  panjang, dipotong dengan "…", dan teks lengkapnya muncul saat kursor
  diarahkan ke ringkasan.
- **Badge di header**, misalnya "1 rate butuh alasan", tidak ikut menyempit.
- Berlaku untuk semua section form placing slip, karena memakai komponen yang
  sama (`SectionCard`).
- Di layar di bawah 640 px, ringkasan tetap disembunyikan seperti sebelumnya.

## File utama

- `components/shared/section-card.tsx`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint `components/shared/section-card.tsx`, dan
  `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 140 lolos.
- **Uji browser lokal** (Playwright dengan Chrome, sesi login sementara):
  - Form slip baru Motor Vehicle PSKBI dengan nama tertanggung dari temuan
    Harry, dan rate casco 0,05% supaya badge "1 rate butuh alasan" muncul.
  - Di lebar 1440, 1024, 700, dan 390 px, ketujuh header section: judul satu
    baris, tidak bertumpuk dengan ringkasan atau badge, dan tidak keluar dari
    kartu.
  - Ringkasan Informasi Dasar dipotong dengan "…" dan punya teks lengkap saat
    di-hover. Ringkasan pendek seperti "IDR 125.000" tetap utuh di kanan.
  - Di 390 px ringkasan tersembunyi, dan badge tetap tampil.
  - Tanpa error halaman. Form tidak disimpan, jadi tidak ada data uji.
- Sesi sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- Sempat ada error `tsc` di `.next/dev/types/validator.ts` ("onst handler").
  File itu dibuat dev server dan tertulis setengah saat dev server sedang
  mengompilasi. Matikan dev server, hapus `.next/dev`, lalu ulangi `tsc`.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
