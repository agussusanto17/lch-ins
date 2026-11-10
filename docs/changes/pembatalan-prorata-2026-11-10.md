# Pembatalan polis: usulan premi kembali prorata dan tanggal efektif

- **Tanggal:** 2026-11-10
- **Branch:** `feat/pembatalan-prorata`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Pada 10 November 2026 Harry mengirim contoh endorsement dan pembatalan dari asuransi:

- `documents/45020126015995 - EDM 01.pdf`
- `documents/45020126008633 - CANCELLATION.pdf`

**Contoh pembatalan:**
- Polis dibatalkan "terhitung sejak tanggal 22 Mei 2026" secara prorata.
- Tiap cover dihitung SI × rate × 341/365.
- Ditambah biaya pembatalan IDR 10.000, sehingga totalnya IDR (6.399.865,75).

**Contoh endorsement:**
- Uraian perubahan ditulis "sebelumnya … menjadi …".
- Berlaku sejak tanggal tertentu.

Di form polis, tanggal untuk endorsement dan pembatalan masih berlabel "Tanggal Mulai", dan premi kembali dihitung sendiri di luar sistem.

## Yang berubah

- **Tanggal Efektif.** Untuk tipe Endorsement dan Cancellation, isian "Tanggal Mulai" berlabel "Tanggal Efektif", dengan keterangan "Perubahan berlaku terhitung sejak tanggal ini" atau "Polis dibatalkan terhitung sejak tanggal ini". Kolom database tidak berubah.
- **Usulan pengembalian premi prorata** di form Cancellation, setelah polis yang dibatalkan dan tanggal efektif diisi:
  - **Rumus:** premi × sisa hari ÷ hari periode polis, seperti contoh asuransi.
  - **Premi dasar:** premi polis asal ditambah endorsement yang sudah tercatat.
  - **Tombol "Pakai usulan"** mengisi Premium (negatif) dan Total Sum Insured (dikurangi seluruh TSI).
  - **Biaya pembatalan dari asuransi** tidak dihitung otomatis; keterangan di form mengingatkannya.
- **Contoh Remarks** mengikuti kalimat di dokumen asuransi.

## File utama

- `lib/policy-cancellation.ts`: `cancellationSuggestion`.
- `components/policies/policy-form.tsx`: label Tanggal Efektif, kotak usulan, dan contoh Remarks.
- `tests/policy-cancellation.test.ts`: termasuk angka contoh Harry. Premi tahunan IDR 6.861.000 × 341/365 = IDR 6.409.865,75, sama dengan total dokumen sebelum biaya.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npx tsx --test tests/*.test.ts` (164 tes, 3 tes baru): lolos. `npm run build` dijalankan sebelum PR dibuka.
- **Uji browser lokal** (Playwright dan Chrome, sesi admin sementara, tanpa menyimpan polis): Tambah Polis, Cancellation, polis CAR/2026/JTG/0019, tanggal efektif 10 November 2026.
  - Usulan "IDR -710.981.947,48", dari premi IDR 999.750.000 × sisa 325/457 hari, sesuai hitungan manual.
  - "Pakai usulan" mengisi Premium -710.981.947,48 dan Total Sum Insured -465.000.000.000.
  - Contoh Remarks pembatalan tampil. Jumlah polis tetap 19, dan tidak ada error console.

## Catatan untuk yang melanjutkan

- Usulan prorata hanya untuk pembatalan. Endorsement tetap diisi selisih preminya. Contoh EDM 01 menghitung ulang tiap cover dengan harga dan rate baru, jadi usulan otomatis butuh data cover per polis yang belum ada di Policy Database.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
