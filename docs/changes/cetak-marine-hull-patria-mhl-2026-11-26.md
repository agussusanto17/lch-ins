# Marine Hull: cetak dua template slip (Patria dan MHL) dan dokumen Jadwal Kapal

- **Tanggal:** 2026-11-26
- **Branch:** `feat/marine-hull-cetak`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Lanjutan #323 (jadwal kapal Marine Hull, `docs/changes/jadwal-kapal-marine-hull-2026-11-26.md`). Harry, 26 November 2026: "Sheet buat 2 bro sama templatenya soalnya dari singapore ada 2 type, lihat patria dan MHL. berarti ada 2 template slip juga sesuai pdf".

Contoh di `documents/contoh slip/`:

- **CI H&M PT Patria Maritime Lines 2025** dan jadwal "PT PATRIA MARITIME_BULK CARRIER - FINALISED":
  - INTEREST section (A)/(B)/(C);
  - VESSEL `… & 3 OTHERS (AS PER SCHEDULE ATTACHED)`;
  - INSURED VALUE dan RATE `AS PER SCHEDULE ATTACHED`;
  - lampiran 16 kolom.
- **Signed slip MHL PT Salam Pacific Indonesia Lines 2022** dan lampirannya:
  - INTERESTS section 1/2/3;
  - VESSELS `… AND 106 OTHERS, DETAILS AS PER SCHEDULE ATTACHED.`;
  - `100% AS PER SCHEDULE ATTACHED FOR ALL SECTIONS.`;
  - lampiran 40 kolom dengan nilai tahun lalu.

## Yang berubah

- **Badan dokumen slip Marine Hull dengan jadwal kapal** (Placing Slip, Quotation, Cover Note, Closing Instruction) mengikuti format jadwal:
  - **INTEREST(S):** section yang dipakai jadwal, dengan kata-kata persis contoh.
    - Patria: (A) Hull, Materials & Machinery…, (B) Increased Value and/or Disbursements…, (C) War Risks Insurance.
    - MHL: 1 H&M, 2 War, 3 IV/AOI.
  - **VESSEL(S):** teks kapal per format. Satu kapal ditulis tanpa "OTHERS". Isian Detail Tambahan "Vessels" (misalnya "INCLUDING NEW AND/OR ACQUIRED VESSELS …") dicetak di bawahnya, bukan sebagai baris terpisah.
  - **INSURED VALUE** seperti contoh, lalu Total Sum Insured dan jumlah kapal.
  - **RATE & PREMIUM:**
    - RATE seperti contoh (MHL dengan "PER ANNUM PRO RATA …");
    - tabel per section berisi insured value dan premi dari total jadwal;
    - lalu Total Premium, diskon, biaya, dan Total Payable seperti biasa (Quotation internal ikut additional discount).
- **Dokumen Jadwal Kapal baru** (`/placement/vessel-schedule/[id]`), lampiran terpisah seperti contoh dari LCH Singapore:
  - Kolom persis lampiran contoh, dengan baris total untuk nilai pertanggungan dan premi.
    - Patria: judul nama tertanggung, kertas A4 landscape.
    - MHL: judul "… VESSEL SCHEDULE {tahun}", kolom bertahun tahun lalu dan tahun ini, kertas A3 landscape supaya 40 kolom tetap terbaca.
  - Dibuka dari tombol **Cetak jadwal kapal** di kartu jadwal kapal (form menyimpan perubahan dulu), atau dari tombol **Jadwal Kapal** di toolbar dokumen slip.
- **Section yang tidak dipakai** (semua kapal tanpa nilai dan rate di section itu) tidak dicetak dan tidak dibuatkan baris premi. Misalnya polis War saja (Hull War Risks) hanya punya War.
- **TSI per kapal:** H&M + IV + AOI, atau nilai War bila lebih besar (polis War saja). Sebelumnya polis War saja ber-TSI 0 dan tertahan cek release "Isi sum insured". Untuk jadwal Patria dan MHL contoh hasilnya sama dengan #323.

## File utama

- `components/documents/hull-documents.tsx`: `HullInterestBlock`, `HullPremiumAttached`, `VesselScheduleDocument`.
- `components/documents/slip-documents.tsx`: blok hull di empat dokumen dan tombol Jadwal Kapal.
- `components/documents/doc-blocks.tsx`: baris Detail "Vessels" tidak dicetak dua kali.
- `app/(print)/placement/vessel-schedule/[id]/page.tsx`.
- `lib/marine-hull.ts`:
  - kata-kata per format (`HULL_PRINT_TEXT`, `wording` per section);
  - `vesselSummaryText` per format;
  - `activeHullSections`;
  - `hullSumInsured` per kapal.
- `components/underwriting/slip-hull-schedule.tsx`: tombol Cetak jadwal kapal.
- `tests/marine-hull.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 464 lolos. Tes baru:
  - teks VESSEL MHL;
  - section yang dipakai;
  - polis War saja dengan satu baris War dan TSI = nilai War.
- **Lokal, slip uji Marine Hull 4 kapal Patria:**
  - **Placing Slip format Patria:** INTEREST (A)/(B)/(C) persis CI, VESSEL `… & 3 OTHERS (AS PER SCHEDULE ATTACHED)`, INSURED VALUE dan RATE `AS PER SCHEDULE ATTACHED`, premi per section 4.789.715.880,53 / 204.688.712,85 / 102.344.356,42, Total Payable 5.096.748.949,80.
  - **Format MHL** (diubah sementara lalu dikembalikan): section 1/2/3 dengan wording MHL, "AND 3 OTHERS, DETAILS AS PER SCHEDULE ATTACHED.", RATE "100% … PER ANNUM PRO RATA …". Dokumen Jadwal Kapal 40 kolom bertahun dengan `@page` A3 landscape.
  - **Jadwal Kapal Patria:** 16 kolom, 4 baris, baris total sama dengan PDF Harry (818.754.851.372,80 / 4.789.715.880,53 / 204.688.712.843,20 / 204.688.712,85 / 1.023.443.564.216,00 / 102.344.356,42).
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Simpan Word Cover Note** (`lib/cover-note-docx.ts`) belum memakai blok hull. Interest tercetak sebagai teks kapal dengan TSI, premi sebagai tiga baris flat. Sudah benar, tetapi belum memakai kata-kata format.
- **Berikutnya: rincian installment per section** (H&M per kuartal, IV dan War di cicilan 1), jawaban Harry poin 4.
