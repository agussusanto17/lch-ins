# Autentikasi dengan Better Auth, sesi disimpan di database

- **Tanggal:** 2026-10-19
- **Branch:** `feat/autentikasi`
- **PR:** #13
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Autentikasi adalah isi utama minggu 1 pada rencana kerja. Sebelum ini aplikasi
tidak punya login sama sekali: seluruh halaman, termasuk demo di
lch-ins.vercel.app, terbuka untuk siapa pun yang tahu alamatnya.

Tiga pendekatan dibandingkan lebih dulu: sesi disimpan di database, sesi
disimpan di dalam cookie, dan memakai Auth.js. Adi memilih yang pertama dengan
Better Auth sebagai pustakanya. Alasan utamanya, sesi yang tersimpan di database
bisa dicabut dari sisi server, sehingga menonaktifkan pengguna langsung berlaku
dan tidak menunggu token kedaluwarsa. Itu penting untuk sistem yang punya audit
trail.

## Yang berubah

- **Halaman login di `/login`** dengan email dan kata sandi. Tidak ada
  pendaftaran mandiri dan tidak ada login lewat Google. Akun dibuat Admin.
- **Seluruh halaman aplikasi wajib login.** Pengguna yang belum masuk dilempar
  ke `/login`, dan tujuan awalnya disimpan supaya setelah login kembali ke sana.
- **Hak akses per role dibaca dari config kode** di `lib/access.ts`, sesuai
  kesepakatan bahwa tidak ada layar permission. Menu yang tidak boleh dibuka
  tidak ditampilkan di sidebar, dan permintaannya juga ditolak di server.
- **Status aktif pengguna diperiksa di setiap permintaan**, bukan hanya saat
  login. Menonaktifkan pengguna langsung memutus aksesnya.
- **Tombol Keluar berfungsi** dan benar-benar menghapus baris sesinya di
  database.
- **Seed membuat lima akun contoh**, satu per role, supaya sistem bisa dicoba
  sebelum LCH mengirim daftar pengguna sungguhan.

## File utama

- `lib/auth.ts`: konfigurasi Better Auth, termasuk umur sesi dan kolom tambahan.
- `lib/access.ts`: daftar hak akses per role dan fungsi `canAccess`.
- `lib/server/session.ts`: `currentUser`, `requireUser`, dan `requireAccess`.
  Ini lapisan yang menentukan, bukan proxy.
- `proxy.ts`: pemeriksaan optimistis dan penitipan path lewat header.
- `app/api/auth/[...all]/route.ts`: endpoint Better Auth.
- `app/login/page.tsx` dan `components/auth/login-form.tsx`: halaman masuk.
- `app/(app)/layout.tsx`: gerbang untuk seluruh halaman aplikasi.
- `prisma/seed.ts`: akun contoh beserta hash kata sandinya.

## Dampak

- **Database:** tiga tabel baru, `sessions`, `accounts`, dan `verifications`.
  Tabel `users` kehilangan kolom `password_hash`, karena Better Auth menyimpan
  kata sandi di `accounts.password`, dan mendapat kolom `email_verified` serta
  `image`. Migration `20261019105342_better_auth`.
- **Env:** dua variabel baru, `BETTER_AUTH_SECRET` dan `BETTER_AUTH_URL`.
  Keduanya sudah ditambahkan ke `.env.example`. Di Vercel, `BETTER_AUTH_URL`
  diisi domain produksi.
- **Deploy:** isi dulu kedua env di Vercel, lalu `npm run db:deploy` dan
  `npm run db:seed`. Tanpa env tersebut aplikasi gagal saat login. Setelah
  merge, sinkronkan fork `vourdev/lch-ins`.

## Verifikasi

`npx tsc --noEmit`, `npm run lint`, dan `npm run build` lolos. Diuji langsung di
browser dengan akun role Klaim:

- Membuka `/claims` tanpa login dialihkan ke `/login?next=%2Fclaims`.
- Setelah login, kembali ke `/claims` seperti tujuan awal.
- Sidebar hanya menampilkan Dashboard, Policy Database, Klaim, dan Report.
- Mengetik `/finance/notes` langsung di alamat dialihkan ke Dashboard.
- Tombol Keluar mengembalikan ke `/login`, dan tabel `sessions` kembali kosong.

## Catatan untuk yang melanjutkan

**Daftar hak akses di `lib/access.ts` masih tebakan.** LCH belum mengisi Sheet
Hak Akses karena menunggu meeting internal. Begitu isiannya masuk, cukup ubah
daftar itu.

**Sempat ada lubang yang luput.** Versi pertama hanya memanggil `requireUser` di
layout, sehingga role Klaim masih bisa membuka halaman Finance dengan mengetik
URL-nya; sidebar menyembunyikan menunya, tapi server tidak menolak. Ini ketahuan
saat uji manual. Perbaikannya: `proxy.ts` menitipkan path lewat header
`x-pathname`, lalu layout memanggil `requireAccess`. Header itu selalu ditimpa
di proxy, jadi tidak bisa dipalsukan dari klien. Pelajarannya, pemeriksaan di
proxy memang hanya optimistis seperti kata dokumen Next, dan penjagaan yang
sebenarnya harus sedekat mungkin dengan datanya.

**Akun contoh harus diganti sebelum dipakai LCH.** Kata sandinya tidak ditulis
di repo: isi `SEED_USER_PASSWORD` kalau mau menentukan sendiri, kalau kosong
seed membuat yang acak dan menampilkannya sekali. Karena demo di Vercel terbuka
untuk umum, ganti kata sandinya setelah seed produksi dijalankan.

**`npm install better-auth` gagal dengan galat `edgesOut`** pada npm 10.8.2 di
mesin ini. Dipasang dengan `--legacy-peer-deps`. Kalau Adi kena hal yang sama,
itu penyebabnya.

**Di Next 16 `middleware.ts` sudah diganti `proxy.ts`.** Berkasnya memakai
default export bernama `proxy` dan berjalan di runtime Node.js.

**Aturan Wajib nomor 4 belum dijalankan** untuk PR ini: graphify belum terpasang
di mesin ini, sama seperti PR #11 dan #12.
