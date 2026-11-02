# Desain baru halaman login

- **Tanggal:** 2026-11-02
- **Branch:** `feat/desain-halaman-login`
- **PR:** [#67](https://github.com/agussusanto17/lch-ins/pull/67)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus menilai halaman login terlalu polos: kartu putih di latar abu-abu, logo
kecil, dan tidak ada identitas LCH. Dia minta desain yang lebih berkesan.

## Yang berubah

- **Dua kolom di desktop.** Kiri panel merek, kanan form. Di layar di bawah
  1024px panel merek menjadi pita di atas form.
- **Panel merek memakai warna logo LCH.**
  - Latar indigo #29166E, dengan gradien satu warna yang terang di kiri atas
    tempat logo berada.
  - Judul "Sistem Back Office" 72px; kata "Back Office" berwarna emas logo
    #F7C303 sebagai satu-satunya aksen.
  - Simbol simpul logo jadi motif besar di belakang, putih 7%.
  - Simbol logo tampil di ubin putih bersama nama perusahaan dan nomor
    SKOJK yang tertulis di logo.
- **Motif simpul** memakai `public/images/logo-lch-mark-mono.svg`, hasil
  penelusuran bentuk simbol asli (`logo-lch-mark.png`) menjadi SVG satu warna.
  PNG aslinya hanya 256px dan berlatar putih, jadi tidak bisa dipakai besar di
  atas indigo. Bentuknya tidak diubah.
- **Form:**
  - input dan tombol Masuk setinggi 44px, batas minimum target sentuh;
  - ukuran huruf tombol sama dengan input (16px di ponsel, 14px dari md);
  - tombol tampilkan kata sandi punya area klik 44px dan tanda fokus keyboard;
  - pesan galat 14px.
- **Teks baru di bawah judul form:** "Akun dibuat oleh Admin LCH. Login pertama
  wajib mengganti kata sandi." Isinya sesuai perilaku aplikasi (SIT-004).
- **Judul tab** menjadi "Masuk | LCH Insurance Brokers". Judul lama memakai em
  dash, yang dilarang aturan antislop R-02.

## File utama

- `app/login/page.tsx`: tata letak dan panel merek.
- `components/auth/login-form.tsx`: ukuran kontrol, tombol kata sandi, pesan
  galat.
- `public/images/logo-lch-mark-mono.svg` (baru): simbol LCH satu warna untuk
  motif.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `npm run build`, dan `npx eslint` pada file yang diubah:
  lolos.
- Cek di localhost tanpa login:
  - Desktop 1440px, terang dan gelap: panel indigo tetap, kolom form mengikuti
    tema.
  - Tablet 768px dan ponsel 375px: panel menjadi pita di atas form. Overflow
    horizontal 0px.
  - Email, kata sandi, tombol tampilkan kata sandi, dan Masuk semuanya 44px.
  - Urutan Tab: email, kata sandi, tampilkan kata sandi, Masuk. Tanda fokus
    terlihat.
  - Konsol browser tanpa error.
- Kontras: putih di indigo 14,6:1; putih 75% 8,7:1; emas 8,9:1.
- Login sungguhan dan pesan galat tidak dicoba di browser, karena perlu
  mengetik kredensial. Logika login tidak berubah.

## Catatan untuk yang melanjutkan

- Judul tab halaman lain masih memakai em dash, misalnya
  "Klasifikasi OJK — LCH Insurance Brokers". Bila disetujui, samakan dengan
  pemisah "|" seperti halaman login.
- Di ponsel, input bawaan 16px sedangkan tombol 14px. Halaman login sudah
  disamakan; halaman lain belum.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
