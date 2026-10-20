# Perbaikan Blank White Screen saat Navigasi Pertama ke /change-password

- **Tanggal:** 2026-10-20
- **Branch:** `fix/blank-change-password`
- **PR:** #5
- **Dikerjakan oleh:** Antigravity

## Latar belakang

Pengguna dengan status pergantian kata sandi wajib (`mustChangePassword: true`), seperti akun operasional yang baru dibuat atau di-reset (`harry@lch.co.id`, `aziz@lch.co.id`, `accounting@lch.co.id`, dll.), mengalami layar putih kosong (*blank white screen*) / loop *rendering* saat pertama kali diarahkan ke `/change-password` setelah login. Halaman baru muncul normal jika pengguna me-refresh peramban secara manual.

Pemeriksaan CDP dan Flight protocol Next.js 16 App Router menemukan akar masalah:
1. Di `components/auth/login-form.tsx`, setelah `signIn.email` berhasil, kode memanggil `router.push(safeNext)` (di mana `safeNext` bernilai `/`) diikuti langsung oleh `router.refresh()`.
2. Saat navigasi ke `/`, layout server `app/(app)/layout.tsx` mengeksekusi pemeriksaan sesi `requireAccess("/")`. Karena `user.mustChangePassword === true`, server melempar `redirect("/change-password")` berupa respons RSC stream `NEXT_REDIRECT;replace;/change-password;307;`.
3. Pemanggilan `router.refresh()` yang terjadi bersamaan dengan `router.push("/")` dan server-side redirect RSC antar route group (`(app)`) memicu desinkronisasi internal pada Next.js client router (`next-router-state-tree` dan `React.useTransition`), menyebabkan layout anak tidak ter-mount ke DOM (`<div hidden=""></div>`).
4. Di `app/login/page.tsx`, pengguna yang sudah login dengan `mustChangePassword: true` juga diarahkan ke `target` default (`/`) alih-alih langsung ke `/change-password`.

## Yang berubah

- **Navigasi Langsung ke `/change-password` Pasca Login:** Pada `components/auth/login-form.tsx`, properti `mustChangePassword` dibaca langsung dari data respons `signIn.email`. Jika bernilai `true`, router langsung melakukan `router.push("/change-password")` tanpa melewati rute `/`, sehingga meniadakan rediredt server-side antar route group yang memicu desinkronisasi.
- **Pembersihan `router.refresh()` Berlebih:** Menghapus `router.refresh()` simultan di form login yang bertabrakan dengan transisi RSC router.
- **Guard Sesi Aktif di Halaman Login:** Pada `app/login/page.tsx`, jika pengguna yang mengakses `/login` sudah memiliki sesi aktif dengan `mustChangePassword: true`, server langsung mengarahkan ke `/change-password`.

## File utama

- [components/auth/login-form.tsx](components/auth/login-form.tsx): Membaca flag `mustChangePassword` dari respons autentikasi, mengarahkan langsung ke `/change-password`, dan menghapus `router.refresh()`.
- [app/login/page.tsx](app/login/page.tsx): Mengarahkan sesi aktif berstatus `mustChangePassword: true` langsung ke `/change-password`.

## Dampak

- **Database:** Tidak ada perubahan skema atau migrasi baru. Status `mustChangePassword` dan multi-role tetap dipertahankan.
- **Env:** Tidak ada variabel lingkungan baru.
- **Deploy:** Tidak ada langkah deploy khusus.

## Verifikasi

- **Automated Browser Verification (`ego-browser nodejs`):**
  - Menguji 14 skenario pengujian dengan CDP, network tracking, dan DOM snapshot.
  - Skenario 1-3: Login akun `harry@lch.co.id` langsung merender formulir "Setel Kata Sandi Baru" tanpa blank screen dan tanpa reload manual.
  - Skenario 4: Tidak ada *repeated request* RSC Flight protocol (hanya 1 request RSC yang tercatat).
  - Skenario 5: 0 pesan error konsol/runtime.
  - Skenario 6-7: Validasi formulir menolak kata sandi salah, konfirmasi tidak cocok, dan kata sandi < 10 karakter; aplikasi tetap terkunci di `/change-password`.
  - Skenario 8-10: Pergantian kata sandi berhasil memperbarui database (`mustChangePassword: false`) dan me-redirect ke dashboard `/` tanpa loop.
  - Skenario 11: Akses langsung ke `/change-password` setelah flag `false` memantul kembali ke `/`.
  - Skenario 12: Pengguna tanpa autentikasi diarahkan ke `/login?next=%2Fchange-password`.
  - Skenario 13: Navigasi langsung ke `/marketing` dan `/underwriting` saat `mustChangePassword: true` dialihkan kembali ke `/change-password`.
  - Skenario 14: Refresh halaman dashboard setelah ganti sandi tetap konsisten.
  - Akun operasional lainnya (`aziz@lch.co.id`, `accounting@lch.co.id`, `finance02@lch.co.id`, `claim@lch.co.id`, `tresna@lch.co.id`) diverifikasi berhasil langsung masuk ke `/change-password` pada navigasi pertama.
- **Static & Build Checks:**
  - `npx tsc --noEmit` lolos tanpa error.
  - `npm run build` lolos tanpa error dengan Turbopack.

## Catatan untuk yang melanjutkan

- Flag `mustChangePassword` tersedia di sisi klien pada objek `data.user` saat `signIn.email` berhasil, karena sudah dikonfigurasi sebagai `additionalFields` pada skema Better Auth (`lib/auth.ts`).
- Penegakan otorisasi sisi server di `lib/server/session.ts` (`requireAccess`) dan `(app)/change-password/page.tsx` tetap menjadi sumber otoritas mutlak (*source of truth*) untuk mencegah pengabaian pergantian kata sandi melalui modifikasi klien.
