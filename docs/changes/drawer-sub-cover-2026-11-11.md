# Form Sub-Cover Type memakai drawer samping

- **Tanggal:** 2026-11-11
- **Branch:** `fix/drawer-sub-cover`
- **PR:** [#219](https://github.com/agussusanto17/lch-ins/pull/219)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Masukan Agus, 11 November 2026: form Tambah/Edit Sub-Cover di Master Data → COB & Cover Type tampil sebagai dialog di tengah layar. Formnya panjang (7 isian dan 4 switch), sehingga bagian atas dan bawahnya terpotong dan tidak bisa di-scroll. Agus meminta form ini dibuat drawer.

Penyebabnya ada di komponen dialog dasar (`DialogContent`). Dialog dipasang `fixed` di tengah layar tanpa batas tinggi dan tanpa `overflow`. Akibatnya, setiap dialog yang lebih tinggi dari layar terpotong. Padahal form entri panjang di aplikasi ini, seperti polis, klien, SPPA, dan klaim, sudah memakai `FormDrawer`.

## Yang berubah

- **Form Sub-Cover Type** (tambah dan edit) sekarang memakai `FormDrawer` dari kanan, sama seperti form polis:
  - judul dan deskripsi di atas;
  - isian di tengah yang bisa di-scroll;
  - tombol Batal dan Simpan selalu terlihat di bawah;
  - lebar drawer `max-w-xl` karena isiannya satu kolom;
  - Enter di isian teks ikut menyimpan.
- **Isian dan aksi simpan tidak berubah.** Ada tambahan penjaga supaya klik ganda tidak menyimpan dua kali.
- **Pengaman untuk semua dialog:** `DialogContent` dibatasi setinggi layar dikurangi 2rem, dan isinya bisa di-scroll kalau lebih panjang. Dialog yang pendek tampil seperti sebelumnya.

## File utama

- `components/master-data/cob-cover-tab.tsx`
- `components/ui/dialog.tsx`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.
- **Uji browser lokal** (Playwright dan Chrome, sesi sementara, layar 1280×720):
  - **Drawer:** "Tambah sub-cover" dari menu baris PROPERTY membuka drawer di kanan, selebar 576 px dan setinggi layar.
  - **Scroll:** isi form bisa di-scroll (tinggi isi 1053 px di area 560 px), dan tombol simpan terlihat tanpa scroll.
  - **Simpan:** sub-cover uji `0199 Uji Drawer` tersimpan dan drawer tertutup. Data uji dan audit-nya dihapus.
  - **Dialog lain:** dialog Klasifikasi OJK tetap pendek (336 px).
  - Tidak ada error di console.

## Catatan untuk yang melanjutkan

- **Dialog lain di Master Data masih berupa dialog.** Isinya 1 sampai 5 isian, misalnya Klasifikasi OJK, Deductible, Rekening, Mata Uang, Asuransi & Adjuster, Lookup, dan Kendaraan. Sekarang dialog-dialog itu sudah aman di layar pendek. Kalau LCH ingin semuanya drawer, polanya sama dengan perubahan ini.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
