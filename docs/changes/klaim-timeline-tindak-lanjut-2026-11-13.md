# Riwayat tindak lanjut klaim tampil sebagai timeline

- **Tanggal:** 2026-11-13
- **Branch:** `feat/klaim-timeline-tindak-lanjut`
- **PR:** [#252](https://github.com/agussusanto17/lch-ins/pull/252)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Permintaan Agus, 13 November 2026:** di detail klaim, tab Tindak Lanjut, riwayat catatan dibuat seperti timeline status, dengan garis vertikal di kiri.
- **Sebelumnya** tiap catatan tampil sebagai kartu terpisah berbingkai, dengan ikon kalender di depan tanggal.

## Yang berubah

- **Tab Tindak Lanjut di detail klaim:** riwayat catatan berupa timeline, terbaru di atas:
  - titik biru per catatan, dihubungkan garis vertikal 2 px di kiri dari catatan terbaru sampai yang paling lama;
  - titik catatan terbaru diberi lingkaran tipis sebagai penanda status terakhir;
  - tanggal tebal di baris pertama, nama pencatat dan tombol hapus tetap di kanan;
  - isi catatan memakai ukuran teks yang sama dengan deskripsi kerugian (14 px), naik dari 12 px.
- Polanya sama dengan Timeline di tab Ringkasan: titik dan garis di kolom kiri, isi di kanan.
- Daftar ditulis sebagai `<ol>` dengan `<time>`, jadi urutannya terbaca oleh pembaca layar.
- Form Catat Tindak Lanjut Baru dan tampilan kosong tidak berubah.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint `components/claims/claim-detail-sheet.tsx`, dan `npm run build`: lolos.
- **Uji browser lokal** (build `next start`, sesi sementara role Klaim, DB lokal): empat catatan uji pada CLM/2026/07/0030 tampil urut 13, 12, 11, lalu 10 Nov. Garisnya menyambung dari titik pertama sampai titik terakhir dan berhenti di catatan terakhir. Catatan panjang terbungkus di kolom kanan. Tidak ada error console. Catatan uji dan sesi sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
