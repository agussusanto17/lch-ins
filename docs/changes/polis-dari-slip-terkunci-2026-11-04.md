# Polis dari placing slip: data dikunci, satu slip satu polis

- **Tanggal:** 2026-11-04
- **Branch:** `fix/polis-dari-slip-terkunci`
- **PR:** [#103](https://github.com/agussusanto17/lch-ins/pull/103)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Form Tambah Polis bisa mengambil data dari placing slip: tertanggung, COB,
periode, nilai, dan panel asuransi. Ada tiga masalah (Request & Temuan
REQ-022, 4 November 2026):

- isian dari slip masih bisa diubah, jadi data polis bisa berbeda dari slip;
- slip PAR + EQVET terbit sebagai dua polis (Harry, 3 November 2026), tapi
  form mengisi premium gabungan ke setiap polis, sehingga produksi dobel;
- satu slip bisa dipilih untuk beberapa polis, sehingga premium dan additional
  fee terhitung dobel.

## Yang berubah

- **Isian yang dikunci** saat placing slip dipilih, atau saat polis yang diedit
  sudah tertaut ke slip: Klien, Nama Tertanggung, Asuransi (Leader), Class of
  Business, Type of Cover, Mata Uang, Total Sum Insured, Premium, Brokerage
  (%), Additional Fee, dan Risk Location.
- **Tanggal Mulai dan Tanggal Berakhir** dikunci hanya kalau slip punya
  periode. Slip dengan periode TBA tetap mengisi tanggal di form polis.
- **Tetap bisa diisi:** No. Polis, Tipe Polis, Polis Induk, Klasifikasi OJK,
  Lokasi Penempatan, Grouping Insured, dan softcopy.
- **Membuka kunci:** pada polis baru, kosongkan pilihan slip untuk mengisi
  manual. Polis yang sudah tersimpan dengan slip tetap terkunci; perubahan
  sesudah polis terbit lewat endorsement.
- **Slip PAR + EQVET:** kalau kedua kelompok punya premi, form menampilkan
  pilihan "Bagian Slip" (PAR atau EQVET).
  - Premium terisi sesuai bagian, dari subtotal kelompok yang sama dengan
    perhitungan dokumen slip.
  - Additional fee hanya ikut polis PAR; polis EQVET mendapat 0.
  - Total Sum Insured tetap penuh di kedua polis, karena objeknya sama.
- **Satu slip satu polis:** slip yang sudah menjadi polis tidak muncul lagi di
  pilihan. Slip PAR + EQVET muncul sampai kedua bagiannya punya polis. Polis
  lama tanpa bagian dianggap memakai seluruh slip.
- **Server** menolak polis kedua dari slip yang sama, bagian yang sama dua kali,
  dan slip PAR + EQVET tanpa bagian. Tautan yang tidak berubah saat polis
  diedit tidak diperiksa ulang, jadi polis lama tetap bisa disimpan.
- **Polis induk:** memilih polis induk pada polis dari slip hanya menautkan
  induknya, tanpa menimpa data dari slip.
- **Database:** kolom `slip_part` di tabel `policies`. Audit trail mencatat
  bagian slip.

## Asumsi

- Isian yang dikunci sama dengan isian yang diisi dari slip.
- Slip dipecah hanya kalau kelompok PAR dan EQVET sama-sama punya premi. Slip
  dengan satu kelompok tetap satu polis.
- Additional fee slip PAR + EQVET masuk polis PAR.
- Type of cover polis mengikuti slip; bagiannya tercatat di `slip_part`.
- Pilihan PAR dan EQVET tidak diambil dari master data, karena mengikuti
  kelompok perhitungan `calculateParEqvet` di kode.

## File utama

- `prisma/schema.prisma` dan
  `prisma/migrations/20261104120000_polis_bagian_slip/migration.sql`.
- `lib/calc.ts`: `slipPolicyParts` dan `slipPolicyPremium`.
- `lib/data/types.ts`: `SlipPart` dan `Policy.slipPart`.
- `lib/server/policies.ts`: `checkedSlipPart`, pemetaan, dan audit.
- `app/(app)/policies/actions.ts`: skema `slipPart`.
- `components/policies/policy-form.tsx`: kunci isian, `freeSlipParts`,
  `slipPatch`, pilihan Bagian Slip, dan `fromParent`.
- `components/audit/audit-fields.ts`: label audit.

## Dampak

- **Database:** migrasi baru, jalan otomatis saat build di Vercel dan VPS.
  Polis yang sudah ada mendapat bagian kosong.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Skrip ke database lokal (`lch_dev`), polis uji dihapus sesudahnya. Slip
  `005/LCH-PLCMT/PS-IAR/VIII/2026`:
  - PAR 363.529.500 + EQVET 141.335.000 = total 504.864.500;
  - polis tanpa bagian ditolak; polis PAR dan EQVET tersimpan; PAR kedua
    ditolak; polis EQVET tetap bisa diedit.
- Slip `004/LCH-PLCMT/PS-CAR/VII/2026` yang sudah dipakai polis
  CAR/2026/JTG/0019: polis kedua ditolak, polis lama tetap bisa disimpan.
- Form polis dirender dengan komponen asli dan drawer tiruan (tanpa portal):

  | Skenario | Hasil |
  |---|---|
  | Polis baru dari slip berperiode | isian slip terkunci, keterangan kunci tampil |
  | Slip dengan periode TBA | isian slip terkunci, tanggal tetap bisa diisi |
  | Polis baru tanpa slip | tidak ada yang terkunci |
  | Edit polis tertaut slip | terkunci, keterangan endorsement tampil |
  | Slip PAR + EQVET, bagian EQVET | pilihan Bagian Slip tampil, premium 141.335.000, fee 0 |
  | Slip CAR | tanpa pilihan Bagian Slip |

- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Isian yang dikunci dibungkus `<fieldset disabled className="contents">`,
  pola yang sama dengan form placing slip berstatus Closed.
- Kalau ternyata satu slip boleh menjadi beberapa polis (misalnya MV fleet
  per kendaraan), aturan di `checkedSlipPart` dan `freeSlipParts` perlu
  dilonggarkan.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
