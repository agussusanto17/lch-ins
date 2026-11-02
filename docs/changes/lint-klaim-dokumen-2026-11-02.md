# Status muat dokumen klaim tanpa setState di effect

- **Tanggal:** 2026-11-02
- **Branch:** `fix/lint-klaim-dokumen`
- **PR:** #76
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

`npm run lint` di `main` gagal dengan 1 error `react-hooks/set-state-in-effect`
di `components/claims/claim-detail-sheet.tsx`. Effect yang memuat dokumen dan
tindak lanjut klaim langsung memanggil `setIsLoadingDocs(true)` dan
`setIsLoadingFollowups(true)`, sehingga komponen di-render dua kali setiap kali
sheet dibuka. Error ini ditemukan saat audit komentar
([rapikan-komentar-2026-11-02.md](rapikan-komentar-2026-11-02.md)).

## Yang berubah

- Status loading dokumen dan tindak lanjut tidak lagi disimpan sebagai
  state. Komponen mencatat id klaim yang datanya sudah dimuat, lalu loading
  dihitung dari situ: masih loading selama id klaim yang dibuka berbeda dari
  id yang sudah dimuat.
- Kalau sheet dibuka lagi untuk klaim yang sama, daftar yang terakhir dimuat
  langsung tampil sambil diperbarui di belakang, tanpa spinner. Untuk klaim
  lain, spinner tetap tampil seperti sebelumnya.

## File utama

- `components/claims/claim-detail-sheet.tsx`: status muat dokumen dan tindak
  lanjut klaim.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npm run lint`: tidak ada masalah.
- `npx tsc --noEmit`: tidak ada error.
- `npm run build`: lolos.
- Belum diuji di browser karena dev server lokal sedang tidak berjalan. Yang
  perlu dicek: buka detail klaim, pastikan spinner tab Berkas dokumen dan
  Tindak lanjut muncul lalu hilang, ganti ke klaim lain, lalu buka lagi klaim
  pertama.

## Catatan untuk yang melanjutkan

- Pola yang sama dipakai di `components/layout/notification-popover.tsx`:
  nilai turunan atau `useSyncExternalStore`, bukan setState sinkron di dalam
  effect.
