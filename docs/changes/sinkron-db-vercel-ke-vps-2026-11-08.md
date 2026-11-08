# Sinkron database Vercel ke VPS

- **Tanggal:** 2026-11-08
- **Branch:** `chore/sinkron-db-vercel-ke-vps`
- **PR:** #174
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- **Dua database dengan data berbeda.** Demo Vercel (`lch-ins.vercel.app`)
  memakai Prisma Postgres. VPS (`lch-ins.adhinugroho.tech`) memakai Postgres
  sendiri yang disalin dari Instabox pada 7 November.
- **Akibatnya data kedua demo berbeda.** VPS punya 14 polis dan 5 klaim,
  sementara Vercel punya slip November yang tidak ada di VPS.
- **Keputusan user:** database tetap dipisah, tetapi VPS selalu mengambil data
  terbaru dari Vercel.

## Yang berubah

- **Isi DB VPS diganti salinan DB Vercel** pada 8 November pukul 17.25 WIB.
  - DB VPS yang lama tidak dihapus, hanya di-rename menjadi
    `lch_ins_pre_vercel_20261108_172459`.
  - Dump DB lama juga disimpan di
    `/data/workspace/app/backups/pre-vercel-sync-20261108-172459.dump`.
- **Sinkron otomatis setiap jam, menit ke-15 WIB.** Jalan lewat
  `/etc/cron.d/lch-sync` dan menjalankan
  `/data/workspace/app/sync-from-vercel.sh` (salinan dari
  `scripts/vps/sync-from-vercel.sh`).
- **Urutan kerja skrip:**
  1. Dump skema `public` dari Vercel memakai `pg_dump` 17 (image
     `postgres:17-alpine`) dalam transaksi read-only.
  2. Muat dump ke `lch_ins_next`.
  3. Cocokkan daftar migrasi `lch_ins_next` dengan `lch_ins`.
  4. Tukar nama database. `lch_ins` yang sedang jalan menjadi `lch_ins_prev`,
     yang menyimpan satu salinan sebelumnya.
- **Sinkron dilewati bila daftar migrasi berbeda.** Contohnya deploy VPS sudah
  menjalankan migrasi baru tetapi build Vercel belum. Data VPS tetap seperti
  sebelumnya, dan sinkron berikutnya mencoba lagi.
- **Aplikasi tidak dimatikan.** Koneksi ke `lch_ins` diputus sekitar 1 detik
  saat penukaran, lalu pool `pg` membuka koneksi baru sendiri.
- **Penjelasan di AGENTS.md** ditambah agar agent berikutnya tahu Vercel adalah
  sumber data.

## File utama

- `scripts/vps/sync-from-vercel.sh`: skrip sinkron yang dipasang di VPS.
- `AGENTS.md`: catatan bahwa database terpisah dan arah sinkronnya.

## Dampak

- **Database:**
  - Data yang diinput langsung di VPS tertimpa pada sinkron berikutnya.
  - Input data dilakukan di Vercel.
  - DB Vercel hanya dibaca dan tidak pernah ditulisi oleh skrip ini.
- **Env:**
  - File baru `/data/workspace/app/.env.vercel-source` di VPS, berisi URL
    Prisma Postgres. Pemilik root, mode 600.
  - Tidak ada variabel baru di aplikasi.
- **Deploy:**
  - Tidak ada langkah setelah merge.
  - Skrip di repo hanya salinan. Kalau skrip diubah, pasang ulang secara
    manual:
    `sudo install -m 700 -o root -g root scripts/vps/sync-from-vercel.sh /data/workspace/app/`
- **Log:**
  - Lokasi `/var/log/lch-sync.log`, dirotasi mingguan (`/etc/logrotate.d/lch-sync`).
  - Setiap run menulis jumlah polis, klaim, slip, dan file.

## Verifikasi

- **Uji restore sebelum penukaran pertama.** Dump Vercel dimuat ke DB
  sementara di VPS. Jumlahnya 1 polis, 1 klaim, 8 slip, 6 klien, 19 user,
  2 file, dan 63 migrasi, sama dengan sumber.
- **Run manual skrip:** selesai dalam 46 detik. Container `lch_web` tidak
  restart dan log tidak berisi error.
- **Smoke test ego-browser (read-only) di `lch-ins.adhinugroho.tech`,
  dijalankan setelah penukaran pertama dan setelah run skrip:**
  - Login admin berhasil.
  - 16 halaman terbuka tanpa error.
  - Polis 1, Klaim 1, Underwriting 8.
  - Empat dokumen untuk slip 002/PS-MV/XI/2026 dan 002/PS-PAREQ/VIII/2026
    tampil dengan nomor, kop, dan footer.

## Catatan untuk yang melanjutkan

- **Menjeda sinkron:** beri tanda `#` pada baris di `/etc/cron.d/lch-sync`.
  Jeda ini perlu, misalnya, saat demo di VPS butuh input data yang tidak boleh
  hilang.
- **Kembali ke data VPS sebelum 8 November:** hentikan cron, lalu rename
  `lch_ins_pre_vercel_20261108_172459` menjadi `lch_ins`, setelah `lch_ins`
  yang sekarang di-rename ke nama lain.
- **URL Prisma Postgres di-rotate:** perbarui
  `/data/workspace/app/.env.vercel-source`. Kalau tidak, sinkron gagal dan
  tercatat di log.
- **Data VPS lama tidak ikut ke Vercel.** 14 polis, 5 klaim, dan slip
  001–005/VIII dari DB lama belum dipindahkan. Kalau data itu diperlukan,
  harus diinput atau dimigrasikan ke Vercel.
