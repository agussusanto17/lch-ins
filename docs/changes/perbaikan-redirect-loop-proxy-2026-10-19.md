# Perbaikan Infinite Redirect Loop pada Proxy dan Halaman Login

- **Tanggal:** 2026-10-19
- **Branch:** `fix/proxy-redirect-loop`
- **PR:** (belum dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Pada implementasi awal autentikasi Better Auth di `proxy.ts`, terdapat aturan optimistis:
```typescript
if (hasSessionCookie && isPublic) {
  return NextResponse.redirect(new URL("/", req.nextUrl))
}
```
Aturan ini berasumsi bahwa keberadaan cookie `better-auth.session_token` otomatis berarti pengguna sudah memiliki sesi yang sah.

Namun, ketika cookie sesi yang tersimpan di peramban pengguna berstatus tidak valid, kedaluwarsa (expired), atau sesinya telah dihapus/dinonaktifkan di database:
1. Pengguna membuka `/login` (atau diarahkan ke `/login` oleh layout server).
2. `proxy.ts` mendeteksi adanya cookie sesi dan mengira pengguna sudah login, lalu me-redirect balik ke `/`.
3. Pada rute `/`, Server Component layout (`app/(app)/layout.tsx`) memvalidasi sesi ke database via `currentUser()`. Karena token tidak valid di database, server mengembalikan respon redirect kembali ke `/login`.
4. Permintaan ke `/login` kembali ditangkap oleh `proxy.ts` dan di-redirect ke `/`, memicu loop tak berujung (`net::ERR_TOO_MANY_REDIRECTS`). Pengguna terkunci permanen dan tidak dapat melihat form login sampai cookie dibersihkan manual.

## Yang berubah

- Menghapus pengecekan redirect dari rute publik (`/login`) ke `/` di `proxy.ts`. `proxy.ts` tetap hanya melakukan pengecekan cepat tanpa menyentuh database untuk mencegah akses unauthenticated ke rute privat.
- Memindahkan pemeriksaan status login pengguna saat mengunjungi `/login` ke Server Component `LoginPage` (`app/login/page.tsx`). Pada halaman ini, `currentUser()` dipanggil untuk memeriksa keabsahan sesi secara nyata terhadap database:
  - Jika sesi sah dan aktif di database: pengguna diarahkan ke tujuan (`next` target atau `/`).
  - Jika sesi tidak sah / kedaluwarsa: form login tetap dirender tanpa me-redirect, memutus infinite loop dan memungkinkan pengguna masuk kembali.
- Menambahkan penerusan parameter `next` pada `requireUser(path)` di `lib/server/session.ts` saat sesi kedaluwarsa di tengah navigasi, sehingga pengguna yang login kembali akan otomatis dikembalikan ke halaman yang sedang dibukanya.
- Memperbaiki tipe export `metadata: Metadata` pada `app/login/page.tsx`.

## File utama

- `proxy.ts`: menghapus redirect dari rute publik ke root berdasarkan keberadaan cookie mentah.
- `app/login/page.tsx`: menambahkan validasi sesi aktif di database sebelum merender form login atau me-redirect ke dashboard.
- `lib/server/session.ts`: menambahkan parameter `path` pada `requireUser` untuk menyimpan rute awal saat redirect ke `/login`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` lolos tanpa kesalahan.
- `npm run build` lolos.
- Pengujian E2E browser (ego-browser):
  1. Pengujian dengan cookie stale / invalid yang sengaja di-inject: browser membuka `/login` dan merender form login tanpa terjadi `ERR_TOO_MANY_REDIRECTS`.
  2. Pengujian login berhasil dengan akun `admin@lch.example`.
  3. Pengujian navigasi dan proteksi sesi setelah login.

## Catatan untuk yang melanjutkan

- Pengecekan di `proxy.ts` harus selalu dipertahankan sebagai pengecekan permisif/optimistis murni. Jangan pernah menambahkan asumsi validitas token di proxy kecuali token tersebut adalah self-contained JWT yang diverifikasi tanda tangannya secara kriptografis tanpa DB. Karena Better Auth di project ini menggunakan database-backed session token, verifikasi harus tetap di Server Components (`lib/server/session.ts`).
