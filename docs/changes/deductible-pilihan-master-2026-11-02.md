# Deductible: satu tempat isian dan pilihan dari master data

- **Tanggal:** 2026-11-02
- **Branch:** `feat/deductible-pilihan-master`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Di bagian Deductible & Clauses placing slip ada dua tempat isian deductible:
- **Deductible per cover**, permintaan Harry 29 Oktober 2026
  ([deductible-per-cover-2026-10-29.md](deductible-per-cover-2026-10-29.md));
- **Deductible lama (belum per cover)**, sisa data per section yang belum
  dipindah tangan.

Agus menilainya dobel dan memutuskan hanya isian per cover yang dipakai. Agus
juga minta, sesuai permintaan Harry yang baru: deductible punya master data per
type of cover, dipilih dari dropdown di slip, dan teksnya tetap bisa diedit.

## Yang berubah

### Deductible lama dihapus

- Migration `20261102230100_legacy_deductible_per_cover` memindahkan semua
  deductible per section ke isian per cover lewat kata kunci perilnya:
  - kode di dalam kurung diutamakan, misalnya "(FLEXAS)", "(FWTWD)",
    "(EQVET)";
  - tanpa kode, kata kunci menentukan cover: earthquake/gempa ke EQVET,
    flood/banjir/windstorm ke FWTWD, riot/strike/civil commotion ke RSMDCC,
    other losses/vehicle impact ke Other Losses, fire/material damage ke
    FLEXAS. Label motor yang setara juga dikenali.
  - Baris yang menyebut dua peril masuk ke keduanya, misalnya "risiko banjir
    & gempa bumi".
  - Deductible Section 2 masuk ke BI PAR, atau BI EQVET bila menyebut gempa.
  - Baris yang tidak cocok masuk ke baris rate pertama slip.
  - Teks yang sudah ada di cover tujuan tidak ditimpa; teks lama ditambahkan
    di belakangnya dengan pemisah "; ".
  - Slip tanpa baris rate menyimpan deductible lamanya di Special Conditions.
- Form tidak lagi punya kotak "Deductible lama". Dokumen cetak hanya mencetak
  tabel deductible per cover.
- Field `deductiblesSection1/2` dihapus dari tipe, server, dan action. Nilai
  enum `DeductibleSection1/2` di `SlipItemKind` dibiarkan supaya tidak perlu
  mengubah enum di database.
- Data contoh seed (`lib/data/slips.ts`) memakai deductible per cover dengan
  pemetaan yang sama.

### Master Data > Deductible (baru)

- Tabel `deductible_options`: COB, type of cover (boleh kosong, artinya berlaku
  untuk semua type of cover di COB itu), teks, dan status aktif. Polanya sama
  dengan Master Clauses.
- Halaman baru `/master-data/deductibles` di submenu Master Data, setelah
  Wording Form:
  - filter COB dan pencarian;
  - tambah, edit, nonaktifkan, dan hapus dengan konfirmasi;
  - type of cover harus milik COB yang dipilih, dicek di server;
  - setiap perubahan tercatat di audit trail.

### Placing slip

- Isian deductible per cover punya tombol **Pilih** berisi pilihan untuk type
  of cover slip: yang khusus type of cover itu lebih dulu, lalu yang berlaku
  untuk semua type of cover di COB-nya. Memilih mengisi teks, dan teks itu tetap
  bisa diubah.
- Pilihan yang dinonaktifkan tidak muncul. Slip menyimpan salinan teks, jadi
  mengubah atau menghapus pilihan di master tidak mengubah slip yang sudah ada.
- Di bawah judul "Deductible per cover" ada petunjuk singkat: pilih type of
  cover dulu, atau tambahkan pilihan di master data bila belum ada.

## File utama

- `prisma/schema.prisma`: model `DeductibleOption`.
- `prisma/migrations/20261102230000_deductible_options/`: tabel baru.
- `prisma/migrations/20261102230100_legacy_deductible_per_cover/`: pemindahan
  data lama.
- `lib/server/master-data.ts`, `app/(app)/master-data/actions.ts`: CRUD dan
  audit.
- `components/master-data/deductible-options-tab.tsx`,
  `app/(app)/master-data/deductibles/page.tsx`: halaman master data.
- `lib/form-options.ts`, `lib/server/form-options.ts`: pilihan deductible ikut
  dimuat bersama COB dan type of cover; `deductibleChoicesFor()`.
- `components/underwriting/deductible-input.tsx`,
  `components/underwriting/placing-slip-form.tsx`: isian dengan tombol Pilih;
  kotak lama dihapus.
- `components/documents/doc-blocks.tsx`, `lib/server/placing-slips.ts`,
  `lib/data/types.ts`, `app/(app)/underwriting/actions.ts`: field lama dihapus.

## Dampak

- **Database:** dua migration, jalan otomatis saat build:
  - tabel baru `deductible_options`;
  - isi `slip_items` jenis `DeductibleSection1/2` dipindah ke
    `slip_rate_lines.deductible`, lalu dihapus.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.
- **Pengembang lokal:** setelah menarik branch ini, jalankan
  `npx prisma migrate deploy` dan `npx prisma generate`, lalu restart dev
  server.

## Verifikasi

- Migration pemindahan diuji di database lokal pada:
  - 14 deductible lama dari data seed;
  - enam baris dari screenshot Agus, misalnya "Fire, Lightning, … (FLEXAS) :
    NIL" dan "Vehicle Impact : NIL".
  - Hasilnya: FLEXAS, FWTWD, RSMDCC, dan EQVET masuk ke cover masing-masing;
    "Vehicle Impact" dan "Others Losses" masuk ke Other Losses; "banjir & gempa
    bumi" di slip motor masuk ke baris Flood dan Earthquake; waiting period
    masuk ke BI PAR. Sisa `slip_items` jenis deductible: 0.
- Uji fungsi server di database lokal:
  - tambah, ubah, nonaktifkan, dan hapus pilihan;
  - type of cover dari COB lain ditolak;
  - pilihan untuk PAR: yang khusus PAR lalu yang berlaku untuk semua type of
    cover; pilihan yang nonaktif hilang;
  - audit tercatat;
  - slip lama terbaca tanpa field deductible per section.
- `npx tsc --noEmit`, `npm run build`, dan `npx eslint` pada file yang diubah:
  lolos.

## Catatan untuk yang melanjutkan

- Belum ada isi awal di master deductible; LCH yang mengisi. Tanpa isi, isian
  per cover tetap teks bebas seperti sebelumnya.
- Pilihan berlaku untuk semua cover di slip itu (FLEXAS sampai BI EQVET).
  Bila LCH ingin pilihan dibatasi per cover, tambahkan kolom cover di
  `deductible_options`.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
