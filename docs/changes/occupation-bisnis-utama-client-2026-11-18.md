# Client: Occupation / Bisnis Utama menggantikan COB Utama

- **Tanggal:** 2026-11-18
- **Branch:** `feat/occupation-bisnis-utama-client`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (luring, 17 November 2026), poin 2: COB Utama di client dihapus dan diganti occupation / bisnis utama.
- Ketentuan yang ditetapkan Agus (18 November 2026):
  - pilihan diambil dari Master Data supaya seragam untuk report;
  - daftar awal memakai 21 kategori bidang usaha KBLI;
  - Team LCH bisa menambah dan mengubah daftarnya sendiri;
  - COB yang dipakai client tetap terlihat dari daftar polis di detail client.

## Yang berubah

- **Master Data:**
  - tipe dropdown baru "Occupation / Bisnis Utama" (`business_line`), berisi 21 kategori KBLI 2020 (A–U);
  - beberapa nama diringkas, misalnya kategori N menjadi "Aktivitas Penyewaan, Ketenagakerjaan, Agen Perjalanan dan Penunjang Usaha";
  - lookup ini bukan lookup sistem, jadi Team LCH bisa menambah, mengubah, dan menonaktifkan nilainya.
- **Form client:**
  - isian Class of Business Utama diganti Occupation / Bisnis Utama;
  - isian ini wajib untuk korporasi dan opsional untuk perorangan.
- **Daftar client:**
  - kolom COB Utama diganti Bisnis Utama. Nama panjang turun menjadi paling banyak 2 baris, dengan nama lengkap di tooltip;
  - filter "Semua COB" diganti "Semua bisnis utama";
  - kolom ekspor ikut diganti.
- **Detail client:**
  - judul tidak lagi menampilkan COB, diganti bisnis utama bila sudah diisi;
  - Data KYC menampilkan Occupation / Bisnis Utama.
- **Data COB lama:**
  - kolom `clients.cob_id` tetap ada dan nilainya tidak dihapus. Edit client tidak menimpanya karena form tidak lagi mengirim COB;
  - COB lama masih dipakai sebagai COB awal SPPA dan slip yang dibuat dari client, dengan default Property.
- **Audit trail:** perubahan bisnis utama tercatat dengan label "Occupation / Bisnis Utama".

## File utama

- `prisma/schema.prisma`, `prisma/migrations/20261118190000_bisnis_utama_client/migration.sql`, `prisma/seed.ts`
- `lib/form-options.ts`, `lib/data/types.ts`, `lib/server/clients.ts`, `app/(app)/marketing/actions.ts`
- `components/marketing/client-form.tsx`, `components/marketing/client-table.tsx`, `components/marketing/client-detail.tsx`
- `components/master-data/lookup-values-tab.tsx`, `components/audit/audit-fields.ts`

## Dampak

- **Database:** migrasi `20261118190000_bisnis_utama_client` melakukan dua hal:
  - menambah 21 nilai lookup;
  - menambah kolom `business_line_id` (nullable, dengan FK ke `lookup_values`).

  Client yang sudah ada belum punya bisnis utama sampai diisi. Migrasi ini tetap cocok dengan kode lama.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Perilaku baru:** edit client korporasi lama mewajibkan pengisian bisnis utama sebelum disimpan.

## Verifikasi

- `npx prisma migrate deploy` (DB lokal: 21 nilai `business_line`), `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 283 tes lolos.
- **Browser lokal** (SIT Admin, viewport 1280), PT SIT Korporasi Uji:
  - Edit KYC menampilkan "Occupation / Bisnis Utama *". Simpan tanpa isian ditolak dengan pesan "Pilih occupation / bisnis utama perusahaan".
  - Setelah memilih Pengangkutan dan Pergudangan lalu simpan, Data KYC menampilkan nilainya. Di database, `cob_id` lama (Property) tetap ada.
  - Daftar client menampilkan kolom Bisnis Utama. Filter berisi 21 kategori ditambah "Semua bisnis utama", dan filter Pengangkutan dan Pergudangan hanya menampilkan client uji.
  - Nama terpanjang (kategori N) tampil 2 baris dengan elipsis di kolom 160 px.
  - Data uji dikembalikan, dan baris audit uji dihapus.

## Catatan untuk yang melanjutkan

- Kolom `cob_id` di `clients` bisa dihapus nanti, setelah SPPA dan slip tidak lagi memakai COB client sebagai default.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
