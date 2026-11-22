# Sub akun EF dan SPIL Program diatur di master data

- **Tanggal:** 2026-11-22
- **Branch:** `feat/sub-akun-ef-spil-master`
- **PR:** #302
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Rekap Produksi (#300) mengisi dua kolom catatan Team LCH dengan aturan nama yang tertanam di kode:

- **sub akun pnl baris EF:** "EF (MAG)" bila nama asuransi memuat Multi Artha Guna, selain itu "EF";
- **spil/non spil:** SPIL bila Grouping Insured, nama klien, atau tertanggung memuat "SPIL" atau "Salam Pacific".

Jawaban 22 November 2026:

- SPIL tidak punya daftar resmi; LCH menentukannya sendiri.
- Untuk sub akun EF, pertanyaannya "di-setting di mana". Belum ada setting-nya.

Jadi kedua aturan dipindah ke master data, supaya LCH bisa mengubahnya tanpa developer.

## Yang berubah

- **Master Data > Asuransi & Adjuster:**
  - kolom dan pilihan baru **Sub akun EF** per asuransi;
  - pilihannya dari lookup baru `ef_sub_account`, yaitu Master Data > Nilai Pilihan Dropdown, kategori "Sub Akun EF (Rekap Produksi)";
  - isi awal lookup: EF, EF (MAG), DLL. LCH bisa menambah pilihan sendiri;
  - asuransi baru otomatis EF.
- **Database Klien:** switch **SPIL Program** di form klien, di samping Cabang. Detail klien juga menampilkannya.
- **Rekap Produksi:**
  - baris EF memakai Sub akun EF asuransinya; asuransi tanpa pilihan ditulis EF;
  - spil/non spil = SPIL bila klien polis ditandai SPIL Program. Nama tidak lagi menentukan;
  - sheet Keterangan ikut diperbarui.
- **Migrasi `20261122060000_sub_akun_ef_spil_program`:**
  - menambah lookup `ef_sub_account`, kolom `insurers.fee_sub_account_id`, dan kolom `clients.spil_program`;
  - isian awal mengikuti aturan nama lama: asuransi bernama Multi Artha Guna = EF (MAG), asuransi lain = EF, klien bernama SPIL atau Salam Pacific = SPIL Program;
  - akibatnya hasil rekap untuk data yang sudah ada tidak berubah.
- **Seed:** grup lookup `ef_sub_account`.

## Asumsi

- **SPIL ditandai per klien, bukan per polis.** Di rekap produksi 19 November, semua baris SPIL (21 baris, grouping SALAM PACIFIC INDONESIA LINES) berasal dari klien Salam Pacific. Polis tanpa klien ditulis Non SPIL.
- **Asuransi selain MAG tetap EF** sampai LCH memilih lain (DLL atau pilihan baru). Pertanyaan "EF sendiri atau DLL" belum dijawab, jadi isinya tidak diubah.
- **Lookup `ef_sub_account` tidak dikunci** (bukan `is_system`). LCH boleh menambah, mengganti label, atau menonaktifkan pilihan. Kalau pilihan yang dipakai asuransi dihapus, asuransinya kembali ke EF (FK `ON DELETE SET NULL`).

## File utama

- `prisma/schema.prisma`, migrasi `20261122060000_sub_akun_ef_spil_program`, `prisma/seed.ts`.
- **Asuransi:**
  - `lib/server/master-data.ts`;
  - `app/(app)/master-data/actions.ts`;
  - `app/(app)/master-data/partners/page.tsx`;
  - `components/master-data/insurers-adjusters-tab.tsx`;
  - `components/master-data/lookup-values-tab.tsx`.
- **Klien:**
  - `lib/data/types.ts`;
  - `components/marketing/client-form.tsx`;
  - `components/marketing/client-detail.tsx`;
  - `app/(app)/marketing/actions.ts`;
  - `lib/server/clients.ts`.
- **Rekap:** `lib/production-recap.ts` dan `lib/server/production-recap.ts`.
- **Lainnya:** `components/audit/audit-fields.ts` (label audit trail) dan `tests/production-recap.test.ts`.

## Dampak

- **Database:** satu migrasi berisi kolom baru, lookup baru, dan isian awal. Migrasi jalan otomatis saat build/deploy. Tidak ada data yang dihapus.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Report:** hasil Rekap Produksi untuk data yang ada sama. Hasilnya baru berubah kalau LCH mengganti pilihan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 409 lolos. Tes yang diubah:
  - sub akun EF dari master data: EF (MAG), DLL, dan kosong = EF;
  - spil/non spil dari tanda klien, bukan dari nama;
  - workbook tiga sheet.
- **Migrasi di DB lokal:**
  - `prisma migrate diff` dari DB ke schema tidak menunjukkan selisih untuk kolom baru;
  - isian awal: MAG = EF (MAG), 11 asuransi lain = EF.
- **Regex Postgres untuk isian awal:**
  - SPIL: "PT SALAM PACIFIC INDONESIA LINES", "PT SPIL gudang Kalianak", "PT. SPIL (Fleet Office)", "SPIL Warehouse";
  - bukan SPIL: "MySPIL", "PT Spill Over".
- **Browser lokal** (`lch.localhost:3002`, user SIT Admin):
  - Asuransi & Adjuster: kolom Sub akun EF tampil (MAG = EF (MAG)); Astra Buana diganti ke DLL lewat dialog dan tersimpan;
  - Database Klien: switch SPIL Program dinyalakan dan disimpan, detail klien menampilkan "Ya";
  - Rekap Produksi 2026, ditangkap di halaman tanpa diunduh: klien yang ditandai = SPIL, klien lain Non SPIL; baris EF Astra Buana = DLL, Sinar Mas = EF;
  - Nilai Pilihan Dropdown: kategori Sub Akun EF (Rekap Produksi) berisi EF, EF (MAG), DLL;
  - tidak ada error console. Data uji dikembalikan dan sesi uji dihapus.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Setelah deploy ke produksi,** cek Database Klien. Klien SPIL yang namanya tidak memuat "SPIL" atau "Salam Pacific" perlu ditandai manual.
- **Kalau modul Finance nanti punya akun pnl (COA),** Sub akun EF bisa dipetakan ke akun itu.
