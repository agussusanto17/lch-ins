# Pilihan asuransi bisa diketik untuk mencari

- **Tanggal:** 2026-11-10
- **Branch:** `feat/cari-asuransi-panel`
- **PR:** [#212](https://github.com/agussusanto17/lch-ins/pull/212)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Permintaan LCH lewat Agus, 10 November 2026: kolom Perusahaan Asuransi di panel Security tetap berupa dropdown, tetapi nama asuransinya bisa diketik untuk mencari supaya lebih cepat.

## Yang berubah

- **Panel Security di form slip** (tahap quotation dan closing): kolom Perusahaan Asuransi sekarang combobox.
  - Ketik sebagian nama, misalnya "multi", dan daftar langsung tersaring.
  - Tombol panah tetap membuka seluruh daftar, sama seperti dropdown biasa.
  - Isinya tetap dari Master Data asuransi. Nama yang sudah tersimpan di slip tetap tampil walaupun tidak lagi ada di master.
  - Komponen baru: `components/underwriting/insurer-combobox.tsx`.
- **Form Policy Database:** "Asuransi (Leader)" juga bisa diketik untuk mencari. Kolom ini memakai `SearchSelect`, komponen yang sudah dipakai untuk klien.

## File utama

- `components/underwriting/insurer-combobox.tsx` (baru)
- `components/underwriting/placing-slip-form.tsx`
- `components/policies/policy-form.tsx`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.
- **Uji browser lokal** (Playwright dan Chrome, sesi sementara, tanpa menyimpan):
  - **Quotation slip `003/LCH-PLCMT/PS/X/2026`:**
    - Panel yang tersimpan (Astra Buana dan Sinar Mas) tampil di kolomnya.
    - Di baris baru, ketikan "multi" menyisakan "PT Asuransi Multi Artha Guna Tbk", dan nama itu terisi setelah dipilih.
    - Dibuka tanpa mengetik, dropdown menampilkan 12 asuransi.
  - **Form polis baru:** ketikan "sinar" menyisakan "PT Asuransi Sinar Mas", dan nama itu terisi setelah dipilih.
  - Tidak ada data yang tersimpan, dan tidak ada error di console.

## Catatan untuk yang melanjutkan

- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
