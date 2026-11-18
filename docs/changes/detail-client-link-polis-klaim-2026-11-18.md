# Detail client: nomor polis dan klaim bisa dibuka

- **Tanggal:** 2026-11-18
- **Branch:** `feat/detail-client-link-polis-klaim`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (luring, 17 November 2026, poin 4): daftar Polis dan Klaim di detail client bisa diklik untuk melihat detailnya, seperti daftar Placing Slip.
- Sebelumnya hanya nomor placing slip yang berupa link. Nomor polis dan nomor klaim hanya teks.

## Yang berubah

- **Detail client:**
  - nomor polis menjadi link ke `/policies?policy=<id>`;
  - nomor klaim menjadi link ke `/claims?claim=<id>`;
  - link hanya muncul untuk role yang punya akses ke menu tujuannya (`canAccess`). Contohnya Policy Admin tidak punya akses Klaim, jadi nomor klaim tetap teks.
- **Policy Database membaca `?policy=<id>`:**
  - kolom cari terisi nomor polisnya, jadi tabel tersaring ke polis itu;
  - role yang boleh kelola polis (Admin, Teknik, Policy Admin) langsung melihat form polisnya, sama seperti link placing slip yang membuka form edit;
  - role lihat saja (Marketing, Klaim, Direksi) melihat baris polisnya di tabel;
  - parameter dibuang dari URL saat form ditutup, jadi refresh tidak membuka form lagi. Saringannya tetap.
- **Klaim membaca `?claim=<id>`:**
  - sheet detail klaim langsung terbuka;
  - parameter dibuang saat sheet ditutup, sedangkan saringan klaim di URL tetap.

## File utama

- `components/marketing/client-detail.tsx`
- `components/policies/policy-database.tsx`
- `components/claims/claims-view.tsx`

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Perilaku baru:** link dengan `?policy=` dan `?claim=` bisa dipakai dari halaman lain nanti, misalnya dari report.

## Verifikasi

Browser lokal, port 3002, client PT Karya Bangun Perkasa:

- **SIT Admin:**
  - detail client menampilkan link CAR/2026/JTG/0019, PA/GRP/2026/0209, dan CLM/2026/07/0030;
  - klik CLM/2026/07/0030 membuka sheet detail klaim, dan setelah ditutup URL kembali ke `/claims`;
  - klik CAR/2026/JTG/0019 membuka form Edit Polis. Setelah ditutup tanpa simpan, URL kembali ke `/policies`, kolom cari berisi CAR/2026/JTG/0019, dan tabel menampilkan 1 polis.
- **Marketing LCH:** `/policies?policy=…` tidak membuka form, dan tabel tersaring ke 1 polis.

## Catatan untuk yang melanjutkan

- Policy Database belum punya halaman atau sheet detail polis tersendiri. Untuk role lihat saja, detailnya adalah baris di tabel dan menu Berkas polis.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
