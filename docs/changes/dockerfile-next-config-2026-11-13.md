# Unggahan berkas di atas 1 MB macet di VPS

- **Tanggal:** 2026-11-13
- **Branch:** `fix/dockerfile-next-config`
- **PR:** #243
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- User melaporkan unggah dokumen 2,5 sampai 3 MB di `apps.lch.co.id` lama
  sekali, sedangkan berkas berukuran KB cepat.
- Log `lch_web` di VPS penuh error `Body exceeded 1 MB limit` (413) dari
  Server Action. Nginx tidak terlibat karena `client_max_body_size 25m`.
- Penyebabnya:
  - Container `lch_web` dibangun dari `Dockerfile` yang hanya ada di server
    (untracked, lihat `pindah-vps-lch-server-2026-11-07.md`).
  - Dockerfile itu tidak menyalin `next.config.ts` ke image.
  - `next start` membaca `next.config.ts` saat runtime. Tanpa file itu,
    `experimental.serverActions.bodySizeLimit: "5mb"` tidak terbaca, sehingga
    batasnya kembali ke default 1 MB.
  - Di dalam container, config runtime terbaca `serverActions: undefined`.
- Akibatnya potongan unggahan 3 MB (`uploadInParts`) dan unggahan langsung
  di atas 1 MB ditolak. Request-nya tidak selesai, jadi tombol tertahan di
  "Mengunggah 0%" tanpa pesan error. Di Vercel hal ini tidak terjadi karena
  Vercel membaca config dari repo.

## Yang berubah

- `Dockerfile` masuk repo, isinya sama dengan yang ada di server ditambah
  `COPY next.config.ts ./`.
- Setelah PR ini di-merge, `deploy.sh` (`git reset --hard origin/main`)
  menimpa Dockerfile untracked di server dengan versi repo. Mulai sekarang
  perubahan Dockerfile lewat PR seperti kode lain.

## File utama

- `Dockerfile`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Deploy otomatis berikutnya memakai
  Dockerfile dari repo.

## Verifikasi

- Reproduksi lokal dengan folder yang isinya sama dengan container (tanpa
  `next.config.ts`), lalu `next start`. Unggah PDF 3 MB di Berkas Polis
  macet di "Mengunggah 0%" lebih dari 60 detik. Log berisi
  `Body exceeded 1 MB limit`.
- Folder yang sama ditambah `next.config.ts`: PDF 3 MB tersimpan dalam
  0,5 detik ("Polis v1 tersimpan"), tanpa error di log. Data uji dihapus.
- Setelah deploy, cek di VPS:
  - `docker exec lch_web ls /app/next.config.ts` ada;
  - log `lch_web` tidak lagi berisi `Body exceeded 1 MB limit`;
  - unggah berkas 3 MB di aplikasi selesai dalam hitungan detik.

## Catatan untuk yang melanjutkan

- Dockerfile masih menyalin `.env` ke image. Saat runtime `.env` juga
  di-mount read-only, jadi salinan di image tidak diperlukan. Tidak diubah
  di PR ini supaya perbaikannya tetap satu topik.
- Kalau ada config Next lain yang dibaca saat runtime (misalnya
  `serverActions.allowedOrigins`), file ini yang membuatnya berlaku di VPS.
