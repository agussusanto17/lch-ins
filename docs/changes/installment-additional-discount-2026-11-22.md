# Premium instalment tidak dicetak, cicilan pertama ikut admin dan stamp duty, additional discount tanpa batas

- **Tanggal:** 2026-11-22
- **Branch:** `fix/additional-discount-installment`, ditumpuk di atas `feat/premi-klien-deklarasi` (#303)
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Masukan Agus dan Harry, 22 November 2026:

- **Additional Discount (%):** "jangan dibatasi persentasenya". Sebelumnya isian ini dibatasi 15% (MoM review Phase 1, poin 7).
- **Blok PREMIUM INSTALMENT di cetakan slip (#296):**
  - kolom "Portion" diganti "Percentage";
  - cicilan ke-1 otomatis ditambah admin polis dan stamp duty;
  - lalu: "di tampilan printout slip ga perlu muncul bro, nanti di polis database aja sama report, biar nanti langsung otomatis masuk ke premium note dan commission note".

## Yang berubah

- **Additional Discount:** batas 15% dihapus. Form dan server hanya menolak di bawah 0% atau di atas 100%, karena lebih dari 100% membuat premi negatif. Keterangannya tidak lagi menyebut maksimal 15%.
- **Cetakan slip:** blok PREMIUM INSTALMENT dihapus dari Placing Slip, Quotation Slip, Cover Note, dan Closing Instruction.
- **Cicilan ke-1 termasuk admin cost dan stamp duty:**
  - **Hitungan:** `installmentAmounts` menambah biaya itu ke cicilan pertama. Cicilan lain tetap persen × premi setelah diskon.
  - **Placing slip:** editor installment menampilkan nominal cicilan ke-1 yang sudah termasuk biaya dan keterangannya. Totalnya = premi setelah diskon + biaya. Keterangannya menyebut jadwal tidak dicetak di slip.
  - **Policy Database:** jadwal cicilan (klik "4x cicilan") dan export Jadwal Cicilan memakai nominal yang sama.
  - **Kolom persen** di editor menjadi "Percentage (%)".
- **Admin cost dan stamp duty polis Baru dan Renewal:**
  - polis dari CI menyalin admin cost dan stamp duty slip (PAR + EQVET: tiap polis yang berpremi; open cover tidak);
  - revisi slip ikut mengubahnya di polis bernomor sementara;
  - form polis Baru/Renewal punya isian Admin Cost dan Stamp Duty. Isian ini terkunci untuk polis dari slip.
  - Sebelumnya hanya endorsement, pembatalan, dan deklarasi yang menyimpan keduanya.
- **Migrasi `20261122140000_admin_stamp_polis_installment`:** polis Baru/Renewal dari slip yang sudah ada diisi admin cost dan stamp duty slip-nya, bila keduanya masih 0.

## Asumsi

- **"Percentage" dipakai di tempat jadwal masih tampil,** karena cetakan slip tidak lagi memuat jadwal.
- **"Report" yang memuat jadwal = export Policy Database** (kolom Pembayaran Premi dan Jadwal Cicilan). Premium note dan commission note per cicilan dibuat di Phase 2.
- **Batas 100% tetap ada** sebagai pengaman, bukan batas bisnis.

## File utama

- **Additional discount:**
  - `lib/calc.ts` (`MAX_ADDITIONAL_DISCOUNT_PCT` = 100);
  - `app/(app)/placement/actions.ts`;
  - `components/underwriting/placing-slip-form.tsx`.
- **Installment:**
  - `lib/premium-installments.ts` (`installmentAmounts`, `slipInstallmentCharges`, `policyInstallmentCharges`);
  - `components/shared/installment-editor.tsx`;
  - `components/policies/installment-schedule.tsx`.
- **Cetakan:** `components/documents/slip-documents.tsx` dan `components/documents/doc-blocks.tsx` (blok cetak dihapus).
- **Polis:**
  - `lib/policy-from-slip.ts`;
  - `lib/server/policies.ts`;
  - `components/policies/policy-form.tsx`.
- **Migrasi:** `prisma/migrations/20261122140000_admin_stamp_polis_installment`.
- **Tes:** `tests/premi-installment.test.ts`.

## Dampak

- **Database:** satu migrasi berisi data (UPDATE admin_cost dan stamp_duty polis Baru/Renewal dari slip). Tidak ada kolom baru.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Merge setelah #303, lalu base PR ini diganti ke `main`.
- **Dokumen:** cetakan slip tidak lagi memuat jadwal cicilan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 410 lolos. Tes yang baru atau diubah:
  - cicilan ke-1 = 2.250.000 + 50.000 dan jumlahnya = premi + biaya;
  - polis dari slip menyalin admin cost dan stamp duty, kecuali open cover.
- **Migrasi di DB lokal:** 3 polis dari slip terisi (MV 018 dan 021: 50.000 + 10.000; CAR: 500.000 + 20.000).
- **Browser lokal**, form polis Baru tanpa slip (EEI/2026/JKT/0128, tidak disimpan):
  - Admin Cost 50.000 dan Stamp Duty 10.000 diisi, lalu 4x cicilan dipilih;
  - kolom "Percentage (%)", cicilan ke-1 10.560.000, cicilan lain 10.500.000;
  - total 42.060.000, dengan keterangan "Cicilan ke-1 termasuk admin cost dan stamp duty IDR 60.000".
- **Slip 018 di browser:** halaman edit dan cetakan tampil normal, tanpa blok jadwal.
- Field Additional Discount tidak ada di slip lokal mana pun karena hanya muncul di tahap Quotation dan Closing. Perubahannya dicek lewat kode, type check, dan build.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.
