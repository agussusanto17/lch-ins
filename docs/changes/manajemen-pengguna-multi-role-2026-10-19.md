# Manajemen Pengguna (CRUD), Otorisasi Multi-Role, Seeding Awal LCH, dan Verifikasi Better Auth

- **Tanggal:** 2026-10-19
- **Branch:** `feat/user-management`
- **PR:** #2 (https://github.com/vourdev/lch-ins/pull/2)
- **Dikerjakan oleh:** Antigravity dengan Claude Code

## Latar belakang

Modul Manajemen Pengguna di `/users` sebelumnya berstatus placeholder. Diperlukan modul manajemen akun produksi yang mendukung 6 peran kanonik LCH (`Admin`, `Marketing`, `Placement/Teknik`, `Klaim`, `Accounting`, `Finance`), kapabilitas multi-role per akun (karena staf seperti Harry Setiawan dan Aziz Surya merangkap Marketing & Placement), proteksi keamanan server-side (pencegahan eskalasi hak istimewa, proteksi last active administrator, pencegahan self-deactivation), alur wajib ganti kata sandi pada login pertama kali (`mustChangePassword: true`), serta seeding akun operasional dari lembar referensi LCH dengan penanganan terencana terhadap potensi konflik identitas email bersama.

## Yang berubah

- **Daftar Peran Kanonik Tunggal**: Menetapkan 6 peran resmi di `lib/access.ts` (`admin`, `marketing`, `placement`, `claim`, `accounting`, `finance`) sebagai satu-satunya sumber kebenaran (single source of truth) untuk UI dan server-side.
- **Dukungan Multi-Role PostgreSQL & Prisma**: Menambahkan kolom `roles TEXT[]` (`roles String[] @default([])` di Prisma) dengan migrasi `20261019120000_multi_role_user_management` yang aman tanpa kehilangan data dan melakukan backfill data role lama.
- **Halaman Manajemen Pengguna `/users`**:
  - Tabel interaktif daftar pengguna dengan pencarian teks (nama, email, jabatan) dan filter peran serta status akun.
  - Form dialog Tambah & Edit Pengguna dengan pemilihan multi-role melalui checkbox dan jabatan.
  - Dialog kredensial sekali lihat untuk kata sandi sementara yang aman dan copyable.
  - Aksi reset kata sandi mandiri oleh Admin yang mencabut seluruh sesi aktif pengguna dan mewajibkan ganti sandi pada login berikutnya.
  - Aksi aktifkan/nonaktifkan akun dengan proteksi terhadap akun sendiri dan pencegahan penonaktifan satu-satunya administrator aktif.
- **Alur Wajib Ganti Kata Sandi (`/change-password`)**:
  - Pemeriksaan server-side di `requireAccess(path)` mengunci pengguna dengan `mustChangePassword = true` agar tidak dapat membuka modul operasional sampai mengganti kata sandi.
  - Setelah kata sandi baru (minimal 10 karakter) disimpan, flag diubah ke `false` dan akses bisnis langsung terbuka.
- **Seeding Akun Operasional Idempoten**:
  - Unifikasi multi-role untuk staf yang merangkap fungsi: `harry@lch.co.id` (`SPV`, Marketing & Placement) dan `aziz@lch.co.id` (Marketing & Placement).
  - Seeding akun operasional: `claim@lch.co.id`, `sutejo@lch.co.id`, `tresna@lch.co.id`, `accounting@lch.co.id`, dan `finance02@lch.co.id`.
  - Deteksi dan dokumentasi konflik identitas email bersama pada lembar referensi (`adminfin@lch.co.id` dan `policyadmin@lch.co.id`) yang dilewati secara sadar dengan pesan log peringatan agar tidak terjadi account takeover.
  - Mempertahankan akun pengujian yang sudah ada (`admin@lch.example`, dll).

## File utama

- `lib/access.ts`: Matriks hak akses multi-role `canAccess(roles, path)`, konstanta `CANONICAL_ROLES`, dan validasi server `validateRoleCodes`.
- `lib/auth.ts`: Konfigurasi `additionalFields` Better Auth untuk menyertakan `roles`, `jobTitle`, dan `mustChangePassword`.
- `lib/server/session.ts`: Ekstraksi `roles`, validasi `mustChangePassword`, dan helper keamanan `requireAdmin()`.
- `lib/server/users.ts`: Fungsi CRUD server-side untuk user management, hashing kata sandi sementara, pencabutan sesi, dan invariant last active admin.
- `app/(app)/users/page.tsx` & `app/(app)/users/actions.ts`: Server Component halaman `/users` dan Server Actions untuk mutasi data pengguna.
- `components/users/user-table.tsx`, `components/users/user-form-dialog.tsx`, `components/users/user-role-badge.tsx`, `components/users/temporary-password-dialog.tsx`: Komponen UI manajemen pengguna.
- `app/(app)/change-password/page.tsx`, `app/(app)/change-password/actions.ts`, `components/auth/change-password-form.tsx`: Halaman dan alur penegakan ganti kata sandi pertama kali.
- `prisma/schema.prisma` & `prisma/migrations/20261019120000_multi_role_user_management/migration.sql`: Skema multi-role dan file migrasi database.
- `prisma/seed.ts`: Logika seeding idempoten akun operasional, unifikasi multi-role, dan deteksi konflik identitas.

## Dampak

- **Database:**
  - Migrasi `20261019120000_multi_role_user_management` menambahkan kolom `roles TEXT[]`, `job_title TEXT`, `must_change_password BOOLEAN` pada tabel `users`, membuat `role_id` nullable, dan menyisipkan `accounting` pada `lookup_values`.
  - Seeder menambahkan 7 akun operasional baru dan menyinkronkan 5 akun pengujian yang sudah ada.
- **Env:** Tidak ada variabel baru. Menggunakan `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, dan `DATABASE_URL` yang sudah terpasang.
- **Deploy:** Jalankan `npm run db:deploy` dan `npm run db:seed -- system` pada database target produksi.

## Verifikasi

- `npx tsc --noEmit`: Lolos tanpa error TypeScript (0 errors).
- `npm run build`: Lolos kompilasi Next.js 16 App Router dengan Turbopack untuk seluruh rute statis dan dinamis.
- `npm run db:seed -- system`: Lolos idempoten (eksekusi kedua menghasilkan 0 baru, 12 diperbarui tanpa constraint error).
- **E2E Browser Testing via `ego-browser`**:
  - Login Admin berhasil dan mengakses `/users`.
  - Tabel menampilkan seluruh akun yang di-seed beserta badge multi-role dan status wajib ganti sandi.
  - Filter pencarian teks dan filter peran bekerja menyaring baris secara akurat.
  - Dialog "Tambah Pengguna" dengan multi-role (`Marketing` & `Klaim`) berhasil membuat pengguna baru dan menampilkan kredensial sementara.
  - Dialog "Reset Kata Sandi" pada pengguna berhasil membuat kata sandi sementara baru dan mencabut sesi lama.
  - Login dengan akun `mustChangePassword: true` (`sutejo@lch.co.id`) langsung dikunci dan diarahkan ke `/change-password`; percobaan bypass navigasi ke rute operasional langsung diblokir.
  - Pengisian form ganti kata sandi berhasil menyimpan hash baru, menonaktifkan flag `mustChangePassword`, dan mengarahkan pengguna ke dashboard.
  - Akses modul sesuai role (`/claims`) terbuka untuk staf klaim, sementara akses ke modul terbatas (`/users`) diblokir dan dikembalikan ke `/`.

## Catatan untuk yang melanjutkan

- Rute `/change-password` secara eksplisit dikecualikan dari pemblokiran matriks peran di `canAccess` dan `requireAccess`, sehingga pengguna dengan peran apa pun yang sedang dalam status `mustChangePassword: true` dapat mengakses form penggantian kata sandi tanpa mengalami redirect loop.
- Jika di masa mendatang LCH memberikan email terpisah untuk akun yang sempat konflik (`adminfin@lch.co.id` dan `policyadmin@lch.co.id`), akun-akun tersebut dapat ditambahkan langsung oleh Admin melalui antarmuka `/users`.
