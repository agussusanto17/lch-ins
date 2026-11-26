# Marine Hull: rincian premi installment per section (IV & War di cicilan 1)

- **Tanggal:** 2026-11-26
- **Branch:** `feat/marine-hull-installment`
- **PR:** #325
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Lanjutan #323 (jadwal kapal) dan #324 (cetak). Usulan konfirmasi ke Harry poin 4: pembayaran premi cukup ditulis di teks slip, misalnya "H&M payable quarterly in advance, IV & War in advance". Jawaban Harry, 26 November 2026: "buat ada rincian installment aja bro untuk premi".

Contoh CI Patria: "PREMIUM PAYABLE QUARTERLY IN ADVANCE (H&M ONLY) / PREMIUM PAYABLE IN ADVANCE (IV & WAR ONLY)". Signed slip MHL memakai Deferred Premium Clause: 4 cicilan untuk semua premi.

## Yang berubah

- **Slip Marine Hull dengan jadwal kapal punya saklar "IV & War dibayar penuh di cicilan 1"** di bagian premi installment. Slip baru menyalakannya otomatis, mengikuti pola CI Patria. Slip yang sudah tersimpan sebelum PR ini mulai dalam keadaan mati.
  - **Saklar menyala:** persen di editor cicilan berlaku untuk premi H&M setelah diskon. IV, War, admin cost, dan stamp duty masuk cicilan 1. Pilihan 4x langsung memberi H&M 25% per kuartal.
  - **Saklar mati:** semua section dibagi persen yang sama, seperti Deferred Premium Clause MHL.
  - **Ganti pola:** jumlah cicilan dan jatuh tempo tetap; persennya dibagi rata lagi pada dasar yang baru.
  - **Nilai atau rate kapal diubah setelah cicilan diisi:** persen H&M tiap cicilan dipertahankan dan persen tersimpan dihitung ulang, jadi H&M tetap 25% per kuartal.
- **Ubah kapal, hapus kapal, ganti format, dan upload Excel kini membawa isian jadwal lain** (termasuk pola cicilan) dan tidak menyusun ulang jadwal dari nol.
- **Tabel "Rincian cicilan per section"** di bawah editor: tiap cicilan menampilkan jatuh tempo, H&M, IV, War, admin & stamp, dan total.
- **Jadwal tetap disimpan sebagai persen dari premi total setelah diskon,** sama dengan slip lain. Polis dari CI, Policy Database, dan Rekap Produksi per cicilan tidak berubah dan langsung memakai nominal yang sama.
- **Presisi persen cicilan naik dari 4 ke 10 desimal,** supaya persen turunan (misalnya 29,5179…% untuk cicilan 1) memberi nominal tepat sampai sen pada premi miliaran. Jadwal lama tidak berubah.
- **Installment tetap tidak dicetak di slip,** sesuai keputusan #305.

## File utama

- `lib/hull-installments.ts`:
  - `hullInstallmentParts`: premi bersih per section, dengan diskon dibagi sesuai porsi;
  - `toHmInstallments` / `fromHmInstallments`;
  - `hullInstallmentBreakdown`;
  - `hullSchedulePatch`.
- `components/underwriting/hull-installments.tsx`: saklar, editor cicilan, dan tabel rincian.
- `components/underwriting/placing-slip-form.tsx`: slip jadwal kapal memakai komponen di atas.
- `lib/marine-hull.ts`: `ivWarInAdvance` di jadwal (JSON, tanpa migrasi), dengan nilai awal menyala untuk jadwal baru.
- `lib/premium-installments.ts`: `cleanInstallments` 10 desimal.
- `lib/slip-audit.ts`: audit mencatat pola IV & War di cicilan 1.
- `tests/hull-installments.test.ts`, `tests/premi-installment.test.ts`.

## Dampak

- **Database:** tidak ada migrasi. Pola tersimpan di `placing_slips.hull_schedule`.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 468 lolos. Tes baru memakai angka jadwal Patria:
  - **4 kuartal, IV & War di cicilan 1:**
    - Cicilan 1: H&M 1.197.428.970,13 + IV 204.688.712,85 + War 102.344.356,42 = 1.504.462.039,40.
    - Cicilan 2–3: 1.197.428.970,13. Cicilan 4: 1.197.428.970,14.
    - Nominal polis dari persen tersimpan sama sampai sen, dan bolak-balik ke persen H&M tetap 25%.
  - **Tanpa pola:** tiap section ÷ 4. War 25.586.089,11 dan cicilan terakhir 25.586.089,09.
  - **Diskon 10%, admin 50.000, stamp 10.000:** diskon dibagi per section, biaya di cicilan 1.
  - **Nilai IV dan rate War satu kapal diubah setelah cicilan diisi:** H&M tetap 25% per kuartal, IV dan War baru di cicilan 1.
- **Browser lokal** (slip uji 4 kapal Patria, tidak disimpan):
  - Pilih 4x dengan saklar mati: rincian proporsional.
  - Saklar dinyalakan: rincian sama dengan tes di atas, editor menampilkan 25% H&M per cicilan, dan muncul keterangan IV/War/biaya di cicilan 1.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Polis tidak menyimpan jadwal kapal.** Rincian per section hanya ada di slip; Policy Database menampilkan nominal per cicilan seperti biasa.
