# Implementasi Persistensi Relasional Placing Slip ke PostgreSQL

- **Tanggal:** 2026-10-21
- **Branch:** `feat/placing-slip-db-persistence`
- **PR:** #24
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Modul Placing Slip di menu Underwriting (`/underwriting`) sebelumnya masih mengandalkan in-memory store lokal browser (`lib/store.ts` dan `lib/data/slips.ts`). Data draft maupun hasil release slip akan hilang jika server di-restart atau browser di-refresh. Selain itu, penomoran dokumen resmi (`001/LCH-PLCMT/PS/...`) belum dihasilkan secara atomik melalui database sequence, data belum terhubung relasional ke tabel `clients` dan master data OJK, dan klausula belum terintegrasi dengan tabel master `clauses` di PostgreSQL.

Implementasi ini menyelesaikan roadmap Minggu 3 untuk modul Underwriting dengan memigrasikan penyimpanan Placing Slip ke skema relasional PostgreSQL (`placing_slips` dan 5 tabel anak: `slip_items`, `slip_rate_lines`, `slip_security_panel`, `slip_clauses`, `slip_wording_forms`).

## Yang berubah

- **Persistensi Relasional Penuh:** Semua operasi CRUD Placing Slip (buat baru, perbarui draft, rilis resmi, ubah status, duplikasi, dan hapus draft) kini membaca dan menulis langsung ke PostgreSQL via Prisma 7.
- **Transaksi Basis Data Atomik:** Seluruh mutasi draft dan rilis slip dibungkus dalam `prisma.$transaction()` yang memperbarui data header slip beserta seluruh tabel anak (`slip_items`, `slip_rate_lines`, `slip_security_panel`, `slip_clauses`, `slip_wording_forms`) secara terpadu.
- **Penerbitan Nomor Dokumen Resmi Atomik:** Saat slip dirilis, penomoran resmi dihasilkan melalui generator `nextDocumentNumber(tx, { code: "PS", coverCode })` di dalam transaksi database yang sama (format: `001/LCH-PLCMT/PS/X/2026`), mencegah celah atau duplikasi nomor akibat race condition.
- **Proteksi Akses Tiga Tingkat (RBAC):** Seluruh Server Actions mutasi dilindungi dengan `await requireManage("/underwriting")`. Hanya role dengan hak `kelola` pada modul Underwriting (`placement`, `admin`, `broking`) yang diizinkan memodifikasi data slip.
- **Proteksi Status & Integritas:** Penghapusan fisik hanya diizinkan untuk slip berstatus `Draft`. Slip yang sudah `Released` dilindungi dari penghapusan dan hanya dapat dibatalkan (`Cancelled`) tanpa menghapus catatan audit dan nomor dokumen.
- **Audit Trail Terintegrasi:** Setiap pembuatan, pembaruan, perubahan status, dan penghapusan Placing Slip dicatat ke tabel `audit_logs` melalui `recordAudit()`.
- **Integrasi ClausePicker Dinamis:** Komponen `ClausePicker` memuat daftar klausula aktif langsung dari PostgreSQL via Server Action `getClausesForPickerAction()`, dengan fallback otomatis ke klausula statis bila koneksi offline.
- **Integrasi Dokumen Turunan:** Seluruh halaman cetak dokumen underwriting (`/underwriting/slip/[id]`, `/underwriting/quotation/[id]`, `/underwriting/cover-note/[id]`, `/underwriting/closing/[id]`) kini membaca data slip langsung dari database dengan fallback aman ke mock ID jika diperlukan.
- **Auto-Seeding Idempoten:** Fungsi `seedInitialSlipsIfEmpty()` otomatis membenihkan data awal mock slip LCH ke tabel relasional PostgreSQL saat tabel kosong.

## File utama

- `lib/server/placing-slips.ts`: Lapisan data server (server-only) untuk CRUD relasional Placing Slip, pemetaan tipe `PlacingSlipRecord`, resolusi relasi klien/COB/okupasi, penomoran dokumen, dan audit logging.
- `app/(app)/underwriting/actions.ts`: Next.js Server Actions (`savePlacingSlipAction`, `releasePlacingSlipAction`, `togglePlacingSlipStatusAction`, `deletePlacingSlipAction`, `duplicatePlacingSlipAction`, `getClausesForPickerAction`) dengan validasi Zod dan penjagaan sesi `requireManage`.
- `components/underwriting/placing-slip-form.tsx`: Form editor Placing Slip terintegrasi Server Actions dengan `React.useTransition()`, penanganan loading state, dan validasi kelengkapan release.
- `components/underwriting/slip-table.tsx`: Komponen tabel Underwriting dengan hidrasi data server (`initialSlips`), aksi duplikasi, pembatalan, dan hapus draft via Server Actions.
- `components/underwriting/clause-picker.tsx`: Pemilih klausula dengan prefetch database dinamis dan fallback klausula lokal.
- `lib/data/clauses.ts`: Perluasan fungsi `resolveSlipClauses` agar mendukung resolusi klausula dari pool dinamis hasil query database.
- `app/(app)/underwriting/page.tsx`: Server Component async yang mengambil daftar slip dari PostgreSQL via `listPlacingSlips()`.
- `app/(app)/underwriting/edit/[id]/page.tsx` & `app/(app)/underwriting/quotation/edit/[id]/page.tsx`: Server Component editor dengan prefetch data dari database.
- `app/(print)/underwriting/*`: Empat rute dokumen cetak (`slip`, `quotation`, `cover-note`, `closing`) terhubung langsung ke database.
- `scripts/test-placing-slip-e2e.ts`: Script pengujian integrasi E2E komprehensif mencakup 30 skenario uji verifikasi database relasional.

## Dampak

- **Database:** Memanfaatkan tabel yang sudah ada di Prisma schema (`placing_slips`, `slip_items`, `slip_rate_lines`, `slip_security_panel`, `slip_clauses`, `slip_wording_forms`, `document_sequences`, `audit_logs`). Tidak ada migrasi skema baru.
- **Env:** Tidak ada variabel lingkungan baru.
- **Deploy:** Tidak ada langkah tambahan khusus.

## Verifikasi

1. **Uji Tipe TypeScript:**
   - Perintah: `npx tsc --noEmit`
   - Hasil: 0 error (No errors found).
2. **Uji Next.js Build:**
   - Perintah: `npm run build`
   - Hasil: Seluruh 21 rute terkompilasi sukses (Dynamic Server Components & Static Prerendered).
3. **Uji Integrasi End-to-End Database:**
   - Perintah: `node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/test-placing-slip-e2e.ts`
   - Hasil: **30 dari 30 pengujian PASSED** (seeding, CRUD relasional, validasi guard status, cascade deletion, dan atomic document number generation).
4. **Uji Browser Otomatisasi (ego-browser):**
   - Login berhasil menggunakan akun Admin (`admin@lch.example` / `TestPassword123`).
   - Halaman `/underwriting` menampilkan data Placing Slip yang tersimpan di PostgreSQL.
   - Pembuatan slip baru di `/underwriting/new` dengan pemilihan klien dan type of cover tersimpan ke PostgreSQL dengan UUID permanen (`/underwriting/edit/9b605df7-ea1e-410d-8737-051994ab64ce`).
   - Pengecekan guard validasi release berhasil mencegah release slip yang belum lengkap isian underwriting-nya.
   - Keempat dokumen cetak (`/underwriting/slip/s-001`, `/underwriting/quotation/s-001`, `/underwriting/cover-note/s-001`, `/underwriting/closing/s-001`) tampil normal dengan format kop resmi broker.

## Catatan untuk yang melanjutkan

- Format penomoran resmi placing slip saat ini menggunakan pola `001/LCH-PLCMT/PS/X/2026` melalui helper `nextDocumentNumber(tx, { code: "PS", coverCode })`. Jika LCH meminta penyesuaian penomoran berbasis COB (misal: `PS-PAREQ`), parameter `coverCode` sudah siap diakomodasi.
- Halaman cetak dokumen underwriting saat ini membaca dari `getPlacingSlipById(id)` terlebih dahulu dengan fallback ke `slipById(id)` in-memory untuk mock ID lama, sehingga backward compatibility terhadap link atau bookmark lama tetap terjaga.
