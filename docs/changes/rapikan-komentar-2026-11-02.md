# Rapikan komentar kode

- **Tanggal:** 2026-11-02
- **Branch:** `chore/rapikan-komentar`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Banyak komentar di codebase tidak menambah informasi. Ada garis pemisah
dekoratif, penomoran langkah yang sudah terlihat dari kode, label JSX seperti
`{/* Modal Dialog */}`, dan JSDoc yang hanya mengulang nama fungsi. Komentar
seperti itu menutupi komentar yang penting, yaitu yang menjelaskan aturan
bisnis, keputusan LCH, dan workaround.

## Yang berubah

Hanya komentar yang berubah. Kode, identifier, dan format tidak disentuh. Ada
190 perubahan di 44 file:

- 73 penomoran langkah dibuang, misalnya `// 2. Insert items` dan
  `{/* 4. Current password */}`. Di skrip uji E2E, komentar `// TEST N` yang
  sama dengan `console.log` di bawahnya juga dibuang.
- 49 komentar yang mengulang kode dihapus.
- 35 garis pemisah dekoratif (`// ----`, `{/* ---------- X ---------- */}`)
  diganti label satu baris di file panjang, atau dihapus kalau judul
  `SectionCard`/Card di bawahnya sudah menamai bagian itu.
- 18 label kosong dihapus.
- 7 blok komentar yang terlalu panjang diringkas tanpa membuang fakta.
- 7 komentar berhuruf kapital diubah ke huruf biasa. Rujukan PRD tetap ada,
  misalnya `{/* Berkas dokumen (PRD A-04) */}`.
- 1 komentar basi diperbaiki: `prisma.config.ts` masih menyebut seed belum ada.

## Yang sengaja tidak diubah

- Komentar yang menjelaskan alasan: aturan bisnis, keputusan LCH, keamanan,
  workaround, dan kasus tepi. Komentar seperti ini tetap ada walaupun panjang.
- `prisma/migrations/*`. Prisma mencatat checksum migrasi yang sudah
  dijalankan, jadi isi file migrasi tidak boleh berubah.
- Komentar bawaan shadcn di `components/ui`.
- Bahasa komentar. Komentar berbahasa Indonesia tetap Indonesia, dan yang
  berbahasa Inggris tetap Inggris.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- Setiap perubahan dicek otomatis: kalau semua komentar dibuang, isi file
  sebelum dan sesudah perubahan identik. `git diff` juga tidak berisi baris
  yang bukan komentar.
- `npm run lint`: 1 error, sama dengan `main` sebelum perubahan
  (`react-hooks/set-state-in-effect` di `components/claims/claim-detail-sheet.tsx`).
  Error ini diperbaiki di branch terpisah.
- `npx tsc --noEmit`: tidak ada error setelah `npx prisma generate`.
  Sebelumnya ada 12 error, baik di `main` maupun di branch ini, karena Prisma
  client lokal belum memuat `StoredFile` dan `DeductibleOption`.
- `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- Komentar baru cukup satu atau dua baris, berisi alasan, bukan apa yang
  dilakukan kode. Jangan pakai garis pemisah atau penomoran langkah.
