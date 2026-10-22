# Perbaikan Migrasi `policies.client_id` Opsional

- **Tanggal:** 2026-10-22
- **Branch:** `fix/migrasi-polis-fk`
- **Dikerjakan oleh:** ZoD3V dengan Claude Code
- **Lanjutan dari:** [migrasi-polis-postgres-2026-10-22.md](migrasi-polis-postgres-2026-10-22.md)

## Latar belakang

Migrasi `20261022120000_policy_client_optional` dari PR #28 hanya melepas
`NOT NULL` pada `policies.client_id`. Begitu relasi `Policy.client` dibuat
opsional, Prisma juga mengubah aturan FK menjadi `ON DELETE SET NULL`.
`prisma migrate diff` terhadap database setelah migrasi itu masih menunjukkan
selisih FK, sehingga `migrate dev` berikutnya akan membuat migrasi drift.

## Yang berubah

- `prisma/migrations/20261022120000_policy_client_optional/migration.sql`
  kini drop lalu buat ulang `policies_client_id_fkey` dengan
  `ON DELETE SET NULL ON UPDATE CASCADE`, sama persis dengan hasil
  `prisma migrate diff`.
- File migrasi diubah di tempat karena belum pernah diterapkan di database
  mana pun selain lokal pada hari yang sama.

## Dampak

- **Database:** jalankan `npm run db:deploy`. Database lokal pengembang yang
  skemanya dulu dibuat lewat `db push` perlu menandai migrasi lama sebagai
  sudah diterapkan sebelum deploy:
  `npx prisma migrate resolve --applied 20261019101158_claim_stage`, lalu
  `20261019105342_better_auth` dan `20261019120000_multi_role_user_management`.
  Cek dulu dengan `npx prisma migrate diff --from-config-datasource
  --to-schema prisma/schema.prisma --script` bahwa kolomnya memang sudah ada.
- **Env:** tidak ada.
- **Deploy:** build Vercel tidak menjalankan migrasi. Database produksi
  (Prisma Postgres di Vercel) perlu `npm run db:deploy` dengan connection
  string produksi. Nilainya disimpan sebagai env sensitif sehingga tidak bisa
  ditarik lewat `vercel env pull`; ambil dari dashboard Prisma atau Vercel.

## Verifikasi

- Lokal: tiga migrasi lama ditandai applied, `prisma migrate deploy`
  menerapkan migrasi ini, lalu `prisma migrate diff` menghasilkan
  "This is an empty migration".
- `npx tsc --noEmit` dan `npm run build` lolos.

## Catatan untuk yang melanjutkan

- Migrasi produksi belum dijalankan. Jalankan sebelum UI `/policies`
  memakai database, karena polis tanpa klien akan ditolak selama kolom masih
  `NOT NULL`.
