# Report Operational bisa dilihat Marketing, Klaim, dan Direksi

- **Tanggal:** 2026-11-10
- **Branch:** `feat/akses-report-operational`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Matriks hak akses LCH 21 Oktober dan PR #112 (4 November) membuka menu
  Report hanya untuk Admin dan Teknik. Teknik tidak melihat bagian Klaim.
- Sejak PR #194 menu ini bernama Report Operational, karena isinya laporan
  marketing, teknik, dan klaim. Direksi ikut demo Bagian A tanggal
  17 November, padahal belum bisa membuka menu ini.
- Usulan membuka Report dengan tingkat Lihat untuk Marketing, Klaim, dan
  Direksi disetujui Agus pada 10 November 2026.

## Yang berubah

- Baris `/reports` di matriks hak akses:
  - Admin dan Teknik tetap Kelola.
  - Marketing, Klaim, dan Direksi menjadi Lihat: menu tampil dan halamannya
    bisa dibuka. Halaman Report tidak punya aksi ubah, jadi Lihat sudah
    mencakup filter, print, dan export.
  - Finance, Accounting, dan Policy Admin tetap Tidak.
- Bagian Klaim di Report (kartu, ringkasan, dan tab Klaim) tetap tertutup
  untuk Teknik. Aturannya pindah ke `canSeeReportClaims`: klaim tampil kalau
  pengguna punya salah satu role Admin, Marketing, Klaim, atau Direksi.
  - Pengguna berperan ganda Marketing dan Teknik, misalnya Aziz di daftar
    pengguna LCH, sekarang melihat tab Klaim. Ini mengikuti aturan role
    paling longgar yang sudah dipakai `accessLevel`.
  - Sebelumnya `isPlacementOnly` menyembunyikan klaim dari siapa pun yang
    punya role Teknik tanpa Admin, termasuk pengguna Marketing + Teknik.
- Kartu Akses Cepat di Dashboard hanya menampilkan menu yang boleh dibuka
  role pengguna.
  - Sebelumnya Finance, Accounting, dan Policy Admin melihat tautan Report
    Operational yang langsung mengembalikan mereka ke Dashboard.
  - Policy Admin juga melihat Input Klaim, padahal tidak punya akses Klaim.

## File utama

- `lib/access.ts`: baris `/reports` dan fungsi `canSeeReportClaims`.
- `app/(app)/reports/page.tsx`: memakai `canSeeReportClaims`. Data klaim
  tidak diambil kalau tidak ditampilkan.
- `components/dashboard/dashboard-view.tsx`: Akses Cepat disaring dengan
  `canAccess` dari `usePermission`.
- `tests/access.test.ts`: tes matriks Report, akses Lihat tiga role, dan
  aturan bagian Klaim.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts`
  (147 tes), dan `npm run build`: lolos.
- **Uji browser lokal** (Playwright dan Chrome, sesi login sementara yang
  dihapus lagi setelahnya):

  | Pengguna | Buka `/reports` | Tab Klaim | Akses Cepat |
  |---|---|---|---|
  | Marketing | bisa | ada | 5 tautan |
  | Klaim | bisa | ada | 5 tautan |
  | Teknik | bisa | tidak ada | 5 tautan |
  | Finance | dialihkan ke Dashboard | - | 3 tautan, tanpa Database Klien dan Report |
  | Marketing + Teknik | bisa | ada | 5 tautan |
  | Admin | bisa | ada | 5 tautan |

- Menu Report Operational tampil di sidebar pengguna Marketing.
- Direksi belum diuji di browser karena database lokal tidak punya akun
  Direksi yang siap login. Barisnya sama dengan Marketing dan Klaim, dan
  sudah dicakup tes `access.test.ts`.

## Catatan untuk yang melanjutkan

- Sheet "Hak Akses Pengguna LCH" (21 Oktober) masih menulis Report hanya
  untuk Admin dan Teknik. Samakan sheet itu kalau LCH memakainya sebagai
  acuan.
- Deskripsi role Direksi ("akses lihat penuh seluruh modul") masih lebih luas
  dari matriks. Master Data, Master Clauses, Audit Trail, dan Pengaturan tetap
  tertutup untuk Direksi.
- Tautan Buat Placing Slip di Akses Cepat tetap tampil untuk role yang hanya
  Lihat di Placement, karena halamannya memang bisa dibuka. Simpan dan
  release tetap ditolak di server.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
