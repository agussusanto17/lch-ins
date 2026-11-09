# Penambahan Peran Policy Admin

- **Tanggal:** 2026-11-09
- **Branch:** `feat/peran-policy-admin`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Kebutuhan peran operasional baru **Policy Admin** untuk staf yang mengelola database polis (CRUD Policy Database), dengan kebutuhan memantau proses hulu pada modul Marketing dan Teknik (Placement) secara view-only, tanpa hak akses ke modul keuangan, klaim, master data, maupun konfigurasi sistem.

## Yang berubah

- **Penambahan kode peran `policy_admin`** pada `CANONICAL_ROLES` di `lib/access.ts` dengan label "Policy Admin" dan deskripsi perannya.
- **Pembaruan matriks hak akses `ACCESS_MATRIX`** dengan kolom ke-8 untuk `policy_admin`:
  - `kelola` (CRUD: lihat, tambah, ubah, hapus, release) pada Policy Database (`/policies`).
  - `lihat` (view only) pada Dashboard (`/`), Marketing (`/marketing`), dan Placement (`/underwriting`, mencakup Placing Slip dan Cover Note).
  - `tidak` (tanpa akses) pada modul lainnya: Master Clauses (`/underwriting/master-clauses`), Klaim (`/claims`), Finance (`/finance/*`), Akuntansi (`/accounting/*`), Master Data (`/master-data`), Laporan (`/reports`), Pengaturan Pengguna (`/users`), Audit Trail (`/audit-trail`), dan Settings (`/settings`).
- **Badge warna peran** ditambahkan varian warna `policy_admin` (indigo) pada `components/users/user-role-badge.tsx`.
- **System lookup seed** ditambahkan entri peran `policy_admin` pada `prisma/seed.ts`.
- **Pengujian unit** ditambahkan pada `tests/access.test.ts` untuk memastikan hak akses view-only, CRUD, dan proteksi rute tertutup berfungsi sesuai aturan.

## File utama

- `lib/access.ts`: pendefinisian canonical role, label, kolom matriks, dan level akses rute.
- `components/users/user-role-badge.tsx`: visual badge peran `policy_admin` di tabel dan form pengguna.
- `prisma/seed.ts`: seed lookup system parameter untuk tipe role.
- `tests/access.test.ts`: pengujian validasi role code dan matriks hak akses.

## Dampak

- **Database:** tidak ada migrasi skema (kolom `users.roles` bertipe `String[]`).
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan setelah merge.

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 114 test unit lulus (termasuk 7 subtest hak akses di `tests/access.test.ts`).
- `npx tsc --noEmit`: lolos tanpa error typecheck.
- `npm run build`: build produksi Next.js lolos.

## Catatan untuk yang melanjutkan

- Pengguna baru atau yang sudah ada dapat langsung diberi peran `policy_admin` melalui dialog pengelolaan pengguna di `/users` oleh Admin.
- Karena matriks hak akses menggunakan pencocokan prefix terpanjang (`matchRow`), rute `/underwriting/master-clauses` tetap aman (tertutup) bagi `policy_admin` meskipun `/underwriting` dapat dilihat.
