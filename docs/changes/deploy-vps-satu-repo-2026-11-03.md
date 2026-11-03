# Deploy VPS hanya dari fork vourdev

- **Tanggal:** 2026-11-03
- **Branch:** `chore/deploy-vps-satu-repo`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Workflow `Deploy to Production VPS` ada di dua repo, `agussusanto17/lch-ins`
dan fork `vourdev/lch-ins`. Keduanya SSH ke VPS yang sama dan menjalankan
`deploy.sh` setiap ada push ke `main`. Setelah fork disinkronkan, dua run
berjalan hampir bersamaan, dan salah satunya selalu gagal dengan
`Another next build process is already running`. Sejak 2026-11-02, setiap
pasangan run untuk commit yang sama berakhir satu gagal dan satu berhasil.
Dua merge yang berdekatan di repo yang sama juga bisa bertabrakan dengan cara
yang sama.

## Yang berubah

- Job deploy hanya jalan di `vourdev/lch-ins`. Di `agussusanto17/lch-ins`
  workflow tetap terpicu, tetapi job-nya dilewati (skipped), bukan gagal.
- `concurrency: deploy-vps` dengan `cancel-in-progress: false`: dua push
  berdekatan ke fork antre, tidak membatalkan deploy yang sedang jalan.

## File utama

- `.github/workflows/deploy.yml`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** VPS sekarang ter-update setelah fork disinkronkan
  (`gh repo sync vourdev/lch-ins -b main`), sama seperti demo Vercel. Merge ke
  `agussusanto17/lch-ins` saja tidak lagi meng-update VPS.

## Verifikasi

- Setelah merge dan sinkron fork: run di `agussusanto17/lch-ins` berstatus
  skipped, dan run di `vourdev/lch-ins` berhasil.

## Catatan untuk yang melanjutkan

- Kalau suatu saat VPS harus di-deploy dari repo agussusanto, ganti nama repo
  di syarat `if` job deploy. Jangan aktifkan di dua repo sekaligus.
- Deploy manual masih bisa lewat `workflow_dispatch` di repo vourdev.
