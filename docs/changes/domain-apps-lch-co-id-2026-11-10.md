# Pindah domain utama produksi ke `https://apps.lch.co.id`

- **Tanggal:** 2026-11-10
- **Branch:** `chore/domain-apps-lch-co-id`
- **PR:** (akan diisi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Domain resmi `apps.lch.co.id` telah diarahkan (DNS A record) ke IP VPS produksi
`lch-server` (`103.150.116.66`). Sebelumnya server hanya memiliki konfigurasi
Nginx dan sertifikat SSL Let's Encrypt untuk domain sementara
`lch-ins.adhinugroho.tech` (lihat `pindah-vps-lch-server-2026-11-07.md`) serta
akses langsung lewat IP `103.150.116.66` (lihat `akses-ip-lch-server-2026-11-08.md`),
sehingga membuka `apps.lch.co.id` di browser menampilkan peringatan koneksi
tidak aman (*Your connection to this site is not secure*).

Sesuai arahan, `apps.lch.co.id` dijadikan domain utama tunggal produksi,
sementara domain lama `lch-ins.adhinugroho.tech` dan akses langsung lewat IP
`103.150.116.66` dihapus.

## Yang berubah

- **Nginx & Let's Encrypt di `lch-server` (`103.150.116.66`):**
  - Mengubah `/etc/nginx/sites-available/lch-ins` menjadi `server_name apps.lch.co.id;`.
  - Menerbitkan sertifikat SSL Let's Encrypt untuk `apps.lch.co.id` lewat
    `certbot --nginx -d apps.lch.co.id --redirect` (otomatis mengarahkan HTTP
    ke HTTPS 301).
  - Menghapus blok Nginx IP `/etc/nginx/sites-enabled/lch-ins-ip` dan
    `/etc/nginx/sites-available/lch-ins-ip`.
  - Menghapus sertifikat lama `103.150.116.66` dan `lch-ins.adhinugroho.tech`
    lewat `certbot delete`.
- **Konfigurasi Better Auth di server (`/data/workspace/app/repo/.env`):**
  - Mengubah `BETTER_AUTH_URL` menjadi `https://apps.lch.co.id`.
  - Menghapus `BETTER_AUTH_TRUSTED_ORIGINS` (yang sebelumnya berisi IP server).
  - Me-restart container `lch_web` agar perubahan env langsung aktif.
- **Workflow CI/CD (`.github/workflows/deploy.yml`):**
  - Mengubah pemeriksaan kesehatan situs publik pasca-deploy dari
    `https://lch-ins.adhinugroho.tech/login` menjadi `https://apps.lch.co.id/login`.

## File utama

- `.github/workflows/deploy.yml`: URL health check situs publik pasca-deploy.
- Di server (tidak di repo): `/etc/nginx/sites-available/lch-ins`,
  `/data/workspace/app/repo/.env`.

## Dampak

- **Database:** tidak ada.
- **Env:** di server produksi `BETTER_AUTH_URL=https://apps.lch.co.id`, dan
  `BETTER_AUTH_TRUSTED_ORIGINS` dihapus.
- **Deploy:** workflow GitHub Actions mengecek `https://apps.lch.co.id/login`
  setelah deploy selesai.

## Verifikasi

- `https://apps.lch.co.id/login` merespons `200 OK` dengan sertifikat Let's
  Encrypt valid untuk `apps.lch.co.id`.
- `http://apps.lch.co.id/login` dialihkan `301 Moved Permanently` ke
  `https://apps.lch.co.id/login`.
- Endpoint `/api/auth/sign-in/email` menerima `Origin: https://apps.lch.co.id`
  dan menolak `Origin: https://lch-ins.adhinugroho.tech` maupun
  `Origin: https://103.150.116.66` dengan `403 INVALID_ORIGIN`.
- Akses HTTP ke `lch-ins.adhinugroho.tech` dan `103.150.116.66` dikembalikan
  `404 Not Found`.
- `sudo certbot renew --dry-run --no-random-sleep-on-renew` berhasil untuk
  `apps.lch.co.id`.
- Backup konfigurasi lama tersimpan di `/data/workspace/app/backups/`
  (`letsencrypt-nginx-20261110-*.tgz` dan `env-20261110-*.bak`).

## Catatan untuk yang melanjutkan

- Perpanjangan sertifikat `apps.lch.co.id` ditangani otomatis oleh
  `snap.certbot.renew.timer`.
- Jika ke depan proxy Cloudflare diaktifkan di depan `apps.lch.co.id`, pastikan
  mode SSL/TLS di Cloudflare disetel ke **Full (strict)** agar komunikasi
  Cloudflare ke Nginx tetap terenkripsi memakai sertifikat Let's Encrypt di
  server.
