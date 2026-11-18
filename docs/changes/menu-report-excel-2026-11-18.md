# Menu Report: daftar report yang langsung diunduh ke Excel

- **Tanggal:** 2026-11-18
- **Branch:** `feat/menu-report-excel`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (luring, 17 November 2026), poin 16:
  - menu Report berisi daftar report dari semua divisi dan tampil sesuai role yang login;
  - tidak perlu tabel data. Report diklik, dialog parameter muncul (misalnya tanggal mulai dan tanggal akhir), lalu file Excel langsung terunduh.
- Ketentuan yang ditetapkan Agus (18 November 2026):
  - menu baru di sidebar, sedangkan Report Operational tetap ada untuk grafik dan tabel;
  - hak akses per report mengikuti matriks hak akses LCH dan diatur developer.
- Agus, 18 November 2026: tombol "Rekap Produksi (Excel)" di Report Operational pindah ke menu Report.

## Yang berubah

- **Menu Report** di sidebar (grup Referensi & Laporan, di atas Report Operational), di route `/report-excel`.
  - Halamannya berisi kartu report yang dikelompokkan per divisi.
  - Kartu diklik membuka dialog Tanggal mulai dan Tanggal akhir (default bulan berjalan). Tombol Unduh Excel langsung membuat file.
  - Periode kosong menampilkan toast "Tidak ada polis di periode ini" dan dialog tetap terbuka.
  - Periode terbalik ditolak dengan pesan aplikasi. Form memakai `noValidate`, jadi bubble validasi bawaan browser tidak menggantikan pesan ini.
- **Daftar report** di `lib/report-catalog.ts`:
  - setiap report menyebut divisi, dasar tanggal periode, dan menu sumber hak aksesnya;
  - report pertama adalah **Rekap Produksi** (format 49 kolom yang sudah berjalan, periode tanggal mulai polis), dengan hak akses mengikuti Report Operational;
  - report lain ditambahkan di sini setelah template dari Team LCH diterima (MoM poin 17 dan 18).
- **Hak akses:**
  - `/report-excel` ditambahkan ke matriks dengan nilai yang sama dengan `/reports`;
  - Admin, Marketing, Teknik, Klaim, dan Direksi melihat menu dan Rekap Produksi;
  - Finance, Accounting, dan Policy Admin tidak, sama seperti Report Operational.
- **Report Operational:** tombol Rekap Produksi (Excel) dihapus. Server action `productionRecapAction` tetap dipakai oleh menu Report.

## File utama

- `lib/report-catalog.ts`, `components/reports/report-catalog.tsx`, `app/(app)/report-excel/page.tsx` (baru)
- `components/reports/report-view.tsx`
- `lib/access.ts`, `components/layout/nav-items.ts`, `components/layout/app-topbar.tsx`
- `tests/report-catalog.test.ts` (baru)

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Perilaku baru:** Rekap Produksi sekarang diunduh dari menu Report. Isi file-nya tidak berubah.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 280 tes lolos, termasuk 4 tes daftar report. Tes memeriksa:
  - filter hak akses;
  - periode default, termasuk Februari kabisat;
  - validasi periode.
- **Browser lokal** (SIT Admin, viewport 1280):
  - menu Report tampil di sidebar, dan halaman menampilkan kartu Rekap Produksi di kelompok Produksi;
  - dialog terbuka dengan periode 01/11/2026 s/d 30/11/2026. Unduh Excel menampilkan toast "Rekap Produksi terunduh: 3 polis · 01 Nov 2026 s/d 30 Nov 2026", lalu dialog tertutup;
  - periode Januari 2020 menampilkan toast "Tidak ada polis di periode ini", dan dialog tetap terbuka;
  - periode 10/12/2026 s/d 01/12/2026 menampilkan pesan "Tanggal mulai tidak boleh setelah tanggal akhir.";
  - Report Operational tidak lagi punya tombol Rekap Produksi.
- **Hak akses** (`canAccess` per role): menu dan Rekap Produksi tampil untuk Admin, Marketing, Teknik, Klaim, dan Direksi.

## Catatan untuk yang melanjutkan

- Menambah report: tambahkan definisinya di `REPORTS` dan pembuat file-nya di `GENERATORS` (`components/reports/report-catalog.tsx`). Kalau report itu dipakai role lain, perbarui juga matriks `/report-excel`.
- Finance dan Accounting belum bisa mengunduh Rekap Produksi, mengikuti matriks Report Operational. Kalau Team LCH ingin Finance ikut, ubah hak akses `/reports` dan `/report-excel`.
- Filter cabang (MoM poin 3, PR #267) bisa ditambahkan sebagai parameter Rekap Produksi setelah PR itu di-merge.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
