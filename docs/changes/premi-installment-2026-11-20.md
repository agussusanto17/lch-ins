# Premi installment di placing slip dan Policy Database

- **Tanggal:** 2026-11-20
- **Branch:** `feat/premi-installment`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 20 November 2026: "kan premi ada yang installment, nah itu tambah fitur di placing bro premi installment jadi nanti otomatis masuk ke policy database jika ada installment muncul installment nya. jumlah installment buat 10x."

Sebelumnya belum ada isian installment. Skema Finance sudah punya kolom cicilan di Credit Note (`instalment_no`, `instalment_count`), tetapi menu Finance masih Phase 2. Slip dan polis belum bisa mencatat jadwal cicilan.

## Yang berubah

- **Placing slip:** isian Pembayaran Premi di panel premi, di bawah Total Payable. Pilihannya Sekaligus atau 2x sampai 10x cicilan.
  - **Jadwal bawaan:** persen rata, misalnya 33,33/33,33/33,34%. Cicilan pertama jatuh tempo di tanggal mulai polis, berikutnya berjarak sama dalam periode polis (4x setahun = tiap 3 bulan, 10x = tiap bulan). Tanggal 31 jatuh ke akhir bulan pendek.
  - **Bisa diubah:** jatuh tempo dan persen tiap cicilan. Nominal dihitung otomatis.
  - **Validasi:** jumlah persen harus 100%, tiap persen lebih dari 0, jatuh tempo terisi dan urut. Form menahan simpan; server menolak jadwal yang tidak valid.
  - **Tidak tampil** untuk slip open cover (premi per deklarasi) dan slip endorsement atau pembatalan.
- **Cetak PS, QS, Cover Note, dan CI:** blok PREMIUM INSTALMENT di bawah perhitungan premi. Isinya cicilan ke-, due date, porsi, dan nominal, ditambah catatan bila ada admin cost atau stamp duty.
- **Policy Database:**
  - **Polis dari CI:** jadwal disalin dari slip saat polis dicatat dari CI. Revisi slip setelah CI terbit ikut mengubah jadwal di polis yang masih bernomor sementara, sama seperti isian slip lain.
  - **Tabel:** "4x cicilan · berikutnya {tanggal}" di bawah premi. Bila diklik, muncul jadwal cicilan dengan nominalnya.
  - **Form polis:** polis Baru dan Renewal tanpa slip bisa diisi jadwalnya di sini. Polis dari slip menampilkan jadwal terkunci, dan diubah lewat revisi slip.
  - **Export Policy Database:** kolom Pembayaran Premi dan Jadwal Cicilan.
- **Audit Trail:** perubahan jadwal tercatat sebagai "Premi installment", satu baris per cicilan.

## Asumsi

- **Dasar cicilan** adalah premi setelah diskon. Admin cost dan stamp duty ditagih bersama cicilan pertama dan tidak ikut dibagi. Jadi jumlah cicilan di slip sama dengan di polis, karena polis tidak menyimpan admin cost dan stamp duty.
- **Slip PAR + EQVET:** tiap polisnya (PAR dan EQVET) membagi premi bagiannya dengan persen dan jatuh tempo yang sama.
- **Hanya polis Baru dan Renewal.** Endorsement, pembatalan, dan deklarasi MOP selalu sekaligus.

## File utama

- `lib/premium-installments.ts` (baru): jadwal bawaan, pembersihan, validasi, nominal, label, dan teks audit/export.
- `components/shared/installment-editor.tsx` (baru): isian cicilan, dipakai form slip dan form polis.
- `components/policies/installment-schedule.tsx` (baru): jadwal cicilan di tabel Policy Database.
- `prisma/schema.prisma` dan migrasi `20261120130000_premi_installment`: kolom `premium_installments` (JSONB) di `placing_slips` dan `policies`.
- `lib/server/placing-slips.ts`, `app/(app)/placement/actions.ts`, `lib/slip-audit.ts`, dan `components/underwriting/placing-slip-form.tsx`: isian slip.
- `lib/policy-from-slip.ts`, `lib/server/policies.ts`, `app/(app)/policies/actions.ts`, `components/policies/policy-form.tsx`, dan `components/policies/policy-database.tsx`: polis.
- `components/documents/doc-blocks.tsx` dan `components/documents/slip-documents.tsx`: cetakan.
- `lib/data/types.ts` dan `components/audit/audit-fields.ts`.
- `tests/premi-installment.test.ts` (baru).

## Dampak

- **Database:** migrasi `20261120130000_premi_installment` menambah kolom `premium_installments` JSONB default `[]` di `placing_slips` dan `policies`. Data lama tetap sekaligus.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 382 lolos, termasuk 7 test baru:
  - persen rata dan jadwal bawaan, termasuk akhir bulan;
  - pembersihan JSON dan validasi;
  - nominal dan pembulatan;
  - dasar cicilan;
  - salinan ke polis dari slip, open cover sekaligus, dan revisi slip yang diteruskan ke polis.
- **Browser lokal:**
  - **Slip 022/LCH-PLCMT/PS-MV/XI/2026 (Closed, premi IDR 6.250.000):**
    - 4x cicilan terisi otomatis tiap 3 bulan, 25% atau 1.562.500;
    - persen yang tidak 100% ditahan saat simpan;
    - revisi tersimpan dan polis bernomor sementara 022/LCH-PLCMT/CI-MV/XI/2026 ikut terisi.
  - **Cetak CI:** blok PREMIUM INSTALMENT 1st sampai 4th.
  - **Policy Database:**
    - "4x cicilan · berikutnya 17 Feb 2027" dengan jadwal di popover;
    - polis manual PI/2026/BDG/0044 diisi 3x dari form polis;
    - polis dari slip menampilkan jadwal terkunci.
  - **Audit Trail:** perubahan tercatat di slip dan polis.
- Data uji, audit-nya, dan sesi uji dikembalikan atau dihapus sesudahnya.

## Catatan untuk yang melanjutkan

- **Phase 2 Finance** (Debit Note dan Credit Note per cicilan) bisa membaca `policies.premium_installments`. Credit Note sudah punya `instalment_no` dan `instalment_count`.
- **Rekap Produksi** kolom `Instl` masih 0. Format LCH belum menjelaskan apakah polis bercicilan ditulis satu baris per cicilan.
- **Stamp duty per Debit Note cicilan** belum dihitung. Untuk sekarang semua biaya ikut cicilan pertama.
- **graphify** belum terpasang di mesin ini, jadi graph tidak diperbarui.
