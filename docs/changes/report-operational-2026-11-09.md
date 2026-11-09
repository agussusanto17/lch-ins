# Menu Report menjadi Report Operational

- **Tanggal:** 2026-11-09
- **Branch:** `feat/report-operational`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Permintaan 9 November 2026: menu Report diganti namanya menjadi
  **Report Operational**, karena isinya laporan marketing, teknik, dan klaim.
- Nanti ada report lain, misalnya finance dan accounting, sebagai menu
  sendiri.

## Yang berubah

- Label "Report" menjadi "Report Operational" di:
  - menu sidebar (Referensi & Laporan);
  - breadcrumb dan judul tab browser;
  - judul halaman;
  - kartu Akses Cepat di Dashboard.
- Alamat halaman tetap `/reports`, begitu juga hak aksesnya di
  `lib/access.ts`. Bookmark dan pengaturan role tidak berubah.

## File utama

- `components/layout/nav-items.ts`, `components/layout/app-topbar.tsx`,
  `app/(app)/reports/page.tsx`, `components/dashboard/dashboard-view.tsx`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- **Uji browser lokal** (Playwright, sesi login sementara): menu sidebar,
  judul halaman, judul tab, breadcrumb, dan Akses Cepat Dashboard bertuliskan
  Report Operational; tidak ada lagi label "Report" saja; tanpa error halaman.

## Catatan untuk yang melanjutkan

- Report finance dan accounting nanti sebaiknya route sendiri, misalnya
  `/reports/finance`, dengan hak akses sendiri di `lib/access.ts`.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
