# Migrasi Persistensi Database Klaim ke PostgreSQL

- **Tanggal:** 2026-10-22
- **Branch:** `feat/migrate-claims-postgres`
- **PR:** #27
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Modul Manajemen Klaim di menu Klaim (`/claims`) sebelumnya masih mengandalkan in-memory mock store browser (`lib/store.ts` dan `lib/data/claims.ts`). Data klaim yang dimasukkan tidak tersimpan permanen di database PostgreSQL dan belum terhubung ke entitas polis (`policies`), pihak adjuster (`adjusters`), serta lookup status dan tahapan klaim (`claim_status`, `claim_stage`).

Implementasi ini menyelesaikan persistensi basis data untuk entitas Klaim menggunakan tabel relasional PostgreSQL `claims` via Prisma 7.

## Yang berubah

- **Data Layer Server-Only:** Membuat modul `lib/server/claims.ts` dengan dukungan transaksi Prisma, audit logging terintegrasi, dan pemetaan tipe `ClaimRecord`.
- **Query & Mutasi Basis Data:** Menyediakan fungsi query `listClaims()`, `getClaimById()`, `getClaimByNo()` dan mutasi `createClaim()`, `updateClaim()`, `updateClaimStatus()`, `deleteClaim()`.
- **Lookup Resolution & Caching:** Resolusi otomatis `statusId` dan `stageId` dari tabel `lookup_values` dengan memory cache untuk efisiensi kueri berulang.
- **Integritas Referensial & Proteksi Hapus:** Penghapusan klaim dilindungi dari penghapusan fisik jika klaim sudah memiliki riwayat pembayaran (`payments`).
- **Audit Logging Terintegrasi:** Setiap penambahan, pembaruan, perubahan status, dan penghapusan klaim dicatat ke tabel `audit_logs` melalui `recordAudit()`.
- **Auto-Seeding Idempoten:** Fungsi `seedInitialClaimsIfEmpty()` secara otomatis membenihkan 2 data klaim operasional LCH saat tabel kosong.
- **Kepatuhan Antislop & Code Review:** Menerapkan `Prisma.ClaimGetPayload` strictly typed tanpa tipe `any`, serta bebas dari komentar banner dekoratif.

## File utama

- `lib/server/claims.ts`: Lapisan persistensi data PostgreSQL untuk klaim.
- `docs/changes/migrasi-klaim-postgres-2026-10-22.md`: Catatan perubahan modul klaim.

## Dampak

- **Database:** Memanfaatkan tabel `claims` yang sudah tersedia di skema Prisma beserta relasi ke `policies`, `adjusters`, `currencies`, dan `lookup_values`.
- **Env:** Tidak ada variabel lingkungan baru.
- **Deploy:** Tidak ada langkah tambahan khusus.

## Verifikasi

1. **Uji Tipe TypeScript:**
   - Perintah: `npx tsc --noEmit`
   - Hasil: 0 error (`TypeScript: No errors found`).
2. **Uji Next.js Build:**
   - Perintah: `npm run build`
   - Hasil: Seluruh 21 rute terkompilasi sukses.

## Catatan untuk yang melanjutkan

- Komponen antarmuka `components/claims/claims-view.tsx` perlu disambungkan dengan Server Component prefetch (`initialClaims`) dan Server Actions untuk mutasi data form klaim secara langsung.
