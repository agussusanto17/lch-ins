# Slip ber-section untuk CAR dan EAR

- **Tanggal:** 2026-11-06
- **Branch:** `feat/slip-section-engineering`
- **PR:** [#143](https://github.com/agussusanto17/lch-ins/pull/143)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini Tahap 2 dari analisa 26 contoh slip LCH (6 November 2026), dan Agus
meminta langsung dilanjutkan setelah Tahap 1 di-merge. Contoh CAR (SPIL
Kalianak) dan EAR (AICRANE) membagi slip menjadi Section 1 Material Damage
dan Section 2 Third Party Liability:

- Interest dan nilainya per section. Section 2 berupa limit TPL, misalnya 10%
  dari Section 1, tanpa premi tersendiri.
- Deductible per section.
- Klausul dalam tiga kelompok: tanpa judul, Section 1, dan Section 2.
- Detail proyek: The Project, Construction Period, Maintenance Period.

Di sistem, pembagian section hanya ada untuk Property. COB lain punya satu
daftar Interest, satu daftar deductible, dan satu daftar klausul.

## Yang berubah

- **Master Data > type of cover:** isian baru "Pakai Section 1 & 2".
  - Migrasi menyalakannya untuk CAR (0801) dan EAR (0802).
  - Label Detail tambahan keduanya ditambah Construction Period dan
    Maintenance Period (CAR), serta Testing & Commissioning, Maintenance
    Period, dan Basis of Indemnity (EAR). Label hanya diubah bila belum
    diubah LCH.
- **Form placing slip** (COB selain Property dan Motor Vehicle):
  - Memilih type of cover yang memakai section langsung menyalakan section.
    Bisa juga dinyalakan atau dimatikan per slip lewat switch "Pakai Section 1
    & 2" di Interest Insured.
  - Interest Insured terbagi dua daftar. Limit yang ditambah di Section 2
    otomatis menjadi "Limit saja", jadi tidak ikut TSI dan premi.
  - Deductible berisi satu daftar per section.
  - Klausul punya tiga kelompok seperti Property, dengan judul Section 2
    "Third Party Liability".
  - Tabel Rate & Premium menulis section tiap objek.
- **Dokumen** (keempat dokumen slip): INTEREST INSURED, DEDUCTIBLE &
  CONDITIONS, dan CLAUSES dicetak per section dengan judul "Section 1 —
  Material Damage" dan "Section 2 — Third Party Liability". Nomor klausul
  mulai dari 1 di tiap kelompok, sesuai keputusan sebelumnya.

## File utama

- `prisma/schema.prisma` dan migrasi `20261106060000_slip_section_engineering`:
  kolom `cover_types.uses_sections`, `placing_slips.uses_sections`, dan
  `slip_items.section_no`.
- `components/underwriting/slip-model.ts`:
  - `slipSectionTitles`: judul section Property atau CAR/EAR;
  - `sectionItemsPatch`;
  - deductible per section.
- `components/underwriting/placing-slip-form.tsx`: switch, Interest per
  section, dan klausul tiga kelompok.
- `components/documents/doc-blocks.tsx`: cetakan per section.
- `components/master-data/cob-cover-tab.tsx`, `lib/server/master-data.ts`:
  isian di Master Data.
- `lib/server/placing-slips.ts`, `lib/server/tariffs.ts`,
  `app/(app)/underwriting/actions.ts`: simpan, baca, validasi, dan duplikat.
- `tests/calc.test.ts`: tiga tes baru.

## Dampak

- **Database:** migrasi menambah tiga kolom, menyalakan section untuk CAR dan
  EAR, dan menambah label periode proyek. Jalan otomatis saat build di Vercel
  dan VPS.
- **Slip CAR dan EAR yang sudah ada:** tidak berubah, karena section tetap mati
  sampai dinyalakan per slip. Slip baru dengan type of cover CAR atau EAR
  langsung ber-section.
- **Polis:** TSI polis dari slip ber-section tidak memasukkan limit TPL
  Section 2.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Script uji ke fungsi server** (sudah dihapus): slip CAR dengan contract
  works 2,5 M di Section 1 dan TPL 250 jt di Section 2.
  - Tanda section, section objek, dan deductible per section tersimpan dan
    terbaca kembali.
  - TPL tersimpan sebagai limit.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - Memilih type of cover CAR menyalakan section dan memunculkan label
    proyek.
  - Interest Insured terbagi "Tambah objek Section 1" dan "Tambah limit
    Section 2".
  - Klausul punya kelompok Section 1 dan Section 2 Third Party Liability.
  - Closing Instruction mencetak Interest dan deductible per section. TPL
    tercetak "Limit IDR 250.000.000", Total Sum Insured 2.500.000.000, dan
    premi 3.750.000, sama dengan CI CAR SPIL.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (61 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- **Periode proyek** masih berupa teks di Detail tambahan. Tanggal akhir polis
  diisi manual sebagai akhir maintenance.
- **Limit TPL** diketik manual. Belum ada tombol "10% dari Section 1".
- **Judul section** masih tetap, dan belum bisa diubah per slip. Contoh LCH
  kadang menulis "Section I – On Contract Works".
- **Renewal Notice** belum membedakan polis proyek. Polis CAR dan EAR akan
  ikut muncul menjelang akhir maintenance.
- **Marine Hull Patria** (Section A, B, C) bisa memakai pola yang sama di
  Tahap 3, dengan judul section yang bisa diatur.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
