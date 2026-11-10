# Tanggal dokumen per jenis dan kop Lestari Cipta Hokindo

- **Tanggal:** 2026-11-10
- **Branch:** `feat/tanggal-dokumen-kop-lestari`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Pertanyaan no. 10, disetujui Harry 10 November 2026.** Dasar tanggal di baris "Jakarta, …" di atas tanda tangan:
  - Placing Slip memakai tanggal release.
  - Quotation Slip dan Draft Cover Note memakai tanggal quoted.
  - Closing Instruction memakai tanggal closing.
  - Untuk dokumen lama, tanggalnya bisa diisi manual.
- **Sebelumnya** keempat dokumen mencetak tanggal terakhir slip disimpan. Akibatnya tanggal ikut bergeser setiap kali slip disimpan atau direvisi, termasuk slip Closed sejak #187.
- **Pertanyaan no. 11 (REQ-067, SIT-055):** dokumen bertanggal sebelum 1 September 2025 memakai kop Lestari Cipta Hokindo. Kop ini menunggu no. 10, karena kop dipilih menurut tanggal dokumen.

## Yang berubah

- **Tiga tanggal dokumen di slip:**
  - **Kolomnya:** `release_date`, `quoted_date`, `closing_date`.
  - **Terisi otomatis** saat status berpindah:
    - release mengisi tanggal Placing Slip;
    - Quoted mengisi tanggal quoted;
    - Closed mengisi tanggal closing, dan juga tanggal quoted kalau masih kosong.
  - **Yang sudah terisi tidak ditimpa.** Tanggal yang diketik manual sebelum release tetap dipakai.
  - **Revisi slip Closed** tidak mengubah tanggalnya.
- **Bagian baru "Tanggal Dokumen" di form slip:**
  - Ada di form Placing, Quotation, dan Closing.
  - Berisi tiga isian tanggal yang bisa diubah untuk dokumen lama.
  - Tanggal sebelum 1 September 2025 diberi keterangan "kop Lestari Cipta Hokindo".
- **Cetakan:**
  - **Tanggal:** PS mencetak tanggal release, QS dan Draft Cover Note tanggal quoted, CI tanggal closing.
  - **Slip yang belum sampai tahapnya** (misalnya draft yang dibuka sebagai PS) tetap mencetak tanggal terakhir disimpan, seperti sebelumnya.
- **Kop dan footer mengikuti tanggal dokumen.** Sebelum 1 September 2025:
  - logo dan nama Lestari Cipta Hokindo tiga baris;
  - footer biru dengan telepon 2605 1671 dan 1672;
  - lencana OJK, APPARINDO, dan MARI Berasuransi;
  - nama penanda tangan "PT. Lestari Cipta Hokindo" di PS, QS, dan CI.

  Draft Cover Note tetap tanpa kop, tapi footernya ikut berganti.
- **Audit trail** mencatat perubahan ketiga tanggal dengan label Indonesia.
- **Slip lama diisi lewat migrasi:**
  - Tanggal release diambil dari `released_at`.
  - Tanggal quoted dan closing diambil dari perpindahan status pertama di audit trail.
  - Slip tanpa jejak audit memakai tanggal terakhir disimpan, sama dengan yang tercetak sebelumnya.

## File utama

- `lib/document-dates.ts`: aturan tanggal per dokumen, pengisian otomatis per status, batas kop 1 September 2025, dan nama penanda tangan.
- `lib/server/placing-slips.ts`: simpan, release, dan ubah status mengisi tanggal; mapper dan audit.
- `components/documents/letterhead.tsx`, `document-shell.tsx`, `printed-at.tsx`: varian kop dan footer.
- `components/documents/slip-documents.tsx`, `doc-blocks.tsx`: tanggal dan nama penanda tangan di keempat dokumen.
- `components/underwriting/placing-slip-form.tsx`: bagian Tanggal Dokumen.
- `public/images/logo-lestari.png`, `public/images/badges-lestari.png`: diambil dari scan kop LCH 21 Oktober 2026 (`documents/Scan2026-10-21_160858.pdf`).
- `prisma/migrations/20261110140000_tanggal_dokumen_slip`: kolom baru dan pengisian slip lama.
- `tests/document-dates.test.ts`.

## Dampak

- **Database:** migrasi `20261110140000_tanggal_dokumen_slip`, berisi tiga kolom DATE dan pengisian slip lama. Tanpa seed.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build seperti biasa.

## Verifikasi

- `npx prisma generate`, `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (153 tes), dan `npm run build`: lolos. Build lokal menerapkan migrasinya.
- **Hasil pengisian di database lokal:** semua slip Released, Quoted, Closed, dan Cancelled yang pernah di-release punya tanggal release. Semua slip Quoted dan Closed punya tanggal quoted, dan semua slip Closed punya tanggal closing.
- **Uji browser lokal** (Playwright dan Chrome, sesi admin sementara, data SIT dikembalikan setelahnya), memakai slip 015/LCH-PLCMT/PS-TS/XI/2026:

  | Dokumen | Tanggal uji | Tercetak | Kop dan footer |
  |---|---|---|---|
  | Placing Slip | 15 Agustus 2025 | Jakarta, 15 August 2025 | Lestari, telepon 1671/1672, penanda tangan Lestari |
  | Quotation Slip | 18 Agustus 2025 | Jakarta, 18 August 2025 | Lestari |
  | Draft Cover Note | 18 Agustus 2025 | Jakarta, 18 August 2025 | tanpa kop, footer Lestari |
  | Closing Instruction | 2 September 2025 | Jakarta, 02 September 2025 | LCH, telepon 1071/1072 |

- **Cetak PDF A4 Placing Slip:** kop Lestari tampil di atas judul dan footer biru di bawah, tanpa tumpang tindih.
- **Form:** mengisi tanggal Placing Slip 21 Juli 2025 di slip draft memunculkan keterangan kop Lestari. Setelah Simpan Draft, tanggal tersimpan dan tercatat di audit trail.
- Tidak ada error di console browser.

## Catatan untuk yang melanjutkan

- **Nomor dokumen lama.** Nomor dokumen tetap dari counter bulan release, jadi slip lama yang diinput sekarang bernomor bulan berjalan (misalnya XI/2026), padahal tanggalnya 2025. Kalau LCH perlu nomor asli dokumen lama, perlu isian nomor manual. Ini belum ditanyakan ke Harry.
- **Dokumen lain tidak ikut:** klaim, renewal notice, dan SPPA tetap memakai kop PT. LCH, karena tanggalnya hari ini.
- **Batas kop** disimpan sebagai konstanta `LCH_LETTERHEAD_FROM`, bukan data master. Tanggal itu fakta sejarah (KEP-474/PD.02/2025, berlaku mulai 1 September 2025), jadi tidak perlu diubah dari aplikasi.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
