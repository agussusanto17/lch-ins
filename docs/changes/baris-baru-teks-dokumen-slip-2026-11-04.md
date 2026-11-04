# Baris baru di teks bebas tetap tercetak di dokumen slip

- **Tanggal:** 2026-11-04
- **Branch:** `fix/baris-baru-teks-dokumen-slip`
- **PR:** [#111](https://github.com/agussusanto17/lch-ins/pull/111)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Special Conditions yang diketik tiga baris di form placing slip tercetak
menjadi satu baris di dokumen slip, misalnya "- Law and Courts applying to
Policy : Indonesia Law - Territorial Limit : Indonesia - Jurisdiction :
Indonesia" (Request & Temuan REQ-027, 4 November 2026). Teks di database sudah
memuat baris barunya; dokumen saja yang tidak menampilkannya. Jadi tidak perlu
editor HTML seperti wording klausula.

## Yang berubah

- **Special Conditions** dicetak dengan baris baru seperti yang diketik.
- Teks bebas lain yang di form juga berupa textarea, dengan masalah yang sama:
  - **Interest Section 1 dan Section 2** slip Property;
  - **Risk Location** dan **Correspondence Address** di tabel detail atas.
    Perbaikan dibuat di `InfoTable`, jadi nilai berbaris banyak di tabel
    detail dokumen SPPA dan renewal notice ikut tercetak per baris.
- Subjectivity, Closing Instruction, dan Cover Note Remarks sudah tercetak per
  baris sebelum perubahan ini.

## File utama

- `components/documents/doc-blocks.tsx`: `whitespace-pre-line` di sel nilai
  `InfoTable`, teks Interest Section, dan Special Conditions.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Keempat dokumen (Placing Slip, Quotation, Cover Note, Closing Instruction)
  dirender dari slip Property di database lokal dengan Special Conditions tiga
  baris dari contoh permintaan, Interest Section 1 tiga baris, dan Risk
  Location dua baris: ketiganya tercetak per baris. Hasil render dengan CSS
  hasil build dicek secara visual.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- `whitespace-pre-line` menggabungkan spasi berurutan menjadi satu, jadi spasi
  ganda untuk merapikan titik dua tidak ikut tercetak.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
