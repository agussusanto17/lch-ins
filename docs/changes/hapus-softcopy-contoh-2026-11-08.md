# Hapus softcopy polis contoh yang tidak punya isi berkas

- **Tanggal:** 2026-11-08
- **Branch:** `fix/hapus-softcopy-contoh-tanpa-isi`
- **PR:** belum dibuka
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Softcopy polis disimpan di database:
  - isi berkas di `stored_files`;
  - versi di `policy_files`, dengan `file_path` berbentuk `stored_files/<id>`.

  Ini berlaku sejak PR #151 (6 November 2026).
- Database lokal masih berisi 13 baris `policy_files` dari data contoh, misalnya
  `polis-mv-harry-mulyono-2026.pdf`. `file_path` baris itu hanya nama file,
  tanpa isi berkas. Di Policy Database, baris ini tampil sebagai versi
  softcopy yang tidak bisa dibuka.
- Baris itu dibuat `seedInitialPoliciesIfEmpty`, yang mengisi polis contoh saat
  tabel polis masih kosong.
  - Seed ini ada sejak 22 Oktober 2026 (3eae65a).
  - Baru dimatikan untuk produksi pada 3 November 2026 (f754d34).
  - Jadi database demo dan produksi yang dibuka di rentang itu kemungkinan
    juga berisi baris yang sama. Produksi lch-server adalah salinan database
    Instabox (#164).
- Dari riwayat git, sebelum #151 satu-satunya kode yang menulis `policy_files`
  adalah seed ini. Upload dari UI waktu itu hanya berupa blob URL di browser
  dan tidak pernah masuk database. Jadi baris yang `file_path`-nya tidak
  diawali `stored_files/` pasti data contoh.
- Agus meminta data contoh tanpa isi ini dihapus (8 November 2026). Database
  lokal sudah dibersihkan langsung. PR ini untuk demo, produksi, dan database
  baru.

## Yang berubah

- **Migrasi `20261108120000_hapus_softcopy_contoh`:** menghapus baris
  `policy_files` yang `file_path`-nya tidak diawali `stored_files/`. Database
  tanpa baris seperti itu tidak berubah.
- **`seedInitialPoliciesIfEmpty`:** tidak lagi membuat baris softcopy dari data
  contoh. Polis contoh tetap dibuat seperti biasa di luar produksi.
- **Data contoh di `lib/data/policies.ts` tidak diubah**, karena masih dipakai
  tempat lain (`lib/data/claims.ts` dan ekspor `lib/data`).

## File utama

- `prisma/migrations/20261108120000_hapus_softcopy_contoh/migration.sql`.
- `lib/server/policies.ts`: `seedInitialPoliciesIfEmpty`.

## Dampak

- **Database:**
  - Baris softcopy contoh tanpa isi terhapus saat deploy, di Vercel dan VPS.
  - Softcopy hasil upload user tidak tersentuh.
  - Tidak ada perubahan skema.
  - Penghapusan lewat migrasi tidak tercatat di Audit Trail.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan otomatis saat build, di Vercel dan VPS. Tidak ada
  langkah tambahan selain sinkron fork.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint `lib/server/policies.ts`: lolos.
- `prisma migrate diff`: tidak ada perbedaan skema (migrasi hanya data).
- **Database sementara yang baru** (dibuat lalu dihapus lagi):
  - semua 64 migrasi berhasil dijalankan dari awal;
  - seed master data lalu `seedInitialPoliciesIfEmpty` membuat 14 polis contoh
    tanpa satu pun baris `policy_files`;
  - dari dua baris uji, SQL migrasi menghapus yang tanpa isi
    (`polis-contoh.pdf`) dan mempertahankan yang merujuk `stored_files/`
    (`polis-asli.pdf`).
- `npx tsx --test tests/*.test.ts`: 110 lolos.
- `npm run build`: lolos. Migrasi diterapkan ke database lokal tanpa
  menghapus apa pun, karena 13 baris lokal sudah dihapus sebelumnya.

## Catatan untuk yang melanjutkan

- Data contoh lain (polis, klien, klaim contoh) di demo dan produksi tidak
  disentuh PR ini.
- Satu polis contoh (SB/PB/2026/0033) memang gagal dibuat seed karena COB
  Surety Bond belum ada di master data. Ini masalah lama, tidak terkait PR ini.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
