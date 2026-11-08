# Salin database Vercel ke VPS (sekali)

- **Tanggal:** 2026-11-08
- **Branch:** `chore/sinkron-db-vercel-ke-vps`
- **PR:** #174
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- **Dua database dengan data berbeda.**
  - Demo Vercel (`lch-ins.vercel.app`) memakai Prisma Postgres.
  - VPS (`lch-ins.adhinugroho.tech`) memakai Postgres sendiri, yang disalin
    dari Instabox pada 7 November.
- **Akibatnya, data kedua demo berbeda.**
  - VPS punya 14 polis dan 5 klaim.
  - Vercel punya slip November yang tidak ada di VPS.
- **Keputusan user:**
  - Isi DB Vercel disalin ke VPS satu kali.
  - Database tetap terpisah. Tidak ada sinkron otomatis, jadi data kedua sisi
    boleh berbeda lagi.

## Yang berubah

- **Isi DB VPS diganti salinan DB Vercel** pada 8 November.
  - Penggantian pertama pukul 17.25 WIB.
  - Penyalinan diulang sekali pukul 17.36 WIB saat menguji skrip.
- **Cara menyalin:**
  1. Dump skema `public` dari Vercel memakai `pg_dump` 17 (image
     `postgres:17-alpine`) dalam transaksi read-only. DB Vercel hanya dibaca.
  2. Dump dimuat dalam format SQL biasa, karena `lch_postgres` masih
     Postgres 16.
  3. Hasilnya dimuat ke database sementara, lalu nama database ditukar.
     Aplikasi tidak dimatikan.
- **Cron sinkron per jam sempat dipasang, lalu dicabut sebelum sempat jalan.**
  - Dipasang di `/etc/cron.d/lch-sync`.
  - Dicabut atas permintaan user.
  - Skrip, file URL sumber, dan konfigurasi logrotate di VPS ikut dihapus.
- **Penjelasan di AGENTS.md:** kedua database terpisah dan tidak disinkron.

## File utama

- `AGENTS.md`: catatan bahwa database Vercel dan VPS terpisah.

## Dampak

- **Database:**
  - DB VPS sekarang berisi data Vercel per 8 November 2026 sore.
  - Setelah itu, input di Vercel tidak muncul di VPS, begitu pula sebaliknya.
  - DB VPS lama disimpan sebagai `lch_ins_pre_vercel_20261108_172459`.
  - Dump DB VPS lama ada di
    `/data/workspace/app/backups/pre-vercel-sync-20261108-172459.dump`.
  - `lch_ins_prev` adalah salinan Vercel dari pukul 17.25, sisa uji skrip.
    Isinya tidak dibutuhkan dan boleh di-drop.
- **Env:** tidak ada perubahan.
- **Deploy:** tidak ada langkah setelah merge.

## Verifikasi

- **Uji restore sebelum penukaran pertama.** Dump Vercel dimuat ke DB
  sementara di VPS. Isinya cocok dengan sumber:
  - 1 polis, 1 klaim, 8 slip;
  - 6 klien, 19 user, 2 file;
  - 63 migrasi.
- **Saat penukaran, container `lch_web` tidak restart dan log tidak berisi
  error.**
- **Smoke test ego-browser (read-only) di `lch-ins.adhinugroho.tech`:**
  - Login admin berhasil.
  - 16 halaman terbuka tanpa error.
  - Jumlah data: Polis 1, Klaim 1, Underwriting 8.
  - Empat dokumen untuk slip 002/PS-MV/XI/2026 dan 002/PS-PAREQ/VIII/2026
    tampil dengan nomor, kop, dan footer.

## Catatan untuk yang melanjutkan

- **Menyalin ulang dari Vercel:** ulangi langkah di atas secara manual.
  - Skrip uji yang dipakai ada di riwayat branch ini (commit pertama PR #174,
    `scripts/vps/sync-from-vercel.sh`).
  - URL Prisma Postgres harus diberikan saat menjalankan. Jangan simpan URL itu
    di server.
- **Kembali ke data VPS sebelum 8 November:**
  1. Rename `lch_ins` ke nama lain.
  2. Rename `lch_ins_pre_vercel_20261108_172459` menjadi `lch_ins`.
- **Data VPS lama tidak ikut ke Vercel.**
  - 14 polis, 5 klaim, dan slip 001–005/VIII dari DB lama belum dipindahkan.
  - Kalau data itu diperlukan, input atau migrasikan ke Vercel.
