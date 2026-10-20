# Dialog Wajib Ganti Kata Sandi Non-Closable, Penjagaan Routing, dan User Menu Avatar

- **Tanggal:** 2026-10-20
- **Branch:** `fix/auth-policy-back-nav-user-menu`
- **Dikerjakan oleh:** Antigravity

## Latar belakang

Pengguna baru atau akun dengan kewajiban ganti kata sandi awal (`mustChangePassword: true`) memerlukan pengamanan ketat:
1. Akses menu harus dikunci total sebelum pengguna mengganti kata sandi. Mekanisme sebelumnya menampilkan halaman biasa yang pada navigasi client-side tertentu berpotensi di-bypass karena Next.js App Router layout persistence.
2. Mekanisme ganti kata sandi wajib berbentuk modal Dialog dengan aksi *closable* dinonaktifkan (tanpa tombol tutup X, klik luar/backdrop dicegah, tombol Escape dicegah) sehingga pengguna tidak dapat berinteraksi dengan menu apa pun di belakangnya.
3. Seluruh rute (termasuk direct URL, client navigation, print slip/quotation, dan server actions) harus memiliki penjagaan server (*routing guards*) tanpa celah kebocoran data.
4. Perilaku navigasi *Back* browser setelah login atau setelah logout harus aman dari celah BFCache (Back-Forward Cache).
5. Avatar pengguna di topbar sebelumnya masih berupa placeholder statis ("AS") tanpa dropdown menu informasi identitas (nama, email, badges semua peran) dan aksi keluar (*logout*).

## Yang berubah

1. **Komponen Dialog Wajib Ganti Kata Sandi (`MandatoryPasswordDialog`) & Desain Enterprise:**
   - Dibuat komponen modal di `components/auth/mandatory-password-dialog.tsx` berbasis `@base-ui/react/dialog`.
   - Action *closable* dinonaktifkan:
     - `showCloseButton={false}`: tombol X di sudut modal dihilangkan.
     - `disablePointerDismissal={true}` dan `onOpenChange={() => {}}`: klik di luar modal / pada backdrop tidak menutup dialog.
     - Penanganan event `onKeyDown` menelan tombol `Escape` (`e.preventDefault()`, `e.stopPropagation()`).
     - Backdrop modal berposisi `fixed inset-0 z-50` menggunakan overlay abu-abu netral transparan (`bg-neutral-950/45 dark:bg-black/60`) **tanpa backdrop blur** (`blur={false}`), sehingga dashboard dan sidebar di belakang tetap tampak jelas namun non-aktif dan menangkap seluruh pointer event.
   - **Desain Enterprise yang Restrained:**
     - Mengikuti design system LCH: `sm:max-w-[480px]`, `rounded-xl` (~11.2px), border halus, bayangan restrained, background popover standar tanpa glassmorphism atau efek dekoratif berlebih.
     - Hirarki konten bersih:
       1. Label konteks keamanan: Icon `ShieldCheck` + teks "Keamanan Akun".
       2. Heading utama: "Buat kata sandi baru".
       3. Satu penjelasan ringkas yang mengidentifikasi email akun pengguna asli tanpa repetisi banner peringatan.
       4. Input kata sandi saat ini dengan toggle visibilitas.
       5. Input kata sandi baru (minimal 10 karakter) dengan toggle visibilitas.
       6. Input konfirmasi kata sandi baru dengan toggle visibilitas.
       7. Pesan validasi / error server inline.
       8. Aksi utama: Tombol "Simpan kata sandi baru".
       9. Aksi sekunder: Tombol "Logout" (varian ghost).

2. **Pelestarian Layout Dashboard & Navigasi Sidebar Role-Based:**
   - Menghapus sidebar satu menu `Wajib Tindakan (Ganti password)`. Sidebar `components/layout/app-sidebar.tsx` kini selalu merender daftar menu operasional lengkap yang disaring sesuai peran aktual pengguna (`userRoles`).
   - Pada `app/(app)/change-password/page.tsx`, halaman merender `<DashboardView />` normal sebagai visual background di balik modal, sehingga pengguna melihat konteks aplikasi resmi tanpa dapat berinteraksi sampai kata sandi diganti.
   - Breadcrumb pada `app/(app)/change-password` dinormalisasi ke "Dashboard" statis.
   - Komponen `components/ui/dialog.tsx` diperbarui untuk mendukung prop `blur?: boolean` dan `overlayClassName?: string` pada `DialogOverlay` dan `DialogContent`.

3. **Penjagaan Routing Ketat di Sisi Server:**
   - **App Template (`app/(app)/template.tsx`):** Dibuat template server component yang dieksekusi pada *setiap* navigasi (termasuk navigasi *client-side* antar child route yang mempertahankan layout). Memanggil `requireAccess(pathname)` untuk memverifikasi hak akses dan memblokir pengguna `mustChangePassword: true` agar selalu diarahkan ke `/change-password`.
   - **Print Layout Guard (`app/(print)/layout.tsx`):** Menambahkan verifikasi autentikasi dan otorisasi menggunakan `requireAccess(pathname)` agar dokumen cetak (seperti `/underwriting/slip/...`) tidak dapat dibuka oleh pengguna yang belum login atau yang belum mengganti kata sandi.
   - **Server Actions & Data Guard (`lib/server/session.ts`):** Menambahkan `assertPasswordChanged(user)` dan mengintegrasikannya ke `requireAdmin` serta Server Actions mutasi data (misal `saveClauseAction`, `deleteClauseAction`).

4. **Penyelesaian Alur Sukses Ganti Kata Sandi:**
   - Server action `changePasswordAction` memperbarui kata sandi, mengubah `mustChangePassword` menjadi `false` dalam transaksi Prisma, me-revalidasi layout (`revalidatePath("/", "layout")`), dan mengembalikan `{ success: true }`.
   - Komponen form memicu `window.location.replace("/")` saat sukses, menutup modal dialog dan membuka akses dashboard secara otomatis tanpa redirect loop.

5. **Penanganan Back-Navigation & BFCache:**
   - Di `components/auth/login-form.tsx`, navigasi pasca-login menggunakan `window.location.replace(target)` alih-alih `push` agar halaman `/login` digantikan dari riwayat browser.
   - Menambahkan event listener `pageshow` (`event.persisted`) dan verifikasi sesi client-side via `authClient.getSession()`. Jika pengguna kembali ke `/login` saat sesi masih valid, browser langsung mengarahkannya kembali ke dashboard atau `/change-password`.
   - Di `app/login/page.tsx`, halaman dipaksa dinamis (`export const dynamic = "force-dynamic"`, `await connection()`) dan server-side redirect memantulkan pengguna yang sudah terautentikasi ke dashboard.

6. **Dropdown Menu Avatar Pengguna di Topbar:**
   - Di `components/layout/app-topbar.tsx`, avatar menampilkan inisial dinamis dari nama pengguna (`getInitials`) dan nama lengkap.
   - Mengintegrasikan `DropdownMenu` yang menampilkan:
     - Header profil dengan avatar inisial, nama lengkap, dan email pengguna.
     - Daftar badge peran pengguna berdasarkan semua peran yang dimiliki (`user.roles`), dipetakan dengan label ramah pengguna (`ROLE_LABELS`).
     - Aksi `Keluar` (destructive) yang memanggil `signOut()` dan me-replace halaman ke `/login`.

## File utama

- [components/auth/mandatory-password-dialog.tsx](components/auth/mandatory-password-dialog.tsx): Komponen modal dialog non-closable wajib ganti kata sandi.
- [app/(app)/template.tsx](app/(app)/template.tsx): Guard navigasi client-side di server yang mengevaluasi `requireAccess` pada setiap perpindahan rute.
- [app/(app)/layout.tsx](app/(app)/layout.tsx): Render `MandatoryPasswordDialog` jika `user.mustChangePassword: true`, serta meneruskan data pengguna ke sidebar dan topbar.
- [app/(print)/layout.tsx](app/(print)/layout.tsx): Guard autentikasi dan kewajiban ganti sandi pada rute cetak dokumen.
- [lib/server/session.ts](lib/server/session.ts): Server guard `requireAccess`, `requireAdmin`, dan fungsi `assertPasswordChanged`.
- [components/layout/app-sidebar.tsx](components/layout/app-sidebar.tsx): Penyaringan menu operasional saat wajib ganti kata sandi.
- [components/layout/app-topbar.tsx](components/layout/app-topbar.tsx): Avatar dinamis dan dropdown menu identitas pengguna (nama, email, badges semua role, aksi logout).
- [components/auth/login-form.tsx](components/auth/login-form.tsx): Pencegahan BFCache dan back navigation dengan `window.location.replace` dan `pageshow` revalidation.
- [app/login/page.tsx](app/login/page.tsx): Dynamic force rendering dan redirect pengguna berautentikasi.
- [app/(app)/change-password/page.tsx](app/(app)/change-password/page.tsx): Placeholder tampilan latar belakang yang bersih saat modal aktif.
- [components/auth/change-password-form.tsx](components/auth/change-password-form.tsx): Penanganan sukses submit ganti kata sandi dan pengalihan ke dashboard.

## Dampak

- **Database:** Tidak ada perubahan skema Prisma. Menggunakan kolom `mustChangePassword` dan relasi peran yang sudah ada.
- **Env:** Tidak ada variabel lingkungan baru.
- **Deploy:** Tidak ada langkah deploy khusus.

## Verifikasi

- **Verifikasi Browser (`ego-browser`):**
  - **Uji Modal Non-Closable & Overlay:**
    - Modal tampil otomatis di tengah layar dengan overlay abu-abu transparan netral (`bg-neutral-950/45 dark:bg-black/60`) **tanpa blur** (`backdropFilter: none`).
    - Dashboard dan sidebar role-based di belakang modal tetap tampak jelas dan terbaca namun non-aktif.
    - Tombol X tidak ada (`showCloseButton: false`).
    - Menekan tombol Escape tidak menutup modal (`dialogExists: true`).
    - Mengklik area luar/backdrop tidak menutup modal (`dialogExists: true`).
    - Pointer events ke menu di belakangnya terhalang oleh `dialog-overlay` (z-50).
  - **Uji Sidebar & Role-Based Navigation di Balik Modal:**
    - Diuji dengan akun Harry Setiawan (`roles: ["spv_marketing", "placement"]`): sidebar menampilkan Ringkasan (Dashboard), Operasional (Marketing, Underwriting, Policy Database, Klaim), Referensi & Laporan. Tidak ada menu `Wajib Tindakan`.
    - Diuji dengan akun Dewi Lestari (`roles: ["claim", "finance"]`): sidebar menampilkan Ringkasan (Dashboard), Operasional (Policy Database, Klaim), Finance (Debit & Credit Note, Pembayaran, Piutang & Hutang), Akuntansi (Jurnal, Laporan Keuangan), Referensi & Laporan. Tidak ada menu Marketing.
  - **Uji Dimensi & Responsivitas Mobile (375x667):**
    - Modal pada desktop berukuran lebar 480px, border-radius 11.2px (rounded-xl), padding 28px.
    - Pada viewport mobile 375x667 (diuji via CDP Emulation): modal berukuran lebar 343px, margin horizontal 16px, `fitsHorizontally: true`, `fitsVertically: true` tanpa clipping atau overflow.
  - **Uji Routing Guards:**
    - Navigasi langsung ke `/` -> dialihkan ke `/change-password` dengan modal aktif.
    - Navigasi langsung ke `/policies` -> dialihkan ke `/change-password` dengan modal aktif.
    - Navigasi langsung ke `/claims` -> dialihkan ke `/change-password` dengan modal aktif.
    - Navigasi langsung ke `/underwriting/slip/SLIP-001` -> dialihkan ke `/change-password` dengan modal aktif.
    - Navigasi langsung ke `/marketing` -> dialihkan ke `/change-password` dengan modal aktif.
    - Navigasi langsung ke `/users` -> dialihkan ke `/change-password` dengan modal aktif.
  - **Uji Form & Ganti Sandi Sukses:**
    - Input kata sandi salah menghasilkan pesan error inline "Kata sandi saat ini salah." tanpa menutup modal.
    - Input kata sandi valid berhasil memperbarui database (`mustChangePassword: false`).
    - Otomatis dialihkan ke dashboard `/`. Modal tertutup dan seluruh modul operasional pengguna terbuka.
  - **Uji Logout dalam Modal & Dropdown Avatar:**
    - Tombol "Logout" pada bagian bawah modal berhasil melakukan sign out dan mengarahkan ke `/login`.
    - Mengklik avatar di topbar membuka dropdown menu dengan inisial profil, nama lengkap, email, dan badges role.
    - Mengakses rute terproteksi setelah logout langsung diarahkan ke `/login`.
- **Static & Build Checks:**
  - `npx tsc --noEmit` lolos tanpa error.
  - `npm run build` lolos tanpa error dengan Turbopack (69 rute teroptimasi).

## Catatan untuk yang melanjutkan

- Komponen `MandatoryPasswordDialog` memanfaatkan `@base-ui/react/dialog` dengan `open={true}`, `onOpenChange={() => {}}`, dan `disablePointerDismissal={true}`. Jangan mengubah properti ini menjadi uncontrolled jika ingin menjaga sifat non-closable modal.
- `app/(app)/template.tsx` bertindak sebagai guard per navigasi client-side di server. Jika menambahkan layout group baru di masa mendatang, pastikan memasang guard server yang setara.
