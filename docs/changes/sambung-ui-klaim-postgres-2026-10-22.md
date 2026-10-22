# Integrasi UI Modul Klaim ke PostgreSQL & Server Actions

- **Tanggal:** 2026-10-22
- **Branch:** `feat/claims-ui-postgres`
- **PR:** # (diisi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Sebelumnya, lapisan server persistensi klaim di `lib/server/claims.ts` telah dibuat (#27), tetapi antarmuka halaman `/claims` beserta form klaim (`claim-form.tsx`) dan tabel monitoring (`claims-view.tsx`) masih menggunakan in-memory store browser lokal. Akibatnya:
1. Perubahan atau klaim baru yang dicatat pengguna di browser tidak tersimpan ke database PostgreSQL.
2. Dropdown polis dan adjuster pada form pencatatan klaim belum mengambil data relasi riil dari database PostgreSQL.
3. Operasi Create, Update, Status Change, dan Delete belum melalui Next.js Server Actions dengan proteksi otorisasi (`requireManage("/claims")`) dan validasi Zod.

Perubahan ini menyambungkan UI Klaim ke PostgreSQL secara menyeluruh.

## Yang berubah

- **Server Component Prefetching (`app/(app)/claims/page.tsx`):**
  - Menerapkan otorisasi halaman `requireAccess("/claims")`.
  - Menjalankan auto-seeding idempoten `seedInitialClaimsIfEmpty()`.
  - Melakukan prefetch paralel data klaim (`listClaims()`) dan opsi form polis & adjuster aktif (`listClaimFormOptions()`) langsung dari PostgreSQL.
- **Server Actions Terproteksi (`app/(app)/claims/actions.ts`):**
  - Menyediakan Server Actions: `createClaimAction`, `updateClaimAction`, `updateClaimStatusAction`, dan `deleteClaimAction`.
  - Memproteksi mutasi dengan `requireManage("/claims")` (hanya role Admin, Teknik, dan Klaim yang dapat mengubah/menghapus klaim).
  - Validasi input ketat dengan Zod dan penanganan navigasi Next.js menggunakan `unstable_rethrow()`.
  - Memicu revalidasi cache App Router (`revalidatePath("/claims")`, `revalidatePath("/")`).
- **Penyempurnaan Data Layer (`lib/server/claims.ts`):**
  - Menambahkan generator nomor dokumen otomatis atomik via `nextDocumentNumber(tx, { code: "CLM" })` jika nomor klaim tidak diisi manual.
  - Menambahkan fungsi `listClaimFormOptions()` untuk mengambil daftar polis aktif (lengkap dengan leader insurer, COB, dan mata uang) serta adjuster aktif.
  - Resolusi adjuster otomatis jika diinput nama baru, dan pencatatan audit log lengkap (`recordAudit`).
  - Pembenihan otomatis 5 data klaim riil LCH yang berelasi langsung dengan nomor polis di database.
  - Nama COB dari database (mis. `PROPERTY`) dinormalisasi lewat `normalizeCob()` ke label UI (`Property`). Tanpa ini filter COB di tabel klaim tidak pernah cocok.
- **Form Klaim Dinamis (`components/claims/claim-form.tsx`):**
  - Integrasi opsi polis dinamis dari database PostgreSQL dengan kartu ringkasan polis (Tertanggung, Leader Insurer, COB, Mata Uang).
  - Mutasi form tersambung ke `createClaimAction` dan `updateClaimAction` dengan feedback toast Sonner dan state pending.
  - Setiap field input memiliki placeholder yang informatif sesuai panduan frontend.
  - Sinkronisasi instan ke store lokal untuk interoperabilitas modul downstream.
- **Tabel & Dashboard Klaim (`components/claims/claims-view.tsx`):**
  - Mengonsumsi `initialClaims` dan `formOptions` dari Server Component.
  - Tabel menggunakan lebar canonical `min-w-200`.
  - Aksi hapus klaim menggunakan dialog konfirmasi destruktif dan memanggil `deleteClaimAction`.
  - Export data Excel/CSV mencakup seluruh data klaim terbaru.
- **Kepatuhan Antislop & Frontend Review:**
  - Tanpa tipe `any` (100% strictly typed dengan TypeScript).
  - Bebas dari komentar banner dekoratif/box-drawing; komentar berupa 1 baris penjelasan intent teknis dalam bahasa Inggris.

## File utama

- `lib/server/claims.ts`: Penyempurnaan data layer klaim, penomoran otomatis CLM, dan relasi form options.
- `app/(app)/claims/actions.ts`: Next.js Server Actions untuk mutasi klaim dengan validasi Zod dan otorisasi RBAC.
- `app/(app)/claims/page.tsx`: Server component prefetcher dengan requireAccess dan parallel loading.
- `components/claims/claim-form.tsx`: Slide-over form pencatatan dan pengeditan klaim tersambung Server Actions.
- `components/claims/claims-view.tsx`: Tampilan tabel dan metrik ringkasan klaim tersambung PostgreSQL.
- `scripts/verify-claims.ts`: Script uji integrasi mandiri untuk Create, Update, Update Status, Delete, dan Audit Log.
- `docs/changes/sambung-ui-klaim-postgres-2026-10-22.md`: Catatan perubahan dokumentasi.

## Dampak

- **Database:** Memanfaatkan tabel `claims`, relasi foreign key `policies` dan `adjusters`, serta pencatatan audit di `audit_logs`.
- **Env:** Tidak ada variabel baru.
- **Deploy:** Tidak ada langkah khusus selain migrasi database yang sudah diterapkan sebelumnya.

## Verifikasi

1. **Uji Tipe TypeScript:**
   - Perintah: `npx tsc --noEmit`
   - Hasil: `TypeScript: No errors found` (0 kesalahan).
2. **Uji Next.js Production Build:**
   - Perintah: `npm run build`
   - Hasil: Sukses terkompilasi, termasuk rute `/claims`.
3. **Uji Integrasi End-to-End Database:**
   - Perintah: `npx tsx --env-file=.env --conditions=react-server scripts/verify-claims.ts`
   - Hasil:
     - Auto sequence number `0003/CLM/10/2026` terbentuk dengan benar.
     - Audit log Create tercatat di tabel `audit_logs`.
     - Update klaim dan update status "Settled" terverifikasi.
     - Delete klaim dan audit log Delete terverifikasi.
     - Seluruh tes lulus (`ALL CLAIMS TESTS PASSED`).
4. **Lint:** `npx eslint lib/server/claims.ts "app/(app)/claims" components/claims scripts/verify-claims.ts` bersih (0 error, 0 warning). `useEffect` reset state di form dihapus karena form sudah di-remount lewat `key`.
5. **Uji browser (admin, `/claims`):**
   - 5 klaim seed tampil, kolom COB berisi label UI (`Property`, `Engineering`, `Motor Vehicle`, `Marine Cargo`).
   - Catat klaim baru: kartu ringkasan polis muncul, toast "Klaim berhasil dicatat" dengan nomor otomatis `0004/CLM/10/2026`, data tetap ada setelah reload.
   - Edit lokasi: toast "Klaim berhasil diperbarui".
   - Hapus: dialog konfirmasi muncul, toast sukses, setelah reload tersisa 5 klaim.

## Catatan untuk yang melanjutkan

- Modul klaim sudah terhubung penuh ke PostgreSQL dan siap digunakan secara operasional.
- Modul berikutnya yang dapat dimigrasikan adalah modul SPPA atau modul Finance (Penerimaan & Pembayaran Premi).
