# Pindah produksi dari Instabox ke lch-server

- **Tanggal:** 2026-11-07
- **Branch:** `chore/deploy-lch-server`
- **PR:** #164
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Produksi `https://lch-ins.adhinugroho.tech` sebelumnya jalan di sandbox
Instabox lewat Cloudflare Tunnel (lihat `ci-cd-vps-auto-deploy-2026-10-25.md`).
Instabox tidak dipakai lagi dan akan dihapus. Produksi dipindah ke VPS baru
`lch-server` (Ubuntu 22.04, 2 vCPU, 3.8 GB RAM, IP `103.150.116.66`), dan
workflow auto-deploy diarahkan ke server itu.

## Yang berubah

- **Server baru, susunan sama dengan Instabox** di `/data/workspace/app`:
  repo di `repo/`, Postgres 16 (`lch_postgres`, hanya `127.0.0.1:5432`) dari
  `docker-compose.db.yml`, app di container `lch_web` (`--network host`,
  port 3000), `Dockerfile` di `repo/` (untracked, tidak ikut git).
- **Akses publik lewat Nginx + Let's Encrypt**, bukan lagi Cloudflare Tunnel.
  DNS `lch-ins` sekarang A record ke `103.150.116.66` (DNS only). Sertifikat
  diperbarui otomatis oleh `certbot.timer`. HTTP diarahkan ke HTTPS.
- **Firewall UFW aktif**: hanya 22, 80, 443. Port 3000 dan 5432 tertutup dari
  luar.
- **Swap 4 GB** supaya `next build` tidak kehabisan memori.
- **Database disalin dari Instabox** setelah app Instabox dihentikan
  (pg_dump lalu pg_restore). Jumlah tabel, migrasi, dan baris per tabel sama
  persis di kedua sisi.
- **`deploy.sh` di server** sekarang memakai lock (tidak bisa jalan dua kali
  bersamaan), menghapus image lama, dan gagal kalau `/login` tidak 200 setelah
  restart.
- **Workflow deploy** SSH ke `devops@103.150.116.66` dengan kunci khusus dari
  secret `VPS_SSH_KEY`. Host key server dipasang tetap di workflow
  (`StrictHostKeyChecking=yes`), menggantikan `StrictHostKeyChecking=no`.
  Setelah deploy, workflow mengecek `https://lch-ins.adhinugroho.tech/login`.
  Timeout dinaikkan ke 30 menit.

## File utama

- `.github/workflows/deploy.yml`: target deploy baru, kunci SSH, cek situs.
- Di server (tidak di repo): `/data/workspace/app/deploy.sh`,
  `docker-compose.db.yml`, `.env.db`, `repo/.env`, `repo/Dockerfile`,
  `/etc/nginx/sites-available/lch-ins`.

## Dampak

- **Database:** tidak ada perubahan skema. Data produksi pindah ke Postgres di
  lch-server. Backup sebelum salinan akhir ada di `/data/workspace/app/backups/`.
- **Env:** secret GitHub baru `VPS_SSH_KEY` di `vourdev/lch-ins`. Secret lama
  `VPS_SSH_USER`, `VPS_SSH_HOST`, `VPS_SSH_PORT` tidak dipakai lagi. Env app
  tetap `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`;
  `BETTER_AUTH_SECRET` baru dibuat untuk server ini, jadi sesi login lama dari
  Instabox tidak berlaku dan pengguna perlu login ulang.
- **Deploy:** alur tetap: merge PR ke `agussusanto17/lch-ins`, lalu
  `gh repo sync vourdev/lch-ins -b main` memicu deploy di fork.

## Verifikasi

- `https://lch-ins.adhinugroho.tech/login` 200, sertifikat Let's Encrypt
  valid, `http://` dialihkan 301 ke `https://`.
- Login `admin@lch.example` lewat `/api/auth/sign-in/email` 200, halaman
  `/`, `/policies`, `/claims` 200 dengan sesi, logout 200.
- `certbot renew --dry-run` berhasil.
- Dari luar: port 3000 dan 5432 tidak bisa diakses, SSH dan 80/443 bisa.
- Kunci deploy: perintah lain (`id`) diabaikan, yang jalan tetap `deploy.sh`.
- `deploy.sh` versi baru dijalankan penuh di server sampai health check 200.

## Catatan untuk yang melanjutkan

- Kunci `VPS_SSH_KEY` di server dibatasi `command="/data/workspace/app/deploy.sh",restrict`
  di `~devops/.ssh/authorized_keys`. Untuk akses manual pakai kunci admin,
  bukan kunci ini.
- Kalau server dibangun ulang atau host key berubah, perbarui `SSH_KNOWN_HOST`
  di workflow. Ambil dari `/etc/ssh/ssh_host_ed25519_key.pub` di server.
- Build butuh sekitar 10 menit dan memakai swap. Jangan matikan swap.
- Kalau koneksi SSH dari GitHub putus di tengah deploy, `deploy.sh` bisa
  berhenti di tengah jalan. Jalankan ulang workflow lewat `workflow_dispatch`.
- `Dockerfile` di server menyalin `.env` ke image; saat runtime `.env` juga
  di-mount read-only dari `repo/.env`. Ubah env cukup di `repo/.env` lalu
  `docker restart lch_web`.
