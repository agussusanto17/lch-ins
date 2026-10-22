# Dropdown Form Polis dari Master Data, Kolom ERD Polis, dan Master Klasifikasi OJK

- **Tanggal:** 2026-10-22
- **Branch:** `feat/polis-dropdown-master-erd`
- **PR:** #32 (diisi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Form input polis pada modul Policy Database sebelumnya masih mengandalkan daftar statis pada konstanta (`INSURERS`, `CURRENCIES`). Hal ini menyebabkan ketidaksinkronan dengan entitas master data yang telah dipindahkan ke database PostgreSQL. Selain itu, kesenjangan antara implementasi tabel `policies` dengan rancangan ERD dan PRD sistem LCH membutuhkan:
1. Dukungan penomoran urut endorsement otomatis pada polis induk (`endorsement_seq`).
2. Klasifikasi lini usaha OJK untuk pengelompokan pelaporan produksi (`cob_ojk_class_id`).
3. Lokasi penempatan risiko (`placement_location_id`: Dalam Negeri vs Luar Negeri).
4. Pengelompokan tertanggung dalam grup usaha/konglomerasi (`grouping_insured`).
5. Modul CRUD terkelola untuk Master Klasifikasi OJK di halaman Master Data.

## Yang berubah

- **Dropdown Dinamis Form Polis**: Field Asuransi rekanan, Mata Uang, Klasifikasi OJK, dan Lokasi Penempatan pada form polis (`policy-form.tsx`) kini mengambil data aktif dari PostgreSQL melalui `listPolicyFormOptions()`. Disediakan helper `withCurrent` agar data polis lama yang asuransi/klasifikasinya telah dinonaktifkan tetap dapat tampil dan dipilih saat mode edit.
- **Tiga Field Input ERD Baru**:
  - `Klasifikasi OJK`: SelectInput yang terhubung ke tabel `cob_ojk_classes`. Jika belum ada master data, ditampilkan placeholder informatif dan helper text yang mengarahkan user ke Master Data.
  - `Lokasi Penempatan`: SelectInput terhubung ke lookup `placement_location` ("Dalam Negeri", "Luar Negeri").
  - `Grouping Insured`: TextField untuk mencatat nama grup perusahaan konglomerasi pemegang polis.
- **Penomoran Urut Endorsement Otomatis**: Server Action menghitung nomor urut endorsement berikutnya secara atomik per polis induk (`_max(endorsementSeq) + 1`). Database diperkuat dengan constraint `@@unique([parentPolicyId, endorsementSeq])` dan penanganan konflik konkurensi P2002 dengan pesan ramah pengguna.
- **Tampilan Daftar & Ekspor Polis**:
  - Tabel polis pada cell Tipe kini menampilkan nomor urut endorsement (contoh: `Endorsement ke-1`).
  - Kolom "Endorsement Ke" disertakan pada fungsi ekspor data polis ke CSV.
- **Modul Master Data Klasifikasi OJK**:
  - Tab baru "Klasifikasi OJK" pada `/master-data` (`components/master-data/cob-ojk-classes-tab.tsx`).
  - Menampilkan daftar klasifikasi, jumlah polis terkait (`_count.policies`), status badge, toggle switch aktif/nonaktif langsung pada baris tabel, serta dialog Tambah & Edit.
  - Dikelola melalui Server Actions `createCobOjkClassAction` dan `updateCobOjkClassAction` dengan audit trail otomatis.

## File utama

- `prisma/schema.prisma`: Penambahan model `CobOjkClass`, penambahan 4 kolom relasional pada model `Policy`, relasi balik `placementLocation` pada `LookupValue`, dan unique constraint `[parentPolicyId, endorsementSeq]`.
- `prisma/migrations/20261022160000_policy_erd_columns/migration.sql`: DDL migrasi PostgreSQL untuk tabel `cob_ojk_classes`, alter tabel `policies`, seed lookup `placement_location`, dan backfill `endorsement_seq` untuk data polis eksisting.
- `prisma/seed.ts`: Pendaftaran lookup group `placement_location`.
- `lib/data/types.ts`: Pembaruan interface `Policy` dengan field opsional `endorsementSeq`, `cobOjkClassId`, `placementLocationId`, dan `groupingInsured`.
- `lib/server/policies.ts`: Implementasi `listPolicyFormOptions()`, helper `findCobOjkClassId`, `findPlacementLocationId`, kalkulasi `endorsementSeqFor()`, dan audit snapshot kolom baru.
- `app/(app)/policies/actions.ts`: Skema validasi Zod untuk field ERD baru dan pemetaan error P2002 untuk bentrok konkurensi nomor urut endorsement.
- `app/(app)/policies/page.tsx`: Pengambilan `listPolicyFormOptions()` secara paralel dengan `listClientOptions()` dan pengaliran props ke komponen client.
- `components/policies/policy-form.tsx`: Integrasi dropdown dinamis, input klasifikasi OJK, lokasi penempatan, dan grouping insured.
- `components/policies/policy-database.tsx`: Visualisasi nomor urut endorsement pada badge tabel dan kolom ekspor CSV.
- `lib/server/cob-ojk-classes.ts`: Data layer server-only untuk CRUD `cob_ojk_classes` dengan Prisma transaksi dan audit trail.
- `app/(app)/master-data/actions.ts`: Server Actions `createCobOjkClassAction` dan `updateCobOjkClassAction` dengan RBAC `requireManage` dan Zod validation.
- `components/master-data/cob-ojk-classes-tab.tsx`: Komponen UI tab Klasifikasi OJK.
- `components/master-data/master-data-tabs.tsx`: Integrasi tab baru ke navigasi Master Data.
- `app/(app)/master-data/page.tsx`: Preload server data `listCobOjkClasses()`.
- `scripts/check-policies.ts`: Script verifikasi otomatis integritas relasi, auto-increment endorsement seq, dan CRUD OJK class.

## Dampak

- **Database:** Migrasi baru `20261022160000_policy_erd_columns` membuat tabel `cob_ojk_classes`, menambahkan kolom `endorsement_seq`, `cob_ojk_class_id`, `placement_location_id`, dan `grouping_insured` pada tabel `policies`, membuat index unique, serta menambahkan nilai lookup `placement_location`.
- **Env:** Tidak ada variabel baru.
- **Deploy:** Jalankan `npm run db:deploy` di environment staging/produksi sebelum atau bersamaan dengan deployment aplikasi (telah diverifikasi di database target).

## Verifikasi

1. **Typecheck & Linting:**
   - `rtk proxy npx tsc --noEmit` lolos dengan 0 error.
   - `rtk proxy npm run lint` lolos dengan 0 error.
2. **Build Production:**
   - `rtk proxy npm run build` berhasil melakukan kompilasi Turbopack untuk seluruh 21 rute aplikasi.
3. **Database Integration Test:**
   - `node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/check-policies.ts` lulus seluruh 25 assertion pengujian data layer dan constraint DB.
4. **Browser E2E Automation (`ego-browser`):**
   - Menjalankan Next.js di port 3100.
   - Menguji otentikasi admin, navigasi ke `/policies`, dan memeriksa modal form Tambah Polis: field Klasifikasi OJK, Lokasi Penempatan, dan Grouping Insured ter-render dengan benar.
   - Menguji navigasi ke `/master-data`, membuka tab "Klasifikasi OJK", menambahkan klasifikasi baru ("Rangka Kapal (Marine Hull)") via UI, dan memverifikasi data langsung tersimpan serta muncul di dropdown form polis.

## Catatan untuk yang melanjutkan

- **Konstanta Tipe Polis & COB**: Tipe polis (`POLICY_TYPES`: Baru, Renewal, Endorsement, Pembatalan) dan `CLASSES_OF_BUSINESS` masih dipertahankan sebagai konstanta kode. Hal ini karena tipe polis terkait erat dengan business logic percabangan form, sedangkan COB terikat dengan union type TypeScript di seluruh modul (SPPA, Placing Slip, Quotation, Rate Engine). Konversi COB/type of cover ke master dinamis sebaiknya dilakukan dalam inisiatif terpisah.
- **Auto-create Insurer pada Placing Slip**: Fungsi `resolveInsurerId` di `lib/server/policies.ts` masih menyediakan fallback pembuatan nama insurer jika belum ada di database, guna menjaga kompatibilitas dengan Placing Slip mock yang memiliki nama penjamin statis.
- **Katalog Klasifikasi OJK Resmi**: Database saat ini menyediakan struktur dan UI untuk mengelola klasifikasi OJK, namun katalog lengkap klasifikasi standar OJK (misal 13 lini usaha pelaporan OJK) perlu di-input oleh administrator atau ditambahkan via data seed setelah dokumen spesifikasi resmi disepakati bersama pihak LCH.
