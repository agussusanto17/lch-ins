# Report Statistik Klaim per Status

- **Tanggal:** 2026-11-19
- **Branch:** `feat/statistik-klaim-status`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (17 November 2026), poin 17: report statistik klaim berdasarkan status masuk ke daftar menu Report (poin 16).
- Template dari Team LCH belum diterima. Agus meminta report ini dikerjakan lebih dulu.
- Acuannya contoh register klaim LCH (`documents/COntoh Register Klaim LCH Indonesia 2022-23-24-25 fix (1).xlsx`):
  - sheet CLAIM LIST 2026 dan LIST OUTSTANDING CLAIM PER <tanggal>;
  - judul kolom dua baris, English lalu Indonesia.

## Yang berubah

- **Report baru "Statistik Klaim per Status"** di menu Report, grup Klaim.
  - Periodenya berdasarkan tanggal lapor klaim. Klaim tanpa tanggal lapor memakai tanggal kejadian.
  - Hasilnya file Excel dengan dua sheet: Ringkasan dan Daftar Klaim.
- **Sheet Ringkasan:**
  - **Per status:** semua status tetap tampil walau jumlahnya 0. Kolomnya: jumlah klaim, % jumlah, estimasi kerugian, nilai diajukan, nilai disetujui/dibayar, adjuster fee, dan salvage. Semua nilai dalam IDR (kurs tetap report).
  - **Jumlah klaim per status** untuk tiga kelompok:
    - per COB;
    - per asuransi (leader);
    - per tahapan dokumen, mengikuti urutan Master Data.
  - Setiap tabel ditutup baris Total.
- **Sheet Daftar Klaim:**
  - Kolomnya mengikuti register LCH: Register No, Insured Name, Insurer, Policy No, COB, Sum Insured, Estimated Claim, DOL, Date Reported, Date Complete, Date SPK / SPGR, Status, Remark, dan Note.
  - Ditambah kolom mata uang, nilai diajukan, nilai dibayar, adjuster fee, salvage, tahapan dokumen, adjuster, dan kronologi.
  - Remark berisi tindak lanjut terakhir dari timeline klaim. Note berisi catatan klaim.
  - Urutan baris: status, lalu tanggal lapor. Ada filter di judul kolom, dan kolom No. serta Register No dibekukan.
- **Hak akses:** sama dengan bagian Klaim di Report Operational (`canSeeReportClaims`), yaitu Admin, Marketing, Klaim, dan Direksi. Placement bisa membuka menu Report, tapi tidak melihat report ini, dan server action-nya juga menolak.
- `lib/export.ts` sekarang punya `downloadWorkbook`, dipakai `exportXlsx` dan report ini.

## File utama

- `lib/claim-statistics.ts`: ringkasan per status, pivot, urutan daftar, dan isi workbook (`fillClaimStatistics`).
- `lib/server/claim-statistics.ts`: query klaim per periode beserta polis, asuransi leader, tindak lanjut terakhir, dan nama status/tahapan dari Master Data.
- `app/(app)/reports/actions.ts`: `claimStatisticsAction`.
- `lib/report-catalog.ts`, `components/reports/report-catalog.tsx`: entri report, filter role klaim, dan generator.
- `lib/export.ts`: `downloadWorkbook`.
- `tests/claim-statistics.test.ts`, `tests/report-catalog.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint: lolos, kecuali 1 warning lama di `components/claims/claims-view.tsx`.
- `npx tsx --test tests/*.test.ts`: 324 lolos, termasuk 6 test baru:
  - dasar periode;
  - ringkasan per status dengan konversi USD;
  - urutan pivot dan daftar;
  - isi workbook yang ditulis lalu dibaca ulang. Tanggal tetap benar walau test dijalankan dengan `TZ=Asia/Jakarta`;
  - report klaim tidak tampil untuk Placement.
- **Browser lokal** (SIT Admin, menu Report):
  - **November 2026:** 2 klaim, cocok dengan DB. File `statistik-klaim-2026-11-01-sd-2026-11-30-…xlsx` terunduh.
  - **Januari 2025:** muncul info "Tidak ada klaim di periode ini", tanpa unduhan.
  - **2026–2027:** 8 klaim.
    - Outstanding 6 dan Settled 2, dengan estimasi 1.517.500.000 dan 908.700.000. Nilai dibayar 851.340.000, termasuk klaim USD. Semuanya cocok dengan DB.
    - Tanggal tersimpan sebagai serial bulat (tanpa jam).
    - Kolom Tindak Lanjut Terakhir terisi untuk CLM-LCH002/MV/XI/2026.
  - Sesi uji dihapus. Tidak ada data yang berubah (audit tetap 525).

## Catatan untuk yang melanjutkan

- **Template Team LCH:** begitu template untuk poin 17 dan 18 datang, cukup sesuaikan kolom di `LIST_COLUMNS` dan tabel di `fillSummarySheet`. Data yang sudah diambil server tidak perlu diubah.
- **Statistik memakai status saat ini.** Sistem belum menyimpan riwayat status per tanggal, jadi snapshot seperti sheet "OS <tanggal>" di register belum bisa dibuat untuk tanggal yang sudah lewat.
- **Sum Insured** memakai mata uang polis, yang sama dengan mata uang klaim saat klaim dicatat.
- **Bug terpisah, ditemukan saat mengerjakan ini:** `exportXlsx` menulis tanggal sebagai tengah malam lokal, sehingga di WIB Excel menampilkan tanggal sehari lebih awal. Sudah diajukan sebagai task terpisah; report ini memakai tanggal UTC (`excelDate`).
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
