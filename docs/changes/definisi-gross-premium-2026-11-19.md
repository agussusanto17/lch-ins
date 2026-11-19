# Definisi Gross Premium dan nilai klaim loss ratio

- **Tanggal:** 2026-11-19
- **Branch:** `fix/definisi-gross-premium`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Koreksi dari Agus (19 November 2026), dengan screenshot panel Loss Ratio Polis di form klaim:

- **Nilai klaim** dihitung dari nilai yang disetujui/dibayarkan. Sebelumnya, klaim yang masih berjalan memakai estimasi kerugian. Di screenshot, panel menampilkan Klaim 17.000.000 (estimasi), padahal nilai disetujui 8.820.000.
- **Gross Premium** = total premi sebelum dikurangi diskon, brokerage, maupun additional fee. Sebelumnya Gross Premium = premi − diskon (catatan perubahan `gross-premium-loss-ratio-2026-11-18.md`, PR #279).
- **Nett Premium** = Gross Premium − diskon − brokerage − additional fee. Angkanya sama dengan sebelumnya; yang berubah urutan penyebutannya.

## Yang berubah

- **`grossPremium`** (`lib/calc.ts`) sekarang mengembalikan premi sebelum diskon. Karena itu nilai Gross Premium di bagian berikut menjadi premi sebelum diskon:
  - Policy Database (kolom, export, dan total footer);
  - Dashboard (keterangan di kartu Total Brokerage);
  - Report Operational;
  - Renewal Notice beserta cetak daftarnya.
- **Diskon tetap tercatat di polis:**
  - Policy Database menampilkannya di bawah Gross Premium.
  - Export Policy Database dan Report punya kolom Gross Premium lalu Diskon. Kolom Premium yang sekarang sama dengan Gross Premium dihapus.
- **`nettPremium`** = Gross Premium − diskon − brokerage − additional fee.
- **Ringkasan Penutupan:**
  - Urutan baris: Gross Premium (total premi), Diskon, Brokerage (dari Gross Premium), Additional fee, lalu Nett Premium ke asuransi.
  - Baris antara "Gross Premium = premi − diskon" dihapus.
  - Kolom per asuransi berjudul Gross Premium.
- **Form polis:** keterangan isian Diskon menyebut Nett = gross − diskon − brokerage − additional fee.
- **Loss ratio:**
  - Nilai klaim = nilai disetujui/dibayar untuk semua status; klaim Rejected tetap tidak dihitung.
  - Gross Loss Ratio dibagi total premi.
  - Nett Loss Ratio dibagi Gross − diskon − brokerage − additional fee.
  - Panel menampilkan keterangan baru untuk Gross Premium, Nett Premium, dan klaim yang sedang dibuka.

## File utama

- `lib/calc.ts`, `lib/data/analytics.ts`, `lib/closing-summary.ts`, `lib/loss-ratio.ts`.
- `components/underwriting/closing-summary.tsx`, `components/claims/loss-ratio-panel.tsx`, `components/policies/policy-form.tsx`, `components/policies/policy-database.tsx`, `components/reports/report-view.tsx`.
- `tests/gross-premium-loss-ratio.test.ts`.

## Dampak

- **Database:** tidak ada. Kolom diskon polis dari #279 tetap dipakai.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Angka yang berubah setelah deploy:**
  - Gross Premium di Policy Database, Dashboard, report, dan Renewal Notice kembali ke premi sebelum diskon.
  - Loss ratio klaim yang nilai disetujui/dibayarnya masih 0 menjadi 0%.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint: lolos, kecuali 1 warning lama di `components/claims/claims-view.tsx`.
- `npx tsx --test tests/*.test.ts`: 337 lolos. Test yang disesuaikan atau baru:
  - **Contoh MoM:** Gross Premium 100.000.000 dan Nett 70.000.000, jadi Gross LR 41,00% dan Nett LR 58,57%.
  - **Nilai klaim:** sama dengan nilai disetujui untuk semua status selain Rejected.
  - **Angka dari screenshot:**
    - premi 252.038.548,73, diskon 37.805.782,31, additional fee 25.518.903,06;
    - klaim disetujui 8.820.000;
    - hasilnya Gross LR 3,50%, Nett Premium 188.713.863,36, dan Nett LR 4,67%.
  - **Ringkasan Penutupan:** Gross 10.000.000 dan Nett 7.500.000.
- **Browser lokal** (data tidak disimpan):
  - **Detail klaim CLM/2026/07/0030** (polis CAR berdiskon): Klaim IDR 0 karena belum ada nilai disetujui. Gross Premium IDR 999.750.000. Nett Premium IDR 849.787.500 (Gross − diskon 49.987.500 − brokerage 99.975.000).
  - **Form Edit klaim**, nilai disetujui diisi 100.000.000: Gross LR 10,00% dan Nett LR 11,77%.
  - **Ringkasan Penutupan slip 006:** Gross Premium 999.750.000, diskon 5%, brokerage 10% dari Gross Premium, Nett 849.787.500.
  - **Policy Database:** Gross Premium IDR 999.750.000 dengan diskon di bawahnya.

## Catatan untuk yang melanjutkan

- **MoM poin 13 dan 19** (di Claude Doc dan Notion) masih memakai definisi lama (Gross = premi − diskon) dan contoh lama (Gross LR 45,56%). Perlu disesuaikan bersama perubahan ini.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
