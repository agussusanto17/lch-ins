# Penyelarasan Schema Database dengan ERD v1.5 & PRD v1.9

- **Tanggal:** 2026-10-22
- **Branch:** `feat/erd-relational-tables`
- **PR:** #35
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Audit perbandingan menyeluruh antara dokumen Notion (PRD v1.9 dan ERD v1.5 per 21 Oktober 2026) dengan codebase menunjukkan terdapat 6 entitas tabel dan beberapa kolom relasional yang belum tersedia pada `prisma/schema.prisma`. 

Tabel dan kolom tersebut diperlukan untuk:
1. Menyimpan master sumber penempatan / bisnis (`sources`) dan menghubungkannya ke Placing Slip (`placing_slips.source_id`).
2. Mencatat PIC klaim per asuransi dan per COB (`insurer_claim_pics`).
3. Menyimpan kode unik klien di masing-masing sistem asuransi rekanan (`client_insurer_codes`).
4. Menyediakan master jenis berkas klaim per COB (`claim_document_types`) dan pencatatan berkas klaim fisik/digital (`claim_documents`).
5. Menyediakan riwayat tindak lanjut klaim bertanggal (`claim_followups`).
6. Menyimpan urutan prioritas penggabungan singkatan cover types (`cover_types.priority`) dan rate tunggal perluasan kendaraan (`tariff_motor_extension.rate`).

## Yang berubah

- **Tabel Baru:**
  - `sources`: Master sumber penempatan (mis. `PT. LCH Insurance Brokers`, `LCH Insurance Brokers Pte Ltd`, `Direct Client`).
  - `insurer_claim_pics`: Kontak person / PIC klaim pada asuransi rekanan per COB (nama, HP, telepon kantor, email, catatan) dengan `onDelete: Cascade` dari asuransi.
  - `client_insurer_codes`: Kode identitas klien di sistem asuransi tertentu (mis. `D45BL00001` di Sinar Mas), dengan proteksi unik pada pasangan `(client_id, insurer_id)`.
  - `claim_document_types`: Master jenis berkas klaim per COB (contoh: BA Bongkar, Bill of Lading, SIM, Estimasi RAB) lengkap dengan flag kewajiban (`is_required`) dan urutan tampil.
  - `claim_documents`: Berkas kelengkapan klaim per berkas (status diterima, tanggal terima, path file, catatan) berelasi ke `claims` dan `claim_document_types`.
  - `claim_followups`: Riwayat kronologis tindak lanjut klaim bertanggal, catatan, dan pencatat (`created_by`).
- **Kolom Baru pada Tabel yang Ada:**
  - `cover_types.priority`: Urutan prioritas penggabungan singkatan pada slip (contoh `A`, `B`, `1`, `2`).
  - `placing_slips.source_id`: Foreign key opsional ke `sources.id`.
  - `tariff_motor_extension.rate`: Kolom nilai rate tunggal opsional melengkapi rentang `rate_min`/`rate_max`.
- **Pembenihan Data (Seed):**
  - Seed awal 3 sumber penempatan (`LCH-ID`, `LCH-SG`, `DIRECT`).
  - Seed 18 jenis berkas klaim awal yang dikelompokkan menurut COB Property, Motor Vehicle, Marine Cargo, dan Engineering.
  - Pengisian otomatis kolom `priority` pada `cover_types` dari data CSV `cob-toc.csv`.

## File utama

- `prisma/schema.prisma`: Penambahan model `Source`, `InsurerClaimPic`, `ClientInsurerCode`, `ClaimDocumentType`, `ClaimDocument`, `ClaimFollowup`, kolom `priority` pada `CoverType`, `sourceId` pada `PlacingSlip`, dan `rate` pada `TariffMotorExtension`.
- `prisma/migrations/20261022180000_erd_v1_5_relational_tables/migration.sql`: Migrasi DDL PostgreSQL dan data seed awal.
- `prisma/seed.ts`: Fungsi `seedSources()`, `seedClaimDocumentTypes()`, dan integrasi pembacaan kolom `priority` pada `seedCobAndCoverTypes()`.
- `scripts/verify-erd-v1-5.ts`: Script verifikasi otomatis integritas relasi, cascading delete, dan constraint unik seluruh model baru.

## Dampak

- **Database:** Migrasi baru `20261022180000_erd_v1_5_relational_tables` membuat 6 tabel baru dan 3 kolom baru. Semua relasi lama tetap utuh dan backward-compatible.
- **Env:** Tidak ada variabel baru.
- **Deploy:** Jalankan `npm run db:deploy` pada database produksi setelah merge.

## Verifikasi

1. **Uji Migrasi & Schema Drift:**
   - `prisma migrate deploy` sukses diterapkan.
   - `prisma migrate diff` terhadap datasource menghasilkan skrip kosong (0 drift).
2. **Uji Integritas Relasi & Constraint:**
   - Dijalankan via `npx tsx --env-file=.env --conditions=react-server scripts/verify-erd-v1-5.ts`:
     - Verifikasi data `sources` (3 record).
     - Verifikasi data `cover_types` priority (8 record terisi).
     - Verifikasi data `claim_document_types` (18 record terbagi per COB).
     - Uji pembuatan `InsurerClaimPic` dan cascading delete saat asuransi dihapus: Lolos.
     - Uji `ClientInsurerCode` dan penolakan constraint unik pasangan ganda: Lolos.
     - Uji pembuatan `ClaimDocument` dan `ClaimFollowup` berelasi: Lolos.
     - Hasil: `ALL ERD V1.5 RELATIONAL MODEL TESTS PASSED`.
3. **Uji Regresi Klaim:**
   - `scripts/verify-claims.ts`: Lolos (`ALL CLAIMS TESTS PASSED`).
4. **Kompilasi & Lint:**
   - `npx tsc --noEmit`: 0 error.
   - `npm run build`: Kompilasi produksi Next.js sukses.

## Catatan untuk yang melanjutkan

- Model relasional ERD v1.5 kini sudah 100% selaras di tingkat database.
- Langkah berikutnya:
  - Buat tab / sub-menu pada Master Data untuk mengelola `sources` dan `claim_document_types`.
  - Pada form klaim (`claim-form.tsx`) dan tampilan detail klaim, tambahkan tab/panel berkas kelengkapan (`claim_documents`) menggunakan checklist per COB dan riwayat tindak lanjut (`claim_followups`).
