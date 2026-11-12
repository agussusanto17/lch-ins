# Migrasi penuh data Vercel production ke VPS

- **Tanggal:** 2026-11-12
- **Branch:** `chore/migrasi-data-vercel-ke-vps`
- **PR:** #222
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- **Situasi sebelum migrasi:**
  - DB produksi VPS (`apps.lch.co.id`) adalah salinan DB Vercel per 8 November
    (lihat `salin-db-vercel-ke-vps-2026-11-08.md`).
  - Sejak itu kedua DB berjalan terpisah.
- **Keputusan user:**
  - Data Vercel (Prisma Postgres) dipakai untuk produksi, jadi DB VPS diganti
    penuh.
  - Data yang masuk langsung ke VPS sejak 8 November boleh hilang, termasuk tiga
    berkas uji.
- **Batasan baru sejak salinan 8 November:** VPS sudah memakai strict object
  storage (`strict-vps-object-storage-2026-11-09.md`). Akibatnya berkas Vercel
  yang masih bytea harus dipindah ke RustFS sebelum database ditukar.
- **Postgres tetap versi 16.** Upgrade ke 17 dikerjakan terpisah.

## Yang berubah

- **Isi DB `lch_ins` di VPS diganti salinan DB Vercel** pada 12 November
  pukul 10.34 WIB.
  - Downtime 4 detik.
  - Setelah itu `lch_web` di-restart.
- **Cara menyalin** (pola sama dengan 8 November):
  1. **Dump.** `pg_dump` 17 (image `postgres:17-alpine`) dalam transaksi
     read-only, skema `public`, tanpa owner dan privilege. Baris
     `SET transaction_timeout` dibuang karena server masih Postgres 16.
  2. **Restore ke DB sementara.** Dump dimuat ke `lch_ins_next` dalam satu
     transaksi.
  3. **Cek migrasi.** Daftar migrasi dicocokkan dengan DB lama: 81 migrasi, sama
     persis.
  4. **Pindah berkas.** `scripts/move-files-to-object-storage.ts` dijalankan
     ke `lch_ins_next`. Ketujuh berkas Vercel (5,4 MB) pindah dari bytea ke
     RustFS, dan ukuran tiap objek cocok dengan `size_bytes`.
  5. **Setting strict.** `ALTER DATABASE lch_ins_next SET
     app.require_object_storage = 'true'`. Setting ini menempel ke database,
     bukan ke namanya, jadi ikut terbawa saat ganti nama.
  6. **Tukar nama.** `allow_connections false`, putus koneksi, lalu
     `lch_ins` → `lch_ins_pre_vercel_20261112_1034` dan
     `lch_ins_next` → `lch_ins`.
- **Objek yatim dibersihkan.** Dua lampiran slip uji dari DB lama dihapus dari
  bucket dengan `sweep-orphan-objects.ts --apply`. Objek `uji-storage.pdf`
  sudah tidak ada di bucket sebelum migrasi.

## File utama

- Tidak ada perubahan kode. Pekerjaan dilakukan di server.
- Dump Vercel disimpan di
  `/data/workspace/app/backups/vercel-20261112_1032.sql` (chmod 600, berisi
  data pribadi).

## Dampak

- **Database:**
  - DB VPS sekarang berisi data Vercel per 12 November pukul 10.32 WIB: 13 user,
    11 klien, 15 slip, 9 polis, 2 klaim, 7 berkas, dan 664 audit log.
  - DB lama disimpan sebagai `lch_ins_pre_vercel_20261112_1034`.
  - Backup sebelum migrasi ada di `backups/daily/db_lch_ins_20261112_103227.dump`
    dan `storage_lch-files_20261112_103227.tar.gz`.
- **Data VPS yang hilang:**
  - 13 update data pada 10–11 November, semua sesi login, dan tiga berkas uji.
  - Tujuh user yang sudah dihapus di Vercel setelah 8 November juga tidak ada
    lagi di VPS: tiga `operator.*@lch.co.id`, `aditiya@lch.co.id`,
    `joko@gmail.com`, dan dua akun `test.*@lch.example`.
  - User yang hanya ada di Vercel (`policyadmin@lch.co.id`) sekarang ada di VPS.
- **Login:** semua user perlu login ulang. Password mengikuti data Vercel.
- **Env:** tidak ada perubahan.
- **Deploy:** tidak ada langkah setelah merge.

## Verifikasi

- **Database:**
  - `/login` 200 dari server dan dari `https://apps.lch.co.id`.
  - `_prisma_migrations` = 81.
  - `current_setting('app.require_object_storage')` = `true` di koneksi baru.
- **Strict guard:** insert bytea uji (dalam transaksi) ditolak trigger dengan
  pesan "Penyimpanan isi berkas ke kolom data (bytea) dilarang…". Jumlah baris
  bytea = 0.
- **Berkas:**
  - Login `admin@lch.example` berhasil.
  - Ketujuh berkas terbuka lewat `/api/files/<id>` dengan status 200,
    `application/pdf`, dan ukuran sesuai.
- **Halaman:** `/`, `/policies`, `/claims`, `/marketing` 200, dan
  `/underwriting` 308 (dialihkan).
- **Jalur upload:** diuji dengan `saveUploadedBytes` lalu `discardStoredFile`
  ke DB produksi.
  - Baris dibuat dengan `data` null, dan objek ada di RustFS.
  - Setelah dibuang, baris dan objek hilang.
- **Log:** `lch_web` tidak berisi error setelah restart.

## Catatan untuk yang melanjutkan

- **Rollback:**
  1. Tukar nama kembali: `lch_ins` → nama lain, lalu
     `lch_ins_pre_vercel_20261112_1034` → `lch_ins`. Pakai
     `allow_connections false` dan putus koneksi dulu.
  2. Restart `lch_web`.
  3. Setting strict ikut kembali karena menempel ke DB lama.
  4. Dua lampiran slip uji sudah terhapus dari bucket. Kalau perlu, ambil dari
     `storage_lch-files_20261112_103227.tar.gz`.
- **DB lama:** `lch_ins_pre_vercel_20261108_172459`, `lch_ins_prev`, dan
  `lch_ins_pre_vercel_20261112_1034` boleh di-drop setelah produksi stabil
  sekitar 7 hari.
- **URL sumber Prisma Postgres:** diambil dari baris komentar di `.env` lokal
  dan dikirim ke server lewat stdin SSH. URL itu tidak tersimpan di server.
  `vercel env pull` tidak bisa dipakai, karena variabel DB di Vercel bertipe
  sensitive dan hasil pull-nya kosong.
- **Setelah migrasi:** DB Vercel dan VPS kembali terpisah, tanpa sinkron
  otomatis.
- **Upgrade Postgres 17:** mulai dari dump `lch_ins` VPS sekarang, bukan dari
  Vercel.
