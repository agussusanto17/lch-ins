# Card Dashboard: brokerage jadi angka utama

- **Tanggal:** 2026-11-18
- **Branch:** `feat/dashboard-card-brokerage`
- **PR:** #264
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (luring, 17 November 2026, poin 1): di card Total Premium Dashboard, brokerage ditampilkan dengan font besar dan premium dengan font kecil.
- Sebelumnya card menampilkan Total Premium sebagai angka besar dan brokerage sebagai keterangan kecil di bawahnya.

## Yang berubah

- Card keempat di Dashboard sekarang berjudul **Total Brokerage**. Angka besarnya brokerage polis yang masih berjalan, dan keterangan kecilnya "Premium Rp …".
- Sumber angkanya tidak berubah: `totals.totalBrokerage` dan `totals.totalPremium` dari `computeTotals` di `lib/data/analytics.ts` (polis Active dan Expiring, dikonversi ke IDR).

## File utama

- `components/dashboard/dashboard-view.tsx`

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Perilaku baru:** hanya tampilan card. Grafik Produksi Bulanan dan halaman Report Operational tidak berubah.

## Verifikasi

- Browser lokal (port 3002, user SIT Admin): card tampil "TOTAL BROKERAGE Rp 277,9 jt" dengan keterangan "Premium Rp 2,66 M".

## Catatan untuk yang melanjutkan

- Premium di card masih premi sebelum diskon, karena polis belum menyimpan diskon. Setelah MoM poin 19 dikerjakan, angka ini menjadi Gross Premium (premi setelah diskon).
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
