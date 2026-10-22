# Integrasi dan Sinkronisasi SPPA ke PostgreSQL & Server Actions

- **Tanggal:** 2026-10-22
- **Branch:** `feat/sppa-postgres-sync`
- **PR:** # (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Modul Surat Permintaan Penutupan Asuransi (SPPA) di menu Marketing (`/marketing`) sebelumnya telah memiliki fondasi data layer PostgreSQL dan Server Actions. Namun, diperlukan audit integrasi komprehensif untuk memastikan:
1. SPPA terhubung penuh ke basis data PostgreSQL secara relasional (`clients`, `classes_of_business`, `cover_types`, `occupations`, `currencies`).
2. Prefetch data SPPA pada halaman detail klien (`/marketing/clients/[id]`) agar tabel SPPA klien tidak kosong saat hard-refresh.
3. Rekonsiliasi counter reaktif pada tab Marketing (`MarketingTabs`) saat SPPA baru dibuat atau dihapus.
4. Resolusi ID SPPA yang aman (`resolveSppaId`) pada modul Placing Slip (`lib/server/placing-slips.ts`) untuk mencegah potensi kegagalan sintaks UUID Postgres atau pelanggaran foreign key ketika konversi slip dilakukan.

## Yang berubah

- **Prefetch SPPA Klien pada Server Component:** `app/(app)/marketing/clients/[id]/page.tsx` kini memanggil `listSppa({ clientId: id })` secara paralel dengan `getClientById(id)` di server, lalu meneruskannya ke `ClientDetail` dan `SppaTable`.
- **Hidrasi Store & Counter Tab Responsif:** `components/marketing/marketing-tabs.tsx` menghidrasi koleksi SPPA store secara langsung saat mount dan menghitung jumlah SPPA secara reaktif dari state store (`sppaCount`), sehingga penambahan/penghapusan SPPA langsung tercermin pada label tab.
- **Resolusi SPPA ID di Placing Slip:** Penambahan fungsi `resolveSppaId` di `lib/server/placing-slips.ts` yang mendukung pencocokan UUID langsung maupun resolusi fallback mock ID (seperti `sp-001`), memastikan pembuatan dan pembaruan slip dari SPPA selalu menggunakan UUID relasional yang valid.
- **Pengujian E2E & Regresi:** Seluruh skenario integrasi SPPA (pembuatan, pembaruan, toggle status, validasi skema Zod, pemetaan ke placing slip, dan penghapusan yang dijaga referensial) tervalidasi sukses.

## File utama

- `app/(app)/marketing/clients/[id]/page.tsx`: Prefetch `initialSppa` via `listSppa({ clientId: id })` di server.
- `components/marketing/client-detail.tsx`: Menerima `initialSppa` dan mengalirkannya ke `<SppaTable clientId={client.id} initialSppa={initialSppa} compact />`.
- `components/marketing/marketing-tabs.tsx`: Sinkronisasi hidrasi store awal dan perhitungan counter reaktif `sppaCount`.
- `lib/server/placing-slips.ts`: Fungsi `resolveSppaId` untuk memvalidasi dan mengonversi ID SPPA ke UUID database sebelum transaksi penulisan placing slip.
- `scripts/test-sppa-e2e.ts`: Script uji integrasi end-to-end 8 skenario SPPA.

## Dampak

- **Database:** Tidak ada perubahan skema (tabel `sppa` sudah ada). 3 data awal SPPA mock tersimpan dan terhubung ke klien PostgreSQL.
- **Env:** Tidak ada variabel baru.
- **Deploy:** Tidak ada langkah khusus.

## Verifikasi

1. **Uji Integrasi End-to-End SPPA:**
   - `npx tsx --env-file=.env --conditions=react-server scripts/test-sppa-e2e.ts`
   - Hasil: 8/8 test lolos (`listSppa`, `getSppaById`, Zod validation, `createSppa`, `updateSppa`, `toggleSppaStatus`, downstream placing slip mapping, referential deletion guard).
2. **Uji Regresi Model Relasional & Klaim:**
   - `scripts/verify-erd-v1-5.ts`: Lolos (`ALL ERD V1.5 RELATIONAL MODEL TESTS PASSED`).
   - `scripts/verify-claims.ts`: Lolos (`ALL CLAIMS TESTS PASSED`).
3. **Kompilasi & Typecheck:**
   - `npx tsc --noEmit`: 0 error.
   - `npm run build`: Berhasil mengompilasi seluruh rute Next.js (termasuk `/marketing`, `/marketing/clients/[id]`, dan `/underwriting/new`).

## Catatan untuk yang melanjutkan

- Modul SPPA kini sepenuhnya terintegrasi dengan PostgreSQL dan tersinkronisasi dua arah ke Placing Slip.
- Saat membuat placing slip dari SPPA di `/underwriting/new?sppa=<id>`, data tertanggung, COB, cover type, okupasi, mata uang, nilai pertanggungan, dan lokasi risiko otomatis terisi.
