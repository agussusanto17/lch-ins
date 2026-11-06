# Kembali dari halaman cetak tanpa memuat ulang

- **Tanggal:** 2026-11-06
- **Branch:** `fix/kembali-dokumen-tanpa-reload`
- **PR:** #156
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Tombol Kembali di halaman cetak (Print / Save PDF) adalah link biasa ke
`backHref`. Next memperlakukannya sebagai navigasi baru: halaman asal diminta
ulang ke server dan skeleton "Memuat halaman" muncul lagi, jadi terasa seperti
refresh. User meminta Kembali langsung menampilkan halaman sebelumnya.

## Yang berubah

- Kembali memakai `router.back()` kalau tab ini sudah pernah membuka halaman
  aplikasi. Next memulihkan halaman dari router cache: tidak ada request ke
  server dan skeleton tidak muncul.
- Kalau halaman cetak dibuka langsung (URL diketik, tab baru, atau setelah
  reload), Kembali tetap memakai link ke `backHref` seperti sebelumnya.
- Halaman yang dipulihkan memakai props server dari kunjungan pertama, jadi
  state yang hanya ada di React akan hilang. Karena itu tab dan filter yang
  dibawa ke halaman cetak sekarang ikut ditulis ke URL dengan
  `history.replaceState`, lalu dibaca lagi dari `useSearchParams()`:
  - Marketing: tab aktif (`?tab=sppa`, `?tab=renewal`);
  - Renewal Notice: periode dan COB (`days`, `cob`);
  - Klaim: status, tahapan, COB, dan pencarian.
- Efek sampingnya, reload atau berbagi URL juga mempertahankan tab dan filter
  tersebut.
- Halaman Marketing tidak lagi membaca `searchParams` di server; tab dan
  filter renewal dibaca langsung di client.

## File utama

- `components/documents/document-shell.tsx`: Kembali memakai `router.back()`.
- `lib/app-shell-history.ts`, `components/layout/app-shell-marker.tsx`,
  `app/(app)/layout.tsx`: penanda bahwa tab ini sudah membuka halaman
  aplikasi.
- `lib/url-query.ts`: `replaceQuery` untuk memperbarui query tanpa navigasi.
- `components/marketing/marketing-tabs.tsx`,
  `components/marketing/renewal-notice.tsx`, `app/(app)/marketing/page.tsx`:
  tab dan filter renewal di URL.
- `components/claims/claims-view.tsx`: filter klaim di URL.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsx --test tests/*.test.ts`, `npx tsc --noEmit`, dan `npm run build`
  lolos.
- Uji di browser (DB lokal), dengan menghitung request `_rsc` dan kemunculan
  skeleton setelah klik Kembali:
  - Klaim dengan filter status Outstanding dan pencarian "a" → Print →
    Kembali: 0 request, tanpa skeleton, filter dan jumlah baris sama. Setelah
    reload, filter masih sama;
  - Marketing tab SPPA → Print → Kembali: kembali ke tab SPPA, tanpa
    skeleton;
  - Renewal Notice 30 hari → Print → Kembali: 0 request, tab Renewal dan
    periode 30 hari tetap;
  - Slip: edit → Lihat Dokumen → Kembali: 0 request. Data yang sudah disimpan
    tetap tampil;
  - halaman cetak dibuka langsung lewat URL → Kembali mendarat di `backHref`.

## Catatan untuk yang melanjutkan

- State yang perlu bertahan setelah Kembali harus ada di URL. Komponen baru
  yang membuka halaman cetak sebaiknya mengikuti pola `replaceQuery` +
  `useSearchParams()`.
- Filter tabel SPPA belum ditulis ke URL. Sejak sebelum perubahan ini,
  `backHref` SPPA juga tidak membawa filter.
- Alternatif `cacheComponents` (state React ikut tersimpan lewat Activity)
  tidak dipakai. Layout aplikasi masih dinamis, dan migrasinya terlalu besar
  menjelang demo.
