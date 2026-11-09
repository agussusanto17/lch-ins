# Penegakan ketat object storage RustFS khusus VPS lch-server

- **Tanggal:** 2026-11-09
- **Branch:** `feat/strict-vps-object-storage`
- **PR:** #177
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Menindaklanjuti implementasi awal RustFS di PR #176 (`object-storage-rustfs-2026-11-08.md`),
diperlukan mekanisme penegakan yang ketat agar pada VPS `lch-server` **tidak ada lagi
dokumen maupun gambar yang tersimpan di kolom bytea database PostgreSQL**.

Pada saat yang sama, demo Vercel (`lch-ins.vercel.app`) dan lingkungan pengujian lokal tanpa
S3 tetap harus dapat beroperasi lancar melalui fallback penyimpanan database tanpa error.

## Yang berubah

- **Penjagaan ketat di layer aplikasi (`lib/server/stored-files.ts`):**
  - Bila flag `REQUIRE_OBJECT_STORAGE=true` aktif (pada VPS produksi), aplikasi secara ketat
    menolak menyimpan berkas ke database bytea bila S3/RustFS tidak aktif atau belum siap.
  - Aliran simpan memastikan payload binary diunggah ke RustFS terlebih dahulu, baru metadata
    dan `storage_key` dicatat ke database dengan kolom `data` selalu `NULL`.
- **Streaming WebStream untuk efisiensi memori (`lib/server/object-storage.ts`):**
  - Menambahkan utilitas `getObjectStream(key)` menggunakan `Body.transformToWebStream()`
    agar penyajian berkas dari RustFS dialirkan langsung ke response klien tanpa memuat seluruh
    isi berkas ke RAM container aplikasi (menghemat RAM server 3.8 GB).
  - Konfigurasi `maxAttempts: 2` untuk deteksi kegagalan koneksi storage yang cepat.
  - Fungsi diagnostik `isStorageUnavailableError` untuk mendeteksi `ECONNREFUSED`, `ETIMEDOUT`,
    timeout koneksi, atau error 5xx dari S3.
- **Penanganan error terstruktur di rute berkas (`app/api/files/[id]/route.ts`):**
  - Bila RustFS sedang maintenance atau tidak dapat diakses, endpoint mengembalikan HTTP 503
    Service Unavailable dengan header `Retry-After: 5` secara anggun (tidak crash uncaught 500).
- **Trigger guard di layer database PostgreSQL (`20261109120000_strict_vps_object_storage`):**
  - Menambahkan trigger `trg_enforce_strict_object_storage` pada tabel `stored_files`.
  - Trigger memeriksa parameter konfigurasi database `app.require_object_storage`.
  - Bila parameter bernilai `'true'` dan kolom `NEW.data IS NOT NULL`, operasi `INSERT` atau `UPDATE`
    langsung digagalkan di tingkat mesin PostgreSQL dengan pesan:
    `Penyimpanan isi berkas ke kolom data (bytea) dilarang pada server ini. Gunakan object storage RustFS.`
  - Di demo Vercel dan lingkungan dev di mana parameter ini tidak diset (default `NULL`), trigger
    melewatkan insert dengan normal sehingga backward compatibility demo Vercel tetap terjaga 100%.

## File utama

- `lib/server/object-storage.ts`: helper `isObjectStorageRequired`, `isStorageUnavailableError`, dan `getObjectStream`.
- `lib/server/stored-files.ts`: validasi strict mode pada `saveUploadedFile` dan pembacaan stream pada `readStoredFile`.
- `app/api/files/[id]/route.ts`: penanganan error 503 saat storage down dan penyajian berkas streaming.
- `prisma/migrations/20261109120000_strict_vps_object_storage/migration.sql`: DDL trigger pengaman database PostgreSQL.
- `.env.example`: dokumentasi variabel `REQUIRE_OBJECT_STORAGE`.

## Dampak

- **Database:** migrasi baru menambahkan fungsi trigger `enforce_strict_object_storage()` dan trigger
  `trg_enforce_strict_object_storage` pada tabel `stored_files`.
- **Env:** variabel baru `REQUIRE_OBJECT_STORAGE` (diset `"true"` di VPS produksi, `"false"` atau kosong di Vercel).
- **Deploy:**
  - `npx prisma migrate deploy` dijalankan saat build.
  - Di VPS `lch-server`, pasang `REQUIRE_OBJECT_STORAGE="true"` di `/data/workspace/app/repo/.env`.
  - Di PostgreSQL VPS, aktifkan parameter database:
    `docker exec lch_postgres psql -U lch -d lch_ins -c "ALTER DATABASE lch_ins SET app.require_object_storage = 'true';"`

## Verifikasi

- `npx tsc --noEmit` lolos tanpa error.
- `npm run build` sukses membuat artefak produksi Next.js.
- Pengujian trigger database:
  - Saat `SET app.require_object_storage = 'true'`: insert baris dengan isi `data` bytea langsung ditolak oleh trigger dengan kode error `P0001`.
  - Saat `SET app.require_object_storage = 'true'`: insert baris dengan `storage_key` dan `data = NULL` berhasil masuk.
  - Saat `RESET app.require_object_storage`: insert baris dengan `data` bytea berhasil masuk (kompatibilitas mode fallback Vercel terverifikasi).

## Catatan untuk yang melanjutkan

- Flag `REQUIRE_OBJECT_STORAGE=true` di env dan parameter `app.require_object_storage = 'true'` di database
  adalah pengaman ganda (defense-in-depth). Jika ada query langsung atau skrip liar yang mencoba menyimpan bytea
  ke database VPS, database itu sendiri yang akan memblokirnya.
- Cron pembersihan objek yatim berkala di VPS:
  `0 20 * * 0 cd /data/workspace/app/repo && node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/sweep-orphan-objects.ts --apply >> /data/workspace/app/backups/daily/sweep.log 2>&1`
- Rujuk catatan sebelumnya di `docs/changes/object-storage-rustfs-2026-11-08.md` untuk konfigurasi awal RustFS.
