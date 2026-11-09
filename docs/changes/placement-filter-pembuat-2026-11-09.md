# Filter dan kolom pembuat slip di daftar Placement

- **Tanggal:** 2026-11-09
- **Branch:** `feat/placement-filter-pembuat`
- **PR:** [#193](https://github.com/agussusanto17/lch-ins/pull/193)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Permintaan 9 November 2026 (coretan di halaman Placement):
  - tambah filter user yang membuat slip, di sebelah filter status;
  - tambah kolom user yang membuat slip, di ujung kanan tabel.
- Pembuat slip sudah tersimpan sejak awal (`placing_slips.created_by`), dan
  namanya sudah ikut dikirim ke daftar (`createdByName`). Yang belum ada hanya
  tampilannya.

## Yang berubah

- **Filter "Semua pembuat"** di sebelah filter status. Pilihannya diambil dari
  pembuat slip yang ada di daftar, urut nama, jadi tidak ada pilihan yang
  hasilnya kosong.
- **Kolom "Dibuat oleh"** di ujung kanan tabel, setelah Diperbarui. Nama yang
  panjang dipotong, dan nama lengkapnya muncul saat di-hover.
- **Export** Excel dan CSV mendapat kolom "Dibuat oleh". **Print** ikut, karena
  mencetak tabel di layar.
- **Lebar kolom** supaya kolom baru muat tanpa tabel digeser ke samping:
  - Nama Tertanggung dan Type of Cover sekarang mengikuti lebar layar (16% dan
    13% tabel), dengan teks lengkap saat di-hover.
  - Sebelumnya keduanya tetap 240 px dan 210 px, dan tabel tujuh kolom sudah
    sedikit lebih lebar dari kartu di layar 1440 px dengan sidebar terbuka.
- `createdByName` dipindah dari `PlacingSlipRecord` ke tipe `PlacingSlip`,
  supaya tabel bisa membacanya dari store.

## File utama

- `components/underwriting/slip-table.tsx`.
- `lib/data/types.ts` dan `lib/server/placing-slips.ts` (tipe saja).

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 140 lolos.
- **Uji browser lokal** (Playwright dengan Chrome, sesi login sementara),
  25 slip dari dua pembuat (Admin LCH 23, SIT Admin 2):
  - toolbar: Semua COB, Semua status, Semua pembuat;
  - pilihan filter: Semua pembuat, Admin LCH, SIT Admin;
  - memilih tiap pembuat menampilkan jumlah slip yang sama dengan database,
    dan kolom Dibuat oleh hanya berisi nama itu;
  - export Excel berisi kolom Dibuat oleh, dengan baris sesuai filter;
  - mode cetak menampilkan kolom Dibuat oleh;
  - lebar 1920 dan 1440 px: tabel selebar kartu, tidak ada sel terpotong;
  - lebar 1366 px: tabel 19 px lebih lebar dari kartu, sebelumnya 94 px;
  - tanpa error halaman.
- Sesi sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- Di bawah sekitar 1400 px dengan sidebar terbuka, tabel masih perlu digeser
  sedikit. Batasnya judul kolom yang tidak boleh terlipat.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
