# Akses produksi lewat IP `https://103.150.116.66`

- **Tanggal:** 2026-11-08
- **Branch:** `chore/akses-ip-lch-server`
- **PR:** #173
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Produksi di lch-server sebelumnya hanya bisa dibuka lewat
`https://lch-ins.adhinugroho.tech` (lihat `pindah-vps-lch-server-2026-11-07.md`).
Diminta supaya aplikasi juga bisa dibuka langsung lewat IP server.

Akses IP dibuat lewat HTTPS, bukan HTTP polos. Ada dua alasan:

- `BETTER_AUTH_URL` memakai `https://`, jadi cookie sesi bertanda `Secure`
  (`__Secure-better-auth.session_token`). Browser tidak menyimpan cookie itu di
  `http://`, sehingga login lewat HTTP pasti gagal.
- Kata sandi dan berkas KYC tidak boleh lewat jalur tanpa enkripsi.

## Yang berubah

Semua perubahan ada di server. Tidak ada perubahan kode aplikasi.

- **Sertifikat IP Let's Encrypt** untuk `103.150.116.66`.
  - Memakai profil `shortlived`, yang berlaku 6 hari.
  - Validasi lewat webroot `/var/www/certbot`.
  - Setiap perpanjangan me-reload nginx lewat `renew_hook = systemctl reload nginx`.
- **Certbot apt (1.21) diganti certbot snap (5.9).** Versi apt belum mendukung
  `--ip-address`.
  - Sertifikat domain tetap diperpanjang lewat plugin nginx.
  - Kedua sertifikat kini diurus `snap.certbot.renew.timer`, menggantikan
    `certbot.timer`.
- **Blok nginx baru** `/etc/nginx/sites-available/lch-ins-ip`, di-link ke `sites-enabled`.
  - Port 80: melayani ACME challenge, selebihnya redirect 301 ke `https://103.150.116.66`.
  - Port 443: proxy ke `127.0.0.1:3000`, sama seperti blok domain.
  - Kedua blok bertanda `default_server`. Browser tidak mengirim SNI untuk alamat
    IP, jadi tanpa tanda itu nginx menyajikan sertifikat domain dan browser
    menolaknya.
  - Request ke domain tetap masuk blok `lch-ins` lewat SNI dan `server_name`.
- **Env app:** `BETTER_AUTH_TRUSTED_ORIGINS=https://103.150.116.66` ditambahkan
  di `repo/.env`.
  - Tanpa env ini, sign-in lewat IP ditolak `403 INVALID_ORIGIN`.
  - Better Auth membaca env ini langsung, jadi kode tidak perlu diubah.

## Dampak

- **Database:** tidak ada.
- **Env:** ada `BETTER_AUTH_TRUSTED_ORIGINS` baru di `repo/.env` server.
  - `BETTER_AUTH_URL` tetap domain.
  - Env ini tidak dipakai di Vercel.
- **Deploy:** alur tidak berubah. `deploy.sh` tidak menyentuh `.env` karena file
  itu tidak ada di git.
- **Sesi:** cookie sesi terikat ke host masing-masing. Login di domain tidak
  berlaku di IP, dan sebaliknya.

## Verifikasi

- `https://103.150.116.66/login` 200, sertifikat valid (SAN `IP Address:103.150.116.66`).
- `http://103.150.116.66/login` redirect 301 ke HTTPS.
- Domain tetap 200 dengan sertifikatnya sendiri. `http://` domain tetap 301.
- Login `admin@lch.example` lewat IP 200, cookie `__Secure-` tersimpan.
  - Halaman `/`, `/policies`, `/claims` 200, logout 200.
- Login lewat domain tetap 200.
- Sign-in dengan `Origin` asing tetap 403.
- `certbot renew --dry-run` lolos untuk sertifikat domain maupun IP.
- Backup sebelum perubahan ada di `/data/workspace/app/backups/`:
  - `letsencrypt-nginx-20261108-102222.tgz`
  - `env-20261108-102222.bak`

## Catatan untuk yang melanjutkan

- Sertifikat IP hanya berlaku 6 hari, jadi perpanjangan otomatis wajib jalan.
  - Cek dengan `systemctl list-timers snap.certbot.renew.timer`.
  - Cek masa berlakunya dengan
    `sudo openssl x509 -in /etc/letsencrypt/live/103.150.116.66/fullchain.pem -noout -dates`.
- Plugin nginx certbot belum mendukung IP. Jangan jalankan `certbot --nginx`
  untuk IP, dan jangan biarkan certbot mengubah `lch-ins-ip`. Blok itu ditulis manual.
- Kalau IP server berubah, perbarui:
  - `server_name` dan path sertifikat di `lch-ins-ip`;
  - `BETTER_AUTH_TRUSTED_ORIGINS`;
  - `SSH_HOST` dan `SSH_KNOWN_HOST` di workflow deploy.
- Untuk menambah origin lain, isi `BETTER_AUTH_TRUSTED_ORIGINS` dengan daftar
  yang dipisah koma, lalu `docker restart lch_web`.
