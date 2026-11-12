# Cek situs publik di workflow deploy memakai apps.lch.co.id

- **Tanggal:** 2026-11-12
- **Branch:** `fix/cek-domain-deploy-workflow`
- **PR:** #225
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- Workflow GitHub Actions "Deploy to Production VPS" gagal sejak 10 November
  malam. Run untuk `d38d9aa`, `f5ccf2f`, dan `35d814d` semuanya merah.
- Penyebabnya ada di langkah terakhir, "Cek situs publik". Langkah itu masih
  memanggil `https://lch-ins.adhinugroho.tech/login`.
- Domain itu sudah dicabut saat produksi pindah ke `apps.lch.co.id` (lihat
  `domain-apps-lch-co-id-2026-11-10.md`). Akibatnya curl selalu `000`.
- Deploy di VPS sendiri berhasil. `deploy.sh` lolos health check lokal, dan
  `https://apps.lch.co.id/login` merespons 200. Jadi status merah ini tanda
  palsu, bukan deploy yang gagal.

## Yang berubah

- Langkah "Cek situs publik" sekarang memeriksa `https://apps.lch.co.id/login`.

## File utama

- `.github/workflows/deploy.yml`: URL cek situs publik.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Merge PR ini memicu deploy, dan run
  itu sekaligus menguji perbaikannya.

## Verifikasi

- `curl https://apps.lch.co.id/login` dari lokal mengembalikan 200.
- `npx tsc --noEmit` dan `npm run build` lolos.
- Setelah merge dan sinkron fork, run "Deploy to Production VPS" harus hijau.

## Catatan untuk yang melanjutkan

- Kalau domain produksi berganti lagi, ubah juga URL di workflow ini.
  `deploy.sh` di server memakai `127.0.0.1:3000`, jadi tidak ikut terdampak.
