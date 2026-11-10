# Cetak endorsement dan pembatalan dari Policy Database

- **Tanggal:** 2026-11-10
- **Branch:** `feat/cetak-endorsement`
- **PR:** [#215](https://github.com/agussusanto17/lch-ins/pull/215)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Laporan Agus, 10 November 2026: endorsement di Policy Database belum punya tampilan cetak. Agus menunjuk contoh `documents/45020126015995 - EDM 01.pdf`, yaitu endorsement dari PT Asuransi Multi Artha Guna. Untuk pembatalan, contohnya `45020126008633 - CANCELLATION.pdf`. Di `documents/contoh slip` belum ada contoh endorsement buatan LCH.

## Yang berubah

- **Halaman cetak baru `/policies/endorsement/[id]`**, untuk record bertipe Endorsement atau Cancellation. Record bertipe lain dijawab 404.
- **Isi dokumen mengikuti EDM 01**, dengan kop dan tanda tangan LCH:
  - **Judul:** ENDORSEMENT, atau CANCELLATION untuk pembatalan. Di bawahnya nomor record di Policy Database.
  - **Data polis dengan label dua bahasa:**
    - Lampiran No. / Endorsement No. (dua digit, dari urutan endorsement);
    - polis induk (Attaching to and forming part of Policy No.);
    - nama dan alamat tertanggung (alamat utama klien);
    - masa pertanggungan polis induk, dan jenis pertanggungan;
    - nilai pertanggungan sebelum endorsement ini, yaitu polis induk ditambah endorsement sebelumnya;
    - perubahan dan nilai sesudahnya, kalau sum insured berubah;
    - risiko sendiri dari slip sumber polis induk.
  - **Kalimat perubahan:**
    - Endorsement: "Dengan ini dicatat dan disetujui bahwa terhitung sejak tanggal …, pada polis tersebut di atas diadakan perubahan sebagai berikut :", diikuti isi Remarks.
    - Pembatalan: kalimatnya berakhir setelah tanggal. Tanpa remarks, tertulis "Polis ini DIBATALKAN."
    - Kedua jenis ditutup "Semua syarat dan ketentuan lainnya tidak ada perubahan."
  - **Perhitungan premi:** premi tambahan atau pengembalian premi (dalam kurung, seperti di contoh) beserta totalnya.
  - **Klausul** dari slip sumber, **SECURITY**, lalu tanda tangan "Jakarta, <tanggal endorsement dicatat>".
- **Keterangan di atas dokumen (tidak ikut tercetak)** muncul kalau Remarks kosong atau polis induk tidak ditemukan.
- **Menu baris Policy Database** mendapat "Cetak endorsement" atau "Cetak cancellation" untuk record endorsement dan pembatalan. Menu ini juga tersedia untuk role yang hanya bisa Lihat.
- **Panel asuransi di dokumen** dipisah menjadi `SecurityTable`, supaya bisa dipakai slip maupun polis.

## File utama

- `app/(print)/policies/endorsement/[id]/page.tsx` (baru)
- `components/documents/endorsement-document.tsx` (baru)
- `lib/server/endorsement-slip.ts` (baru): memuat polis, polis induk, slip, alamat klien, dan nilai pertanggungan sebelumnya.
- `lib/endorsement-slip.ts` (baru): judul, nomor, kalimat, label, dan format angka.
- `components/documents/doc-blocks.tsx`: `SecurityTable`.
- `components/policies/policy-database.tsx`: menu cetak.
- `tests/endorsement-slip.test.ts` (baru, 6 tes)

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts` (178 tes, termasuk 6 tes baru), dan `npm run build`: lolos.
- **Uji browser lokal** (Playwright dan Chrome, sesi sementara):
  - **`SIT/PA/2026/001-END1`** (Remarks diisi sementara dengan teks gaya EDM 01):
    - menu baris memuat "Cetak endorsement", dan halaman cetak terbuka dari menu itu;
    - semua bagian tercetak: judul, Endorsement No. 01, polis induk, kalimat perubahan, Remarks, perhitungan premi IDR 113.013,70, SECURITY, dan tanda tangan;
    - Remarks dikembalikan setelah uji.
  - **`PAR/2025/JKT/0871-END01`** (tanpa Remarks): keterangan "Remarks endorsement ini masih kosong" muncul. Polis induknya ditautkan sementara ke slip 003 lewat SQL, lalu dikembalikan. Risiko sendiri dan 8 klausul dari slip tercetak.
  - **Polis bertipe Baru** dibuka di alamat cetak endorsement: 404.
  - **Marketing** (Policy Database hanya Lihat): menu "Cetak endorsement" ada, dan halaman cetak terbuka.
  - Tidak ada error di console.

## Catatan untuk yang melanjutkan

- **Jenis Pertanggungan** hanya berisi type of cover polis. Label rate line slip tidak dipakai, karena isinya campuran pertanggungan, loading (misalnya "Loading Rate Comprehensive"), dan label umum "Rate (%)".
- **Yang belum ikut dicetak** karena datanya belum ada di sistem: "Subject to no claim as at …", Biaya Endorsement, rincian premi per pertanggungan, dan data objek (kendaraan) seperti di EDM 01.
- **Belum ada penomoran dokumen endorsement LCH.** Yang dicetak adalah nomor record dan urutan endorsement-nya.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
