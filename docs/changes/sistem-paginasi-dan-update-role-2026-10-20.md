# Sistem Paginasi Tabel, Rename Role Teknik, dan Multi-Select Dropdown Peran

- **Tanggal:** 2026-10-20
- **Branch:** `feat/table-pagination-and-role-updates`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

1. **Paginasi Tabel Terstandar**: Sebelumnya, seluruh tabel operasional (Pengguna, Klien, SPPA, Policy Database, Klaim, Placing Slip, Laporan, Renewal Notice) me-render seluruh data sekaligus tanpa pembagian halaman atau kontrol jumlah data yang ditampilkan. Hal ini menyebabkan tabel memanjang saat data bertambah dan menyulitkan navigasi.
2. **Penyelarasan Nomenklatur Role**: Role "Placement/Teknik" perlu disederhanakan tampilannya menjadi "Teknik" agar selaras dengan sebutan resmi divisi di PT Lintas Cipta Harda (LCH).
3. **Peningkatan UX Pemilihan Multi-Role**: Pada dialog form pengguna (`UserFormDialog`), pemilihan peran sebelumnya menggunakan checkbox statis dua kolom yang memakan ruang dialog vertikal. Diganti dengan komponen dropdown multi-select modern yang interaktif, ringkas, dan intuitif.

## Yang berubah

- **Komponen Paginasi Reusable (`components/shared/table-pagination.tsx`)**:
  - Dibuat custom hook `usePagination<T>` untuk mengelola state halaman (`page`), ukuran halaman (`pageSize`), total halaman (`totalPages`), dan data terpotong (`paginatedItems`).
  - Menyertakan auto-reset ke halaman 1 setiap kali query pencarian atau filter mengubah ukuran dataset.
  - Dibuat komponen visual `<TablePagination />` dengan informasi rentang ("Menampilkan X – Y dari Z data"), pemilih ukuran baris (10, 25, 50, 100 per halaman), dan kontrol navigasi lengkap (First, Prev, indikator halaman, Next, Last) yang responsif dan dapat disembunyikan saat print.
- **Integrasi Paginasi ke 8 Tabel**:
  1. `components/users/user-table.tsx` (Manajemen Pengguna)
  2. `components/marketing/client-table.tsx` (Daftar Klien)
  3. `components/marketing/sppa-table.tsx` (Daftar SPPA Prospek)
  4. `components/policies/policy-database.tsx` (Database Polis & Tipe Polis)
  5. `components/claims/claims-view.tsx` (Daftar Klaim Asuransi)
  6. `components/underwriting/slip-table.tsx` (Daftar Placing Slip)
  7. `components/reports/report-view.tsx` (Tabel Polis & Klaim Periode Laporan)
  8. `components/marketing/renewal-notice.tsx` (Tabel Jatuh Tempo Perpanjangan)
- **Rename Label Role "Placement/Teknik" -> "Teknik"**:
  - Mengubah label tampilan peran pada `CANONICAL_ROLES` dan `ROLE_LABELS` di `lib/access.ts` dari `"Placement/Teknik"` menjadi `"Teknik"`.
  - Mengubah seed database di `prisma/seed.ts` (lookup dan deskripsi akun staf Teknik).
  - Tetap mempertahankan kode string internal `"placement"` di PostgreSQL dan session logic untuk menjamin integritas data referensial dan backward compatibility.
- **Komponen Dropdown Multi-Select Peran (`components/users/role-multi-select.tsx`)**:
  - Menggunakan primitive `@base-ui/react/popover` via `components/ui/popover.tsx` dan `components/ui/checkbox.tsx`.
  - Trigger fleksibel dengan pill badge peran atau badge ringkasan jumlah ("N peran dipilih"), serta tombol hapus cepat (`X`).
  - Popover content dengan opsi "Pilih Semua", "Reset", checkbox, badge peran berwarna, serta deskripsi tugas masing-masing divisi.
  - Pemilihan opsi tidak menutup dropdown secara otomatis sehingga memudahkan pemilihan multi-peran.

## File utama

- `components/shared/table-pagination.tsx`: hook `usePagination` dan komponen visual `<TablePagination />`.
- `components/users/role-multi-select.tsx`: komponen dropdown multi-select khusus peran pengguna sistem.
- `components/users/user-form-dialog.tsx`: integrasi komponen `RoleMultiSelect` ke form modal tambah/edit pengguna.
- `lib/access.ts`: single source of truth definisi peran sistem LCH (label tampilan diubah ke "Teknik").
- `prisma/seed.ts`: penyesuaian lookup nama peran dan akun seed Teknik.
- `components/users/user-table.tsx`: paginasi tabel manajemen pengguna.
- `components/marketing/client-table.tsx`: paginasi tabel klien.
- `components/marketing/sppa-table.tsx`: paginasi tabel SPPA.
- `components/policies/policy-database.tsx`: paginasi database polis.
- `components/claims/claims-view.tsx`: paginasi klaim.
- `components/underwriting/slip-table.tsx`: paginasi placing slip underwriting.
- `components/reports/report-view.tsx`: paginasi tabel laporan polis dan klaim.
- `components/marketing/renewal-notice.tsx`: paginasi tabel renewal notice.

## Dampak

- **Database:** Tidak ada perubahan skema (schema migration). Kode role internal tetap `"placement"` di kolom array PostgreSQL `users.roles`.
- **Env:** Tidak ada variabel lingkungan baru.
- **Deploy:** Standar deploy Next.js (Vercel).

## Verifikasi

- `npx tsc --noEmit`: 0 error.
- `npm run build`: Kompilasi Turbopack Next.js 16 berhasil 100% (70 rute statis/SSG/dinamis).
- Validasi antarmuka pada seluruh 8 tabel: pergantian halaman, pemilihan ukuran baris, dan penyaringan data berfungsi mulus.

## Catatan untuk yang melanjutkan

- Kode internal untuk divisi Teknik tetap menggunakan `"placement"` di seluruh database, session token, dan matriks hak akses `ACCESS_BY_ROLE`. Jangan mengubah kode string ini menjadi `"teknik"` di level skema Prisma tanpa migration script terencana.
- Komponen `TablePagination` menggunakan kelas `no-print` sehingga ketika dokumen/laporan dicetak via print dialog browser, kontrol navigasi paginasi tidak mengotori cetakan fisik.
