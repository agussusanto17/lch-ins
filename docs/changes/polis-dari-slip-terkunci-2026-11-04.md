# Polis dari placing slip: data dari slip dikunci

- **Tanggal:** 2026-11-04
- **Branch:** `fix/polis-dari-slip-terkunci`
- **PR:** [#103](https://github.com/agussusanto17/lch-ins/pull/103)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Form Tambah Polis bisa mengambil data dari placing slip: tertanggung, COB,
periode, nilai, dan panel asuransi. Semua isian itu masih bisa diubah, jadi
data polis bisa berbeda dari slip yang menjadi dasarnya. Diminta isian dari slip
dikunci (Request & Temuan REQ-022, 4 November 2026).

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
  sesudah polis terbit lewat endorsement. Keterangan ini tampil di form.
- **Polis induk:** memilih polis induk pada polis dari slip hanya menautkan
  induknya, tanpa menimpa data dari slip.

## Asumsi

- Isian yang dikunci sama dengan isian yang diisi dari slip.
- Kunci berlaku di form. Server tidak membandingkan nilai polis dengan slip.

## File utama

- `components/policies/policy-form.tsx`: `slipLocked`, `periodLocked`,
  `fieldset` yang dikunci, dan `fromParent`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Form polis dirender dengan komponen asli dan drawer tiruan (tanpa portal),
  memakai slip Closed `004/LCH-PLCMT/PS-CAR/VII/2026` dari database lokal:

  | Skenario | Hasil |
  |---|---|
  | Polis baru dari slip berperiode | ketiga kelompok isian terkunci, keterangan kunci tampil |
  | Slip dengan periode TBA | isian slip terkunci, tanggal tetap bisa diisi |
  | Polis baru tanpa slip | tidak ada yang terkunci |
  | Edit polis tertaut slip (CAR/2026/JTG/0019) | terkunci, keterangan endorsement tampil |

- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Isian yang dikunci dibungkus `<fieldset disabled className="contents">`,
  pola yang sama dengan form placing slip berstatus Closed.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
