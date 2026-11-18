# Cabang client Jakarta/Singapore dan isian Source di placing slip

- **Tanggal:** 2026-11-18
- **Branch:** `feat/cabang-client-source-slip`
- **PR:** #267
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (luring, 17 November 2026), poin 3:
  - client korporasi diberi tanda cabang Jakarta atau Singapore, default Jakarta;
  - perusahaan yang dilayani dua cabang tetap dicatat sebagai dua client;
  - tanda ini dibutuhkan untuk report.
- Ketentuan yang ditetapkan Agus (18 November 2026):
  - client lama dan client perorangan otomatis Jakarta;
  - pilihan cabang dari Master Data;
  - cabang menjadi isian awal Source di placing slip: Jakarta ke PT. LCH Insurance Brokers, Singapore ke LCH Insurance Brokers Pte Ltd;
  - Source tetap bisa diubah per slip.
- Tabel `sources` dan kolom `placing_slips.source_id` sudah ada sejak ERD v1.5, tetapi belum punya isian di form. Akibatnya kolom Source di Rekap Produksi selalu kosong.

## Yang berubah

- **Master Data:**
  - tipe dropdown baru "Cabang Klien" (`client_branch`) berisi Jakarta dan Singapore;
  - termasuk lookup sistem: nama dan urutannya bisa diubah Team LCH, tapi nilai baru ditambah developer, karena tiap cabang dipetakan ke satu Source di `BRANCH_SOURCE_CODES`.
- **Client:**
  - kolom `clients.branch_id`, semua client lama diisi Jakarta oleh migrasi;
  - form client korporasi punya isian Cabang (wajib, default Jakarta). Client perorangan selalu disimpan Jakarta;
  - daftar client punya kolom dan filter Cabang, dan file ekspor ikut memuat kolom Cabang;
  - detail client menampilkan Cabang di Data KYC.
- **Placing slip:**
  - isian Source di Informasi Dasar, di bawah tertanggung. Pilihannya dari tabel `sources` yang aktif;
  - kalau kosong, Source mengikuti cabang client. Saat client diganti, Source kembali mengikuti cabang client yang baru;
  - server memakai aturan yang sama: slip baru tanpa Source disimpan dengan Source cabang kliennya, dan revisi tanpa isian Source tidak menghapus Source yang tersimpan.
- **Rekap Produksi:** kolom Source memakai Source slip. Untuk slip lama tanpa Source atau polis tanpa slip, kolom ini memakai Source dari cabang kliennya.
- **Audit trail:** perubahan cabang client dan Source slip tercatat dengan label "Cabang" dan "Source", dan id-nya ditampilkan sebagai nama.

## File utama

- `prisma/schema.prisma`, `prisma/migrations/20261118180000_cabang_client/migration.sql`, `prisma/seed.ts`
- `lib/form-options.ts` (`CLIENT_BRANCH_CODES`, `BRANCH_SOURCE_CODES`, `branchSourceId`, `FormOptions.sources`), `lib/server/form-options.ts`
- `lib/server/clients.ts`, `app/(app)/marketing/actions.ts`, `components/marketing/client-form.tsx`, `components/marketing/client-table.tsx`, `components/marketing/client-detail.tsx`
- `lib/server/placing-slips.ts`, `app/(app)/placement/actions.ts`, `components/underwriting/placing-slip-form.tsx`
- `lib/server/production-recap.ts`, `lib/server/audit.ts`, `lib/slip-audit.ts`, `components/audit/audit-fields.ts`, `components/master-data/lookup-values-tab.tsx`
- `tests/client-branch.test.ts` (baru)

## Dampak

- **Database:** migrasi `20261118180000_cabang_client` melakukan tiga hal:
  - menambah dua nilai lookup;
  - menambah kolom `branch_id` (nullable, dengan FK ke `lookup_values`);
  - mengisi Jakarta untuk semua client yang sudah ada.

  Migrasi ini tetap cocok dengan kode lama.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Perilaku baru:**
  - placing slip yang disimpan setelah ini selalu punya Source;
  - kolom Source di Rekap Produksi tidak lagi kosong.

## Verifikasi

- `npx prisma migrate deploy` (DB lokal: 16 client menjadi Jakarta), `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 279 tes lolos, termasuk 3 tes peta cabang ke Source.
- **Browser lokal** (SIT Admin, viewport 1280):
  - **Master Data, Nilai Pilihan Dropdown:** tipe "Cabang Klien" berisi Jakarta dan Singapore.
  - **Daftar client:** kolom Cabang dan filter "Semua cabang" tampil, dan semua client lama Jakarta.
  - **Edit KYC PT SIT Korporasi Uji:** isian Cabang tampil. Setelah Singapore dipilih dan disimpan, detail menampilkan Cabang Singapore, dan audit mencatat `branchId`.
  - **Placing slip baru untuk client tersebut:** Source terisi LCH Insurance Brokers Pte Ltd. Setelah Simpan Draft, `placing_slips.source_id` berisi LCH-SG.
  - Data uji dikembalikan: draft dihapus, client kembali Jakarta beserta `updated_at`-nya, audit uji dihapus, dan counter nomor tidak berubah.
- **Rekap:** `listProductionRecap` untuk periode 2026–2027 menghasilkan 24 polis dengan Source "LCH-ID - PT. LCH Insurance Brokers". Sebelumnya kolom ini kosong.

## Catatan untuk yang melanjutkan

- Pilihan Source (tabel `sources`) belum punya halaman di Master Data. Harry pada 19 Oktober meminta Source bisa ditambah sendiri, jadi halaman ini masih perlu dibuat.
- Filter cabang di report bisa ditambahkan di menu Report baru (MoM poin 16).
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
