# Alasan tombol Quotation Slip dan Closing Instruction yang terkunci

- **Tanggal:** 2026-11-12
- **Branch:** `fix/alasan-tombol-quotation-panel`
- **PR:** [#233](https://github.com/agussusanto17/lch-ins/pull/233)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Temuan LCH, 12 November 2026.** Di form quotation slip 001/LCH-PLCMT/PS-PAREQ/XI/2026 (Released), tombol Quotation Slip dan Lanjut ke Closing Instruction abu-abu dan tidak bisa diklik. LCH mengira itu bug, karena ingin melihat cetakan quotation dan merevisi isiannya.
- **Penyebabnya panel asuransi yang belum lengkap.** Kedua tombol itu memang baru aktif setelah panel Security lengkap: minimal satu asuransi, total share 100%, tepat satu leader untuk co-insurance, dan tanpa nama dobel. Harry kemudian menemukan panelnya sendiri.
- **Alasannya tidak terlihat.** Alasan itu hanya ada di tooltip (`title`) tombol. Tombol nonaktif memakai `pointer-events: none`, jadi tooltip itu tidak pernah muncul. Daftar masalah panel ada di kotak kuning di section Security, jauh dari tombol.
- Aturannya tetap, karena Quotation Slip dan Closing Instruction mencetak SECURITY.

## Yang berubah

- **Keterangan di bar aksi.** Selama panel belum lengkap, bar aksi menampilkan keterangan kuning di baris sendiri, tepat di atas tombol, supaya deretan tombol tidak terdorong ke baris kedua:
  - **form quotation:** "Lengkapi panel asuransi untuk membuka Quotation Slip dan Closing Instruction: …";
  - **form closing:** "Lengkapi panel asuransi untuk menerbitkan Closing Instruction: …".

  Di ujungnya ditulis masalah pertama panel, misalnya "Tambahkan minimal 1 perusahaan asuransi." atau "Total share harus 100% (saat ini 60%, kurang 40%)."
- **Keterangan itu bisa diklik.** Section Security dibuka kalau sedang ditutup, lalu halaman menggulir ke sana.
- **Kapan tampil:** hanya di form quotation dan closing, untuk slip Released dan Quoted. Slip Draft sudah punya tombol release, dan slip Closed tidak memeriksa panel.
- **`SectionCard`** menerima `id` supaya section bisa menjadi tujuan gulir. Section Security memakai `id="security-panel"` dan `scroll-mt-36`, supaya judulnya tidak tertutup bar atas yang sticky.

## File utama

- `components/underwriting/placing-slip-form.tsx`: keterangan di bar aksi, `showSecurityPanel`, dan `id` section Security.
- `components/shared/section-card.tsx`: prop `id`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- **Uji browser lokal** (build `next start`, sesi admin sementara, tanpa menyimpan data):
  - **Form quotation slip Released dengan panel kosong:** keterangan tampil di atas tombol Quotation Slip yang nonaktif, dan tombol tetap satu baris di lebar 1280 px. Saat diklik, halaman menggulir ke section Security.
  - **Panel diisi satu asuransi 100%** (tanpa disimpan): keterangan hilang, dan tombol Quotation Slip aktif.

## Catatan untuk yang melanjutkan

- Tombol lain yang nonaktif dengan `title` punya masalah yang sama: tooltipnya tidak muncul. Kalau ada laporan serupa, pakai pola yang sama, yaitu keterangan yang terlihat di dekat tombol.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
