# Nama okupasi bisa diringkas di placing slip

- **Tanggal:** 2026-11-03
- **Branch:** `feat/okupasi-nama-di-slip`
- **PR:** [#78](https://github.com/agussusanto17/lch-ins/pull/78)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Sejak data okupasi disamakan dengan Lampiran I
([tarif-okupasi-lampiran-1-2026-11-02.md](tarif-okupasi-lampiran-1-2026-11-02.md)),
sebagian nama okupasi sangat panjang. Contohnya 29371 Private Warehouses memuat
tiga syarat gudang, lebih dari 800 karakter. Teks sepanjang itu ikut tercetak di
dokumen slip.

Agus minta nama okupasi bisa diedit di level placing slip, seperti override
klausul. Master okupasi tetap sesuai OJK.

## Yang berubah

- **Isian baru "Nama okupasi di slip"** di bawah pilihan Okupasi (OJK):
  - otomatis berisi nama OJK, dan bisa diringkas, misalnya menjadi "Private
    Warehouses";
  - kode okupasi tidak ikut diedit dan selalu tercetak, jadi dokumen menjadi
    "29371 - Private Warehouses";
  - tombol **Sesuai OJK** mengembalikan nama dari master;
  - mengganti pilihan okupasi mengosongkan nama yang sudah diedit;
  - isian dikosongkan berarti slip memakai nama OJK.
- **Dokumen slip** (Placing Slip, Quotation Slip, Cover Note, Closing
  Instruction) mencetak nama yang diedit.
- **Daftar Placement** menampilkan nama yang sama, dan pencarian mencocokkan
  nama OJK maupun nama yang diedit.
- **Salin slip** ikut menyalin nama yang diedit.
- Batas tarif FLEXAS dan validasi release tetap memakai kode okupasi dari
  master, jadi tidak terpengaruh.

## File utama

- `prisma/schema.prisma`, `prisma/migrations/20261103100000_slip_occupation_label/`:
  kolom `placing_slips.occupation_label`.
- `lib/data/types.ts`, `lib/server/placing-slips.ts`,
  `app/(app)/underwriting/actions.ts`: field `occupationLabel`, maksimal 500
  karakter.
- `components/underwriting/slip-model.ts`: `occupationParts()` dan
  `slipOccupationText()`.
- `components/underwriting/placing-slip-form.tsx`: isian nama okupasi di slip.
- `components/documents/doc-blocks.tsx`, `components/underwriting/slip-table.tsx`:
  tampilan.

## Dampak

- **Database:** satu migration, menambah kolom nullable. Slip yang sudah ada
  tidak berubah dan tetap memakai nama OJK.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.
- **Pengembang lokal:** jalankan `npx prisma migrate deploy` dan
  `npx prisma generate`, lalu restart dev server.

## Verifikasi

- Simpan slip Property lokal dengan okupasi 29371 dan nama "Private
  Warehouses": nama tersimpan dan terbaca ulang. Teks dokumen menjadi "29371 -
  Private Warehouses", dan batas FLEXAS Kelas I tetap 1,127 sampai 1,260‰.
- Nama dikosongkan lalu disimpan: kolom kembali kosong dan dokumen memakai nama
  OJK lengkap.
- `npx tsc --noEmit`, `npm run build`, dan `npx eslint` pada file yang diubah:
  lolos.

## Catatan untuk yang melanjutkan

- SPPA belum punya isian serupa; SPPA tetap memakai nama OJK.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
