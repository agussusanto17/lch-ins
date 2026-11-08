# Object storage RustFS untuk berkas unggahan

- **Tanggal:** 2026-11-08
- **Branch:** `feat/object-storage-rustfs`
- **PR:** #176
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Sebelumnya, isi semua berkas unggahan (dokumen KYC klien, softcopy polis, berkas
klaim, dan lampiran slip) disimpan langsung di kolom `data` tipe `bytea` pada
tabel PostgreSQL `stored_files` (lihat `20261031180000_stored_files`). Pola ini
membuat tabel database cepat membengkak, membebani memori connection pool
Prisma, dan memperlambat dump backup harian.

Sesuai permintaan, object storage diimplementasikan untuk memisahkan isi berkas
dari data transaksional utama di database. RustFS dipilih sebagai server object
storage yang kompatibel dengan protokol S3 (pengganti modern dari MinIO).

## Yang berubah

- **Klien S3 modular (`lib/server/object-storage.ts`):**
  - Menggunakan `@aws-sdk/client-s3` dengan `forcePathStyle: true`.
  - Operasi terpusat: `putObject`, `getObject`, `deleteObjects`, `listObjects`.
  - Graceful fallback: bila variabel `S3_*` tidak diisi (misalnya pada deploy demo Vercel),
    aplikasi otomatis beralih menyimpan isi berkas di tabel `stored_files.data` seperti semula.
  - Portabel: dapat dialihkan ke SeaweedFS, Cloudflare R2, atau AWS S3 cukup dengan mengganti env.

- **Pemisahan penyimpanan di `lib/server/stored-files.ts`:**
  - Baris `stored_files` kini hanya menyimpan metadata (nama, tipe konten, ukuran, tujuan, uploader)
    dan kolom unik `storage_key` bert format `<purpose>/<uuid>`.
  - Pada lingkungan dengan S3, objek diunggah ke storage terlebih dahulu. Bila insert baris database gagal,
    objek yang baru dibuat dihapus kembali agar tidak meninggalkan objek yatim.
  - Penghapusan berkas (`deleteStoredFiles`) menghapus baris database di dalam transaksi pemanggil,
    lalu menjadwalkan pembersihan objek di storage melalui `after()` dari `next/server` setelah response
    selesai dan hanya jika baris memang sudah tidak ada.
  - Disediakan `discardStoredFile` untuk pembatalan berkas unggahan yang belum sempat ditautkan
    (misalnya pada `uploadSlipAttachment`).

- **Migrasi Database (`20261108120000_object_storage`):**
  - `ALTER TABLE "stored_files" ALTER COLUMN "data" DROP NOT NULL;`
  - `ALTER TABLE "stored_files" ADD COLUMN "storage_key" TEXT;`
  - Unique index pada `storage_key`.
  - Constraint `CHECK (("data" IS NULL) <> ("storage_key" IS NULL))` untuk memastikan tepat satu
    lokasi isi berkas yang terisi.

- **Skrip Pemeliharaan:**
  - `scripts/move-files-to-object-storage.ts`: memindahkan berkas lama dari kolom `data` ke object storage
    secara idempoten dan aman dijalankan ulang.
  - `scripts/sweep-orphan-objects.ts`: memindai dan membersihkan objek di bucket yang tidak memiliki
    referensi baris di `stored_files` (dengan grace period 1 jam).

- **Infrastruktur VPS (`lch-server`):**
  - Service kontainer `lch_rustfs` (image `rustfs/rustfs:1.0.4`) ditambahkan ke `docker-compose.db.yml`.
  - Port S3 API (9000) dan Console (9001) hanya di-bind ke `127.0.0.1`, tidak dibuka ke publik oleh firewall UFW.
  - Bucket `lch-files` dibuat, dilindungi oleh IAM policy `lch-app` dengan hak akses terbatas ke bucket tersebut.
  - Binary admin CLI `rc` (static-pie musl) terpasang di `/usr/local/bin/rc`.
  - Skrip backup harian `/data/workspace/app/backup.sh` dipasang via cron jam 02:00 WIB untuk mencakup
    dump Postgres dan mirror bucket RustFS dengan rotasi retensi 7 hari.

## File utama

- `lib/server/object-storage.ts`: wrapper S3 client, deteksi status storage, get/put/delete/list.
- `lib/server/stored-files.ts`: integrasi penyimpanan metadata ke DB dan isi berkas ke S3.
- `lib/server/slip-files.ts`: penyesuaian pembersihan berkas unggahan slip yang batal ditautkan.
- `prisma/schema.prisma`: perubahan model `StoredFile` (`data` nullable, `storageKey` string unik).
- `prisma/migrations/20261108120000_object_storage/migration.sql`: DDL migrasi skema.
- `scripts/move-files-to-object-storage.ts`: skrip migrasi data dari bytea ke S3.
- `scripts/sweep-orphan-objects.ts`: skrip pembersih objek yatim.
- `.env.example`: dokumentasi variabel `S3_*`.

## Dampak

- **Database:** skema tabel `stored_files` berubah; kolom `data` menjadi opsional dan kolom `storage_key` ditambahkan.
- **Env:** variabel baru:
  - `S3_ENDPOINT` (misal: `http://127.0.0.1:9000`)
  - `S3_REGION` (default: `us-east-1`)
  - `S3_ACCESS_KEY_ID`
  - `S3_SECRET_ACCESS_KEY`
  - `S3_BUCKET` (misal: `lch-files`)
  Bila variabel-variabel ini dikosongkan, aplikasi tetap berfungsi dengan menyimpan berkas di database.
- **Deploy:**
  - `npx prisma migrate deploy` dijalankan saat build.
  - Di `lch-server`, kontainer `lch_rustfs` sudah berjalan dan variabel S3 sudah terpasang di `repo/.env`.
  - Setelah deploy selesai, jalankan skrip migrasi satu kali untuk memindahkan data lama:
    `node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/move-files-to-object-storage.ts`.

## Verifikasi

- `npx tsc --noEmit` lolos tanpa error.
- Pengujian lokal dengan kontainer RustFS:
  - Penyimpanan file baru (`saveUploadedFile`) berhasil mengunggah ke S3 dan mengosongkan kolom `data`.
  - Pembacaan file (`readStoredFile`) berhasil mengambil isi binary dari S3 dengan checksum identik.
  - Penghapusan file (`discardStoredFile`) menghapus baris DB dan objek S3.
  - Constraint database menolak baris tanpa data dan tanpa `storage_key`.
  - Skrip `move-files-to-object-storage.ts` berhasil memindahkan berkas lokal ke S3 dengan MD5 checksum cocok dan idempoten.
- Pengujian di VPS `lch-server`:
  - Kontainer `lch_rustfs` status `healthy`, port 9000/9001 terikat ke 127.0.0.1.
  - UFW aktif dan menutup port 9000/9001 dari luar.
  - Tool `rc` berhasil membuat bucket `lch-files`, membuat policy `lch-app`, dan user aplikasi.
  - Backup script `/data/workspace/app/backup.sh` berhasil membuat dump DB dan arsip tar S3.

## Catatan untuk yang melanjutkan

- Kredensial root RustFS dan kredensial user aplikasi disimpan di server pada `/data/workspace/app/.env.rustfs` (chmod 600).
- Jika ingin membuka Web Console RustFS di port 9001, gunakan SSH port forwarding dari mesin lokal:
  `ssh -i devops-ssh.pem -L 9001:127.0.0.1:9001 devops@103.150.116.66` lalu buka `http://localhost:9001`.
  Jangan membuka port 9001 langsung ke publik di firewall.
- Di demo Vercel, variabel `S3_*` tidak diset sehingga Vercel tetap memakai mode fallback (PostgreSQL `data` bytea).
