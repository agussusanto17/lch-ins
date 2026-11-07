# Baris rate Terrorism & Sabotage untuk slip PSATSI

- **Tanggal:** 2026-11-08
- **Branch:** `feat/rate-terrorism-sabotage`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini Tahap 3 nomor 16 dari analisa 26 contoh slip LCH (6 November 2026),
untuk contoh 09: CI Terrorism & Sabotage Wisma Habco, TOC 0116 PSATSI.

- **Contohnya:** polis tersendiri dengan satu rate atas sum insured Material
  Damage. Hitungannya 130.000.000.000 × 0,0105% = 13.650.000, ditambah policy
  cost dan stamp duty 50.000, sehingga total 13.700.000.
- **Masalahnya:** slip Property selalu memakai baris rate PAR + EQVET (FLEXAS,
  FWTWD, RSMDCC, Other Losses, BI PAR, EQVET, BI EQVET). Rate TS harus diakali
  lewat "Other Losses", sehingga cetakannya ikut format PAR/EQVET dan memuat
  "GRAND TOTAL PREMIUM (PAR+EQVET)".
- **Yang sudah dijawab Harry 6 November 2026:** brokerage boleh kosong atau
  0, dan kelas konstruksi boleh kosong. Bagian kelas konstruksi sudah
  dikerjakan di #153.

## Yang berubah

- **Baris rate Property mengikuti type of cover:**
  - PSATSI (0116) memakai satu baris **Terrorism & Sabotage** atas sum insured
    Section 1, dalam per mil seperti baris Property lain.
  - Type of cover Property lainnya tetap memakai baris PAR + EQVET.
- **Kapan baris rate berganti:**
  - Saat type of cover diganti di form slip. Baris yang labelnya tetap ada
    membawa rate, loss limit, dan deductible-nya.
  - Slip multi lokasi mendapat baris per lokasi.
  - Slip yang dibuat dari SPPA PSATSI langsung memakai baris ini.
- **Cetakan keempat dokumen slip:**
  - Slip TS satu lokasi memakai blok RATE & PREMIUM sederhana: cover, rate,
    premium, Total Premium, Admin Cost, Stamp Duty, dan Total Payable.
  - Format PAR/EQVET tidak dipakai.
  - Pada jadwal premi multi lokasi, subtotalnya tercetak "Premium", bukan
    "Premium PAR".
- **Release dan polis:**
  - Kelas konstruksi tidak diminta, karena slip tanpa FLEXAS/EQVET.
  - Tidak ada batas tarif OJK untuk baris TS.
  - Polis dari slip TS terbit sebagai satu polis.

## File utama

- `lib/data/reference.ts`: `TERRORISM_RATE_LINE`, `PROPERTY_COVER_RATE_LINES`,
  dan `propertyRateLabels`.
- `components/underwriting/slip-model.ts`: `propertyRateLinesPatch`, dan
  `slipFromSppa` yang memakai kode cover.
- `components/underwriting/placing-slip-form.tsx`: pilihan Type of Cover
  mengganti baris rate.
- `components/documents/doc-blocks.tsx`: label subtotal jadwal premi multi
  lokasi.
- `tests/terrorism-sabotage.test.ts`.

## Dampak

- **Database:** tidak ada migrasi. Slip Property yang sudah ada tidak
  berubah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 100 lolos. Lima test baru:
  - pemetaan baris per type of cover;
  - pergantian baris rate;
  - baris rate per lokasi;
  - premi contoh Wisma Habco (13.650.000 dan 13.700.000), tanpa permintaan
    kelas konstruksi;
  - slip dari SPPA.
- `npm run build`: lolos.
- **Uji browser** dengan sesi login lokal sementara, pada slip Property draft:
  - Ganti Type of Cover ke PSATSI: tujuh baris rate menjadi satu baris "Rate
    Terrorism & Sabotage".
  - Isi rate 0,105‰, Admin Cost 40.000, dan Stamp Duty 10.000, lalu Simpan
    Draft. Tersimpan sebagai PSATSI dengan premi 525.000 (5 M × 0,105‰).
  - Cetakan Placing Slip: blok RATE & PREMIUM berisi Terrorism & Sabotage
    0,105 IDR 525.000, lalu Total Payable 575.000, tanpa format PAR/EQVET.
  - Validasi release server: bisa release tanpa kelas konstruksi, dan tanpa
    alasan pengecualian tarif OJK.
- Data uji lokal sudah dihapus.

## Catatan untuk yang melanjutkan

- **Satuan rate:** contoh LCH menulis rate dalam persen (0,0105%), sistem
  Property memakai per mil (0,105‰). Kalau Harry memutuskan persen
  (pertanyaan konfirmasi no. 5), baris TS ikut bersama baris Property lain.
- **Basis rate tidak tercetak:** cetakan belum menulis "130.000.000.000 x
  0,0105%" seperti contoh, karena blok RATE & PREMIUM sederhana memang
  mencetak cover, rate, dan premium saja, sama dengan COB lain.
- **Okupasi:** contoh mencetak "OFFICE" saja. Sistem tetap meminta okupasi
  OJK, dan nama di slip bisa diganti "OFFICE", tetapi kodenya ikut tercetak.
- **Baris rate per TOC disimpan di kode** (`PROPERTY_COVER_RATE_LINES`). Kalau
  ada TOC Property lain dengan baris rate sendiri, tambahkan di sana.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
