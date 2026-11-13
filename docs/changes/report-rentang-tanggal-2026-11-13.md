# Report Operational: filter rentang tanggal

- **Tanggal:** 2026-11-13
- **Branch:** `feat/report-rentang-tanggal`
- **PR:** [#247](https://github.com/agussusanto17/lch-ins/pull/247)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Report Operational hanya punya Periode Bulanan, Kuartalan, atau Tahunan, dengan Bulan acuan 12 bulan terakhir.
- **Permintaan Agus, 13 November 2026:** filter memakai tanggal awal dan akhir, supaya bisa mengambil satu tahun, tiga bulan, atau beberapa bulan sekaligus.

## Yang berubah

- **Periode mendapat pilihan Rentang tanggal**, dengan isian Dari tanggal dan Sampai tanggal sebagai pengganti Bulan acuan.
  - Saat pindah ke Rentang tanggal, isiannya terisi dari periode yang sedang dilihat, misalnya Tahunan 2026 menjadi 01 Jan 2026 s/d 31 Des 2026.
  - Di samping isian tertulis jumlah harinya. Kartu Polis Diproduksi menulis rentangnya, termasuk saat dicetak.
  - Tanggal yang tertukar dibalik otomatis. Isian kosong memakai tanggal yang lain, supaya report tetap terisi selama user mengetik.
- **Ikut rentang yang dipilih:**
  - polis diproduksi dan klaim (tetap dari tanggal mulai polis dan tanggal kejadian);
  - Rekap Produksi (Excel);
  - nama file export, misalnya `polis-2025-01-01-sd-2025-12-31`;
  - judul Trend Produksi, yang memakai tahun tanggal akhir.
- Bulanan, Kuartalan, dan Tahunan tetap seperti sebelumnya.

## File utama

- `components/reports/report-view.tsx`.
- `lib/report-range.ts`: `customRange` dan `rangeDays`.
- `tests/report-range.test.ts`: 2 tes.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos, kecuali 3 tes margin cetak 18 mm di `tests/documents.test.ts` yang sudah gagal di main sejak #236.
- **Uji browser lokal** (build `next start`, sesi admin sementara, DB lokal):
  - Pindah dari Tahunan November 2026 ke Rentang tanggal mengisi 01 Jan 2026 s/d 31 Des 2026 (365 hari) dengan 17 polis, sama dengan DB.
  - 01 Nov 2025 s/d 28 Feb 2026 menampilkan 3 polis (120 hari).
  - Tahun 2025 penuh menampilkan 5 polis, dan Trend Produksi menjadi 2025.
  - Isian tertukar 31 Mar s/d 01 Jan 2026 menjadi 01 Jan s/d 31 Mar 2026 (90 hari, 5 polis).
  - Rekap Produksi untuk 2025 mengambil tepat 5 polis yang mulai di 2025.
  - Kembali ke Tahunan menampilkan Bulan acuan dan 17 polis lagi.
  - Tidak ada error console.

## Catatan untuk yang melanjutkan

- Bulan acuan tetap 12 bulan terakhir. Periode yang lebih lama memakai Rentang tanggal.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
