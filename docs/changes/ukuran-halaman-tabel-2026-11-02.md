# Semua tabel daftar menampilkan 10 baris secara default

- **Tanggal:** 2026-11-02
- **Branch:** `fix/ukuran-halaman-tabel`
- **PR:** #71
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

User meminta semua tabel di setiap modul menampilkan 10 baris secara default,
bukan 15, 20, atau 30, dan semuanya punya pilihan untuk mengubah jumlah baris
per halaman. Sebagian besar tabel sudah 10 dengan pilihan 10/25/50/100, tapi
ada yang berbeda.

## Yang berubah

| Modul | Sebelum | Sesudah |
|---|---|---|
| Master Data > Tarif OJK (okupasi) | 15, pilihan 15/30/50/100 | 10, pilihan 10/25/50/100 |
| Audit Trail | 15, pilihan 15/25/50/100 | 10, pilihan 10/25/50/100 |
| Master Clauses | 20, tanpa pilihan ukuran | 10, pilihan 10/25/50/100 (parameter `size` di URL) |
| Detail Klien > SPPA | 5, pilihan 5/10/20 | 10, pilihan 10/25/50/100 |
| Detail Klien > Placing Slip, Polis, Klaim | semua baris tanpa pagination | 10, pilihan 10/25/50/100 |

`TablePagination` sekarang menyesuaikan diri dengan lebar wadahnya, bukan lebar
layar. Sebelumnya, di kartu setengah lebar seperti Detail Klien, label
"Hal. 1 dari 1" pecah per kata di antara tombol navigasi. Sekarang isinya pindah
ke baris kedua (tombol tetap rata kanan) dan label tidak pernah pecah.

Tabel lain (Placement, Policy Database, Klaim, Klien, SPPA, Renewal Notice,
Report, User, dan tab Master Data lainnya) sudah 10 dengan pilihan ukuran dan
tidak diubah.

## File utama

- `components/master-data/tariff-ojk-tab.tsx`
- `components/audit/audit-filter.ts`
- `lib/server/clauses.ts`, `app/(app)/underwriting/master-clauses/page.tsx`,
  `components/underwriting/master-clauses.tsx`
- `components/marketing/sppa-table.tsx`
- `components/marketing/client-detail.tsx`
- `components/shared/table-pagination.tsx`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** setelah merge, `gh repo sync vourdev/lch-ins -b main`.
- Tautan Audit Trail lama dengan `size=15` jatuh ke ukuran default 10.

## Verifikasi

- Di localhost, setiap halaman tabel dibuka dan pemilih ukuran menunjukkan
  `10 / hal`: Marketing (Klien, SPPA), Placement, Policy Database, Klaim,
  Report (Polis, Klaim), User, Audit Trail, Master Clauses, dan tab Master
  Data.
- Mengganti ukuran ke 25 menampilkan 25 baris di Master Clauses (`?size=25`,
  dari 595 clause), Tarif OJK (dari 300 okupasi), dan Audit Trail.
- Detail Klien menampilkan pagination di tabel Placing Slip, Polis, dan Klaim.
  Di kartu selebar 524px, info dan pemilih ukuran ada di baris pertama, tombol
  di baris kedua rata kanan, dan semua label satu baris. Di tabel lebar seperti
  Policy Database semuanya tetap satu baris.
- `npx eslint` pada file yang diubah: tidak ada masalah.

## Catatan untuk yang melanjutkan

- Tabel referensi statis tidak diberi pagination karena isinya tetap dan
  pendek: kelas konstruksi, tarif kendaraan, perluasan, gempa, banjir, dan
  skala BI di Tarif OJK, serta panel tarif OJK dan tabel rate di form slip.
- Pemilih ukuran hanya muncul kalau tabel berisi data. Tabel kosong hanya
  menampilkan "Tidak ada …".
