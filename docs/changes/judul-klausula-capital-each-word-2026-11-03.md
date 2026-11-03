# Judul klausula Capital Each Word di daftar CLAUSES Placing Slip

- **Tanggal:** 2026-11-03
- **Branch:** `feat/judul-klausula-capital-each-word`
- **PR:** #79
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Di dokumen Placing Slip, daftar CLAUSES mencampur judul huruf kapital semua
(misalnya "MINOR ALTERATIONS AND REPAIRS CLAUSE (EXCLUDING ALOP / BI)") dengan
judul Capital Each Word ("Public Authorities Clause"). Dari 607 judul di library
klausula, 455 ditulis kapital semua. User meminta daftar CLAUSES ditampilkan
Capital Each Word. Bagian CLAUSE WORDING di akhir dokumen sudah benar dan
tidak diubah.

## Yang berubah

- Helper baru `clauseTitleCase` di `lib/data/clauses.ts`:
  - huruf pertama setiap kata kapital, sisanya kecil untuk kata yang tadinya
    kapital semua; kata yang sudah campuran (misalnya "Munich Re") dibiarkan;
  - singkatan di library LCH tetap kapital (ALOP, BI, IDR, USD, LMA, NMA,
    FLEXAS, TSI, PT, CIMB, TBK, dan lainnya), termasuk yang terlanjur ditulis
    "Usd" atau "Flexas" di data;
  - IT dan PAR hanya dianggap singkatan kalau sudah kapital semua, karena bisa
    juga kata biasa;
  - huruf setelah angka jadi kecil ("1ST" menjadi "1st"), dan "(S)" setelah
    kata menjadi "(s)".
- `ClausesBlock` memakai helper itu hanya untuk Placing Slip (daftar tanpa
  wording). Contoh hasil: "Minor Alterations And Repairs Clause (Excluding
  ALOP / BI)", "Escalation Clause (Max. 10%)".

## Yang sengaja tidak diubah

- CLAUSE WORDING (lampiran wording di Placing Slip).
- Quotation Slip, Cover Note, dan Closing Instruction. Di dokumen itu daftar
  CLAUSES menampilkan judul beserta wording, sama seperti CLAUSE WORDING.
- Data klausula di database dan nama wording form. Yang berubah hanya
  tampilan dokumen.

## File utama

- `lib/data/clauses.ts`: `clauseTitleCase` dan daftar singkatan.
- `components/documents/doc-blocks.tsx`: `ClausesBlock`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- Helper dijalankan ke 8 judul di contoh dokumen dan ke 479 judul unik library
  klausula. Hasilnya dicek untuk singkatan, ordinal, dan sufiks "(s)".
- `npm run lint`: tidak ada masalah.
- `npx tsc --noEmit`: tidak ada error.
- `npm run build`: lolos.
- E2E di browser (ego-browser, dev server lokal, slip
  002/LCH-PLCMT/PS-PAREQ/VIII/2026):
  - Placing Slip, daftar CLAUSES: semua judul Capital Each Word, misalnya
    "Industries Seepage, Pollution And Contamination Exclusion (NMA 1685)" dan
    "Waiver Clause (Article 1266 & 1267 Indonesian Civil Code)"; wording form
    tetap seperti semula.
  - Placing Slip, CLAUSE WORDING: judul tetap seperti data asli, misalnya
    "INDUSTRIES SEEPAGE, POLLUTION AND CONTAMINATION EXCLUSION (NMA 1685)".
  - Quotation Slip: daftar CLAUSES tetap seperti data asli.
  - Tidak ada error di log server.

## Catatan untuk yang melanjutkan

- Kalau LCH menambah klausula dengan singkatan baru, tambahkan singkatan itu ke
  `CLAUSE_ACRONYMS`. Kalau tidak, singkatan itu tampil sebagai kata biasa
  (misalnya "Abc").
- Kalau LCH ingin Quotation, Cover Note, atau CI ikut Capital Each Word, cukup
  hapus syarat `inline` di `ClausesBlock`.
