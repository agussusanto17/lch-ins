# Hapus data uji yang tertinggal di produksi

- **Tanggal:** 2026-11-03
- **Branch:** `chore/hapus-data-dummy-produksi`
- **PR:** [#81](https://github.com/agussusanto17/lch-ins/pull/81)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Uji ulang SIT-035 dan SIT-041 di produksi menemukan tiga data uji yang masih
tampil ke pengguna:

- COB **Superman** di daftar COB form placing slip. Dibuat Admin LCH dari
  aplikasi pada 24 Oktober 2026.
- Clause **TEST-SIT030 Sanitasi Script** tanpa COB, jadi muncul di pemilih
  clause semua slip.
- Clause **TEST-SIT029 Format Wording Clause** (PROPERTY), muncul di slip
  Property.

Sesuai kesepakatan 31 Oktober 2026, COB tidak bisa dihapus dari aplikasi dan
hanya dihapus developer lewat migrasi. Clause uji ikut dihapus di migrasi yang
sama.

## Yang berubah

- Migrasi `20261103120000_hapus_data_dummy` menghapus ketiga data tersebut.
- Penghapusan dicocokkan dengan id **dan** nama atau judul, dan hanya terjadi
  kalau data belum dipakai tabel lain (slip, polis, klien, SPPA, clause, cover
  type, dan seterusnya). Kalau sudah dipakai, baris itu dilewati dan build tetap
  jalan.

## File utama

- `prisma/migrations/20261103120000_hapus_data_dummy/migration.sql`

## Dampak

- **Database:** produksi kehilangan 1 COB dan 2 clause uji. Di database lain
  (lokal, VPS dengan database berbeda) migrasi tidak menghapus apa pun.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan otomatis lewat `prisma migrate deploy` saat build
  Vercel setelah fork disinkronkan.

## Verifikasi

- Sebelum PR, dicek read-only di produksi: ketiga data tidak dirujuk tabel mana
  pun (`cob_id` di 10 tabel, `slip_clauses.clause_id`).
- Syarat `WHERE` migrasi dijalankan sebagai `SELECT` di produksi (read-only):
  cocok tepat dengan Superman, TEST-SIT030, dan TEST-SIT029.
- Migrasi dijalankan di database lokal dalam transaksi yang di-rollback:
  `DELETE 0` dua kali, tanpa error.

## Catatan untuk yang melanjutkan

- Setelah deploy, jumlah clause di pemilih berkurang satu di semua slip
  (TEST-SIT030 hilang), dan satu lagi di slip Property / PSAKI (TEST-SIT029).
  Angka uji ulang SIT-035 berubah: Property 266 menjadi 265, Property / PSAKI
  267 menjadi 265, Motor Vehicle 17 menjadi 16.
- SIT-041: arahan Harmul 2 November 2026 (brokerage ditulis sesuai slip dengan
  `INCL. VAT` atau `EXCL. VAT`, Motor Vehicle 25% dikurangi diskon) sudah
  diterapkan di [sit-minggu-3-klausula-klien-ppn-2026-11-02.md](sit-minggu-3-klausula-klien-ppn-2026-11-02.md).
  Yang masih perlu diganti adalah teks hasil yang diharapkan di sheet SIT.
