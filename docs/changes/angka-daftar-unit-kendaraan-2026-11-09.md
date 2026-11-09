# Angka di DAFTAR UNIT KENDARAAN tidak terpotong

- **Tanggal:** 2026-11-09
- **Branch:** `fix/angka-daftar-unit-kendaraan`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Lampiran DAFTAR UNIT KENDARAAN (dan DAFTAR UNIT ALAT BERAT) dibuat di PR
  #182, lihat [lampiran-unit-as-attached-2026-11-09.md](lampiran-unit-as-attached-2026-11-09.md).
- Temuan SIT-089 (uji 9 November 2026, slip PSKBI dua kendaraan): angka besar
  di kolom sempit pindah baris di tengah angka.
  - Sum Insured tercetak `250.000.00` dengan `0` di baris berikutnya, begitu
    juga `600.000.000` dan total `850.000.000`.
  - Limit TPL tercetak `25.000.00` dengan `0` di baris berikutnya.
- Penyebabnya, tabel memakai lebar kolom persen tetap (`table-fixed`) ditambah
  `break-words`. Kolom Sum Insured hanya 10% dan TPL 8% dari lebar A4, jadi
  angka sembilan digit sudah tidak muat lalu dipecah di sembarang karakter.

## Yang berubah

- **Lebar kolom mengikuti isi.** Tabel tidak lagi memakai lebar persen tetap.
  Browser membagi lebar halaman sesuai isi, dan kolom teks (merk, rangka,
  perluasan) yang menyesuaikan.
- **Satu angka tidak pernah dipecah.** Nilai, rate, dan premi dicetak tanpa
  pindah baris. Kalau kolom sempit, yang pindah baris adalah teks di sekitarnya,
  misalnya `Driver` dan `5.000.000` menjadi dua baris.
- Isi tabel, urutan kolom, dan ukuran huruf (9 px) tidak berubah.
- Di layar HP, tabel bisa digeser ke samping di dalam kartu dokumen, sama
  seperti tabel dokumen lain. Halamannya sendiri tidak melebar.

## File utama

- `components/documents/doc-blocks.tsx`: `VehicleScheduleAppendix`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint `components/documents/doc-blocks.tsx`, dan
  `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 140 lolos.
- **Uji cetak lokal** (Playwright dengan Chrome, sesi login sementara), draft
  PSKBI dua kendaraan dari SIT-089:
  - PDF A4: semua angka utuh, yaitu `250.000.000`, `600.000.000`,
    `850.000.000`, `25.000.000`, `20.000.000`, dan premi `8.857.500`,
    `14.415.000`, `23.272.500`.
  - Uji angka besar dengan mengganti teks di tabel, tanpa menyentuh database:
    Sum Insured `12.500.000.000`, total `17.250.000.000`, TPL dan PA
    `100.000.000`, No. Rangka 17 karakter, dan nama model panjang. Semua angka
    dan nomor rangka utuh, dan tabel tetap selebar isi halaman A4 (658 px).
  - Tampilan layar 1440 px dan 390 px: tidak ada angka terpecah, dan halaman
    tidak melebar.
  - Tanpa error halaman.
- Sesi sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- Kalau isi satu baris sangat panjang tanpa spasi, misalnya model ditulis
  `TOYOTA/AVANZA/1.5G/MPV/2023`, kolom itu tidak bisa menyempit. Dengan nilai
  wajar, tabel masih muat di A4 portrait.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
