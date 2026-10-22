# Lapisan Server Polis ke PostgreSQL

- **Tanggal:** 2026-10-22
- **Branch:** `feat/migrate-policy-postgres`
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Database polis (`/policies`) masih membaca mock store di browser
(`lib/store.ts`), sehingga data hilang saat refresh dan tidak terhubung ke
klien, COB, dan insurer di PostgreSQL. Perubahan ini menyiapkan lapisan
server-nya terlebih dulu.

## Yang berubah

- `lib/server/policies.ts` (baru, server-only):
  - `listPolicies`, `getPolicyById`, `getPolicyByNo`.
  - `createPolicy`, `updatePolicy`, `updatePolicyInsurers`, `deletePolicy`,
    masing-masing dicatat ke `audit_logs` lewat `recordAudit`.
  - `seedInitialPoliciesIfEmpty`: membenihkan polis mock bila tabel kosong.
  - Relasi dimuat lewat satu objek `policyIncludeRelations`, dan mapper
    `toPolicyRecord` memakai tipe `Prisma.PolicyGetPayload`, bukan `any`.
- `prisma/schema.prisma`: `Policy.clientId` menjadi opsional. Polis mock dan
  polis lama tidak selalu punya klien yang sudah terdaftar di tabel `clients`.
- Migrasi baru `20261022120000_policy_client_optional`: melepas `NOT NULL`
  pada `policies.client_id`.

## Dampak

- **Database:** ada migrasi baru. Jalankan `npm run db:deploy` di setiap
  database (lokal dan produksi). Build Vercel tidak menjalankan migrasi.
- **Env:** tidak ada.
- **Deploy:** jalankan migrasi sebelum UI polis disambungkan ke lapisan ini.

## Verifikasi

- `npx tsc --noEmit`: 0 error.
- `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- `components/policies/policy-database.tsx` masih memakai `useCollection`
  dari mock store. Langkah berikutnya: Server Actions dengan Zod dan
  `requireManage("/policies")`, lalu `app/(app)/policies/page.tsx` memuat
  `listPolicies()` di server.
- Belum ada uji E2E browser untuk polis.
