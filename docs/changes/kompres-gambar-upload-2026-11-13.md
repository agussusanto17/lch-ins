# Foto besar diperkecil otomatis sebelum diunggah

- **Tanggal:** 2026-11-13
- **Branch:** `feat/kompres-gambar-upload`
- **PR:** #246
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- Berkas KYC klien, berkas klaim, dan lampiran slip dibatasi 4 MB. Foto
  dari kamera HP biasanya 4–8 MB, jadi sering ditolak dengan pesan
  "Ukuran file maksimal 4 MB.".
- User setuju foto dikompres otomatis saat diunggah. PDF dan Excel tidak
  ikut dikompres:
  - PDF umumnya sudah terkompres;
  - mengompres PDF berarti menurunkan kualitas cap dan tanda tangan, dan
    tanda tangan digital di PDF jadi tidak berlaku.
- Kelambatan unggah berkas 3 MB sudah diperbaiki terpisah di PR #243
  (`dockerfile-next-config-2026-11-13.md`). Perubahan ini soal batas ukuran
  dan kecepatan unggah dari HP, bukan perbaikan bug itu.

## Yang berubah

- Foto JPG, PNG, atau WebP di atas 1 MB diperkecil di browser sebelum
  dikirim:
  - sisi terpanjang maksimal 2000px, rasio tetap;
  - disimpan ulang sebagai JPEG kualitas 80%, nama berkas berakhiran `.jpg`;
  - orientasi foto HP (EXIF) diterapkan;
  - latar transparan PNG menjadi putih.
- Kalau hasilnya tidak lebih kecil, atau browser gagal membaca gambarnya,
  berkas asli yang dikirim.
- Batas 4 MB dicek terhadap berkas setelah dikompres. Foto 10 MB yang dulu
  ditolak sekarang diterima.
- Berlaku untuk:
  - Berkas KYC di form klien;
  - Berkas klaim;
  - Lampiran slip.
- Berkas polis (Polis, Premium Note, Commission Note) tidak dikompres. Batasnya
  25 MB dan isinya dokumen legal, jadi disimpan apa adanya.
- Hint di bawah tombol unggah menyebut "Foto yang lebih besar diperkecil
  otomatis."
- Server tidak berubah dan tidak ada library tambahan.

## File utama

- `lib/image-compress.ts`: `compressImage()`, `fitWithin()`,
  `shouldCompress()`, `jpegFileName()`.
- `components/marketing/client-form.tsx`, `components/claims/claim-detail-sheet.tsx`,
  `components/underwriting/slip-attachments.tsx`: memanggil `compressImage()`
  sebelum pemeriksaan ukuran.
- `lib/uploads.ts`: teks `UPLOAD_HINT` dan `ATTACHMENT_HINT`.
- `tests/image-compress.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos. Test `image-compress` lolos.
- Cek E2E di browser lokal, Lampiran slip pada slip draft:
  - foto kamera JPG 10,1 MB (6000×3376) tersimpan sebagai `foto-kamera.jpg`
    156 KB (2000×1125), sekitar 3 detik;
  - gambar PNG 6,2 MB (4112×1530) tersimpan sebagai `gambar-besar.jpg`
    67 KB (2000×744), sekitar 2 detik, teks di gambar tetap tajam.
  - Data uji dihapus.

## Catatan untuk yang melanjutkan

- Angka 2000px dan kualitas 80% ada di konstanta `COMPRESS_MAX_SIDE` dan
  `COMPRESS_QUALITY`. Naikkan kalau LCH butuh foto lebih detail.
- Screenshot PNG berisi teks kecil di atas 1 MB juga diubah ke JPEG. Kalau
  ada keluhan teks buram, pertimbangkan PNG tetap PNG dan hanya diperkecil.
- Kalau berkas polis nanti juga perlu dikompres, panggil `compressImage()`
  di `policy-files-sheet.tsx` dan `policy-form.tsx` sebelum `uploadInParts`.
