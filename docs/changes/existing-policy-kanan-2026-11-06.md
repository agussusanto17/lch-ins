# Existing Policy No. dicetak di sisi kanan

- **Tanggal:** 2026-11-06
- **Branch:** `feat/existing-policy-kanan`
- **PR:** [#158](https://github.com/agussusanto17/lch-ins/pull/158)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Masukan atas screenshot CI Professional Indemnity (pertanyaan 17, 6 November
2026): "Existing policy jika ada taruh di sisi kanan". Existing Policy No.
diisi lewat Detail tambahan (#138), dan sejak #152 menjadi label bawaan semua
type of cover. Sebelumnya nomor ini tercetak sebagai baris biasa di tabel
detail, setelah Occupation dan Risk Location.

## Yang berubah

- **Dokumen slip** (Placing Slip, Quotation, Cover Note, Closing
  Instruction):
  - Bila baris Detail tambahan Existing Policy No. diisi, nomornya tercetak
    rata kanan di atas tabel detail, tepat di bawah nomor dokumen, misalnya
    "Existing Policy No. : 45090625000035".
  - Baris itu tidak lagi muncul di tabel detail.
  - Tulisan label lain juga dikenali, misalnya "EXISTING POLICY NO" atau
    "Existing Policy Number".
- **Bila tidak diisi:** tidak ada yang tercetak.

## File utama

- `lib/slip-details.ts`: `isExistingPolicyLabel`.
- `components/documents/doc-blocks.tsx`: `DetailTable`.
- `tests/slip-details.test.ts`: satu tes baru.

## Dampak

- **Database:** tidak ada.
- **Slip yang sudah mengisi Existing Policy No.:** cetakannya ikut pindah ke
  kanan atas.
- **Env:** tidak ada.
- **Deploy:** setelah merge, sinkronkan fork.

## Verifikasi

- **Browser lokal**, di halaman uji sementara yang sudah dihapus: Closing
  Instruction PI dengan Existing Policy No. 45090625000035.
  - Nomornya tercetak sekali, rata kanan, di bawah nomor CI.
  - Tabel detail dimulai dari Type of Cover.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **Tafsiran "sisi kanan"** adalah rata kanan di bawah nomor dokumen. Kalau
  yang dimaksud posisi lain, misalnya di samping logo kop surat, cukup ubah
  `DetailTable`.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
