# Info polis di klaim: status premi, deductible, dan file polis

- **Tanggal:** 2026-11-10
- **Branch:** `feat/info-polis-di-klaim`
- **PR:** [#203](https://github.com/agussusanto17/lch-ins/pull/203)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Catatan meeting LCH, 10 November 2026, untuk modul klaim:

- Saat polis dipilih di form klaim, perlu ada pemberitahuan apakah premi polis itu sudah dibayar atau belum.
- Form klaim perlu menampilkan info deductible polis, diambil dari data polis.
- Bagian "Polis terkait" di detail klaim perlu bisa membuka file polis yang sudah diunggah di Policy Database (berkas polis, #195).

## Yang berubah

- **Tanggal Premi Dibayar** di form polis (Policy Database), kolom baru `premium_paid_date`.
  - Kosong berarti premi belum dibayar.
  - Diisi manual sampai Bagian B mencatat pembayaran premi.
  - Tidak ikut tersalin ke renewal atau endorsement.
  - Perubahannya tercatat di audit trail.
- **Form klaim:** setelah polis dipilih, muncul panel di bawah ringkasan polis berisi:
  - **Status premi:** badge "Sudah dibayar · tanggal" atau "Belum dibayar", dengan petunjuk bahwa tanggal bayar diisi di Policy Database.
  - **Deductible polis:**
    - Diambil dari placing slip asal polis, dengan kelompok yang sama seperti blok DEDUCTIBLE di cetakan: Property per section, CAR/EAR per section, COB lain satu daftar.
    - Kalimat pengantar deductible ikut tampil.
    - Polis PAR atau EQVET dari slip PAR + EQVET hanya menampilkan bagiannya sendiri, dengan aturan yang sama seperti premi per bagian.
    - Polis tanpa slip diberi keterangan bahwa deductible-nya tidak tercatat.
- **Detail klaim, bagian Polis terkait:** baris baru "Status premi" dan "Berkas polis". "Lihat polis" membuka versi terakhir file jenis Polis, dan tertulis "Belum diunggah" kalau belum ada.
- **Fungsi bersama:** pengelompokan deductible pindah dari `DeductibleBlock` ke `lib/slip-deductibles.ts`, jadi cetakan dan form klaim memakai aturan yang sama. Cetakan tidak berubah.

## File utama

- `prisma/schema.prisma` dan migrasi `20261110170000_tanggal_premi_dibayar`: kolom `policies.premium_paid_date`.
- `lib/slip-deductibles.ts`: `deductibleGroups(slip, part)`.
- `lib/server/claims.ts`: `getClaimPolicyInfo`, berisi status premi, deductible dari slip, dan file polis terakhir.
- `app/(app)/claims/actions.ts`: `getClaimPolicyInfoAction`, butuh akses menu Klaim.
- `components/claims/claim-policy-info.tsx`: hook dan komponen panel, badge status premi, dan tautan file polis.
- `components/claims/claim-form.tsx` dan `claim-detail-sheet.tsx`: pemakaian panel dan baris baru.
- `lib/server/policies.ts`, `app/(app)/policies/actions.ts`, `components/policies/policy-form.tsx`, `lib/data/types.ts`, `components/audit/audit-fields.ts`: isian tanggal premi dibayar.
- `components/documents/doc-blocks.tsx`: `DeductibleBlock` memakai `deductibleGroups`.
- `tests/slip-deductibles.test.ts`.

## Dampak

- **Database:** migrasi `20261110170000_tanggal_premi_dibayar`, satu kolom DATE baru. Polis lama kosong, jadi tampil "Belum dibayar" sampai tanggalnya diisi.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build seperti biasa.

## Verifikasi

- `npx prisma generate`, `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (157 tes, 3 tes baru untuk deductible), dan `npm run build`: lolos. Migrasi diterapkan di database lokal.
- **Uji browser lokal** (Playwright dan Chrome, sesi admin sementara, data uji dikembalikan):
  - **Form polis SIT/RNW/2026/001:** Tanggal Premi Dibayar 15 Oktober 2026 tersimpan dan tercatat di audit trail.
  - **Form klaim baru, polis SIT/RNW/2026/001** (renewal tanpa slip): "Sudah dibayar · 15 Okt 2026", dan keterangan bahwa polis tidak dibuat dari placing slip.
  - **Form klaim baru, polis CAR/2026/JTG/0019** (dari slip CAR): "Belum dibayar", dan deductible slip tampil.
  - **Detail klaim CLM/2026/07/0030:** "Status premi: Belum dibayar". Dengan file polis uji sementara, "Lihat polis" membuka file dengan HTTP 200.
- Tidak ada error di console browser.

## Catatan untuk yang melanjutkan

- **Bagian B:** status premi bisa dihitung dari pembayaran (Debit Note dan penerimaan premi). Saat itu isian manual ini bisa menjadi cadangan atau dihapus.
- **Endorsement dan polis tanpa slip:** deductible hanya dibaca dari slip polis itu sendiri, jadi endorsement dan polis yang diinput tanpa slip tidak menampilkan deductible. Kalau LCH perlu, tambahkan isian deductible di form polis.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
