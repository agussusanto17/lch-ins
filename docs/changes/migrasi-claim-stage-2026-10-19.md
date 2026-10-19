# Migration untuk kolom tahapan klaim, dan seed menonaktifkan kode lama

- **Tanggal:** 2026-10-19
- **Branch:** `fix/migrasi-claim-stage`
- **PR:** #12
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dua utang dari [koreksi-requirement-harry-2026-10-19.md](koreksi-requirement-harry-2026-10-19.md):

Pertama, PR itu mengubah `prisma/schema.prisma` tetapi tidak membuat migration.
Akibatnya `npm run db:deploy` tidak akan membuat kolom `stage_id`, sehingga
database melenceng dari schema dan Prisma Client gagal begitu kolom itu dipakai.

Kedua, `seedLookups` hanya menambah dan memperbarui, tidak pernah merapikan. Waktu
`claim_status` dipecah menjadi `claim_status` dan `claim_stage`, sepuluh nilai lama
tetap tertinggal di database. Diperiksa di `lch_dev`, tabel `lookup_values`
menyimpan sebelas nilai `claim_status` aktif padahal yang benar hanya empat.
Selama dropdown masih membaca konstanta TypeScript hal ini belum kelihatan, tetapi
begitu master data dibaca dari database, pilihan lama itu muncul lagi.

## Yang berubah

- **Migration `20261019101158_claim_stage`** menambah kolom `stage_id` yang
  nullable pada tabel `claims` beserta foreign key-nya ke `lookup_values`.
- **Seed menonaktifkan kode yang hilang dari daftar**, khusus untuk lookup
  bertanda `is_system`. Barisnya tidak dihapus, supaya data lama yang menunjuk ke
  sana tetap bisa ditelusuri dan foreign key tidak putus, tetapi `is_active`
  menjadi `false` sehingga berhenti muncul di dropdown.
- Label tetap tidak ditimpa seperti sebelumnya, karena label adalah milik LCH.
  Yang dimiliki program hanya kodenya.
- Ringkasan seed sekarang menyebutkan berapa kode yang dinonaktifkan.

## File utama

- `prisma/migrations/20261019101158_claim_stage/migration.sql`: migration-nya.
- `prisma/seed.ts`: `seedLookups` merapikan kode yang sudah tidak dipakai.

## Dampak

- **Database:** jalankan `npm run db:deploy` lalu `npm run db:seed`. Urutannya
  tidak boleh dibalik, karena seed membaca kolom yang dibuat migration. Pada
  database yang sudah pernah di-seed sebelum PR #11, seed akan menonaktifkan tujuh
  kode `claim_status` lama: `open`, `waiting_document`, `document_complete`,
  `document_incomplete`, `adjuster`, `spk`, dan `paid`.
- **Env:** tidak ada.
- **Deploy:** setelah merge, sinkronkan fork `vourdev/lch-ins` supaya demo ikut
  terbaru.

## Verifikasi

Dijalankan pada `lch_dev` di Postgres lokal:

- `npx prisma migrate status` — empat migration lama terpasang, database bersih.
- `npx prisma migrate dev --create-only --name claim_stage` lalu
  `npx prisma migrate deploy` — migration kelima terpasang tanpa error.
- `npm run db:seed` — keluarannya `lookup_values 73 (7 kode lama dinonaktifkan)`.
- Diperiksa lewat `psql`: kolom `claims.stage_id` ada dan nullable; `claim_status`
  menyisakan empat nilai aktif dan tujuh nilai non-aktif; `claim_stage` berisi
  lima nilai.
- `npx tsc --noEmit` dan `npm run build` lolos.

## Catatan untuk yang melanjutkan

Di database yang sudah pernah di-seed sebelum PR #11, label untuk kode `closed`
akan tetap berbunyi "Close", bukan "Closed", karena seed sengaja tidak menimpa
label. Pada database baru labelnya langsung benar. Kalau LCH mau merapikan,
ubah saja lewat master data; kodenya tetap `closed` dan tidak perlu migration.

Kolom `stage_id` sengaja dibuat nullable supaya baris klaim lama tidak perlu
diisi paksa. Begitu tahapan dipakai penuh di modul klaim, pertimbangkan mengisi
nilai awal untuk baris yang masih kosong sebelum membuatnya wajib.
