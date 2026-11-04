# Pembatasan Master Data, Master Clauses, dan Pengaturan Akses Laporan

- **Tanggal:** 2026-11-04
- **Branch:** `fix/rbac-admin-only-master-data-clauses-reports`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

LCH meminta menu Master Data dan Master Clauses hanya tersedia untuk role Admin. Selain itu, untuk menu Laporan, hanya role Admin dan Teknik (`placement`) yang diperbolehkan mengakses. Untuk peran Teknik, akses laporan dibatasi hanya pada hal-hal yang berkaitan dengan teknik (Produksi Polis dan Database Polis), sedangkan bagian dan data Klaim disembunyikan. Pengguna selain Admin dan Teknik tidak boleh melihat menu laporan atau membuka halamannya secara langsung. Aturan akses rute dikelola melalui `ACCESS_MATRIX` sebagai sumber tunggal.

## Yang berubah

- Mengubah entri `ACCESS_MATRIX` di `lib/access.ts`:
  - `/master-data`: hanya Admin (`kelola`), peran lain `tidak`.
  - `/underwriting/master-clauses`: hanya Admin (`kelola`), peran lain `tidak`.
  - `/reports`: Admin (`kelola`) dan Teknik/placement (`kelola`), peran lain `tidak`.
- Pada `app/(app)/reports/page.tsx`:
  - Mendeteksi apakah pengguna berkedudukan sebagai Teknik non-admin (`isPlacementOnly`).
  - Bila `isPlacementOnly`, query `listClaims()` di-bypass/dikosongkan untuk menghemat resource dan mencegah kebocoran data klaim.
  - Meneruskan prop `showClaims={!isPlacementOnly}` ke `ReportView`.
- Pada `components/reports/report-view.tsx`:
  - Menerima prop `showClaims`.
  - Menyembunyikan stat card klaim, ringkasan jumlah/nilai klaim di kartu ringkasan periode, serta tab Klaim (`TabsTrigger` dan `TabsContent`) saat `showClaims` bernilai `false`.
- Menambahkan automated tests di `tests/access.test.ts` untuk memverifikasi hak akses Master Data, Master Clauses, dan Reports per role.

## File utama

- `lib/access.ts`: pembaruan matriks hak akses route.
- `app/(app)/reports/page.tsx`: server-side access guard dan pemisahan payload klaim untuk Teknik.
- `components/reports/report-view.tsx`: penyembunyian tampilan/tab klaim untuk non-admin.
- `tests/access.test.ts`: test regresi hak akses menu dan matriks per role.

## Dampak

- **Database:** tidak ada perubahan schema.
- **Env:** tidak ada.
- **Deploy:** standar.

## Verifikasi

- `npx tsx --test tests/access.test.ts` lolos (3 test).
- `npx tsc --noEmit` lolos tanpa error.
- `npm run build` berhasil selesai.

## Catatan untuk yang melanjutkan

- `AppSidebar` menyaring navigasi dengan `canAccess`; `AppLayout` memanggil `requireAccess` untuk menolak navigasi URL langsung.
- Peran Teknik yang juga memiliki role Admin tetap mendapatkan akses penuh ke seluruh laporan termasuk klaim.
