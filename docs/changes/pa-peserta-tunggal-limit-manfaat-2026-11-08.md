# PA: peserta tunggal tanpa tabel, dan peringatan limit manfaat klaim

- **Tanggal:** 2026-11-08
- **Branch:** `feat/pa-peserta-tunggal-limit-manfaat`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Lanjutan PA grup (#160–#162). Jawaban Harry, 7 November 2026, atas dua
asumsi di pesan PA grup, ditambah satu permintaan baru:

1. "benar prorata hari". Premi endorsement memang pro-rata harian, jadi rumus
   usulan di #161 tetap.
2. "melebihi up dan melebihi limit meninggal, cacat dan medis". Klaim PA perlu
   diberi peringatan kalau nilainya melebihi UP peserta, dan kalau melebihi
   limit manfaat meninggal, cacat, dan biaya medis.
3. "Jika peserta hanya 1 ga tampil pakai tabel kan slipnya?". Slip dengan satu
   peserta tidak memakai lampiran tabel.

Contoh LCH yang dipakai sebagai acuan:

- **CI PA ekspatriat Salam Pacific (satu peserta):** mencetak baris "PID /
  Insured Name" berisi nama, nomor paspor, tanggal lahir, dan jabatan.
- **Manfaat di kedua contoh PA LCH:** Death 100% UP, Permanent Disablement
  100%, PPD maksimal 100% sesuai tabel, dan Medical Expenses 10% UP.

## Yang berubah

- **Slip PA dengan satu peserta:**
  - Tabel detail mencetak baris **PID / Insured Name**, tepat sesudah Period
    of Insurance. Isinya Name, ID / Passport No., Date of Birth, dan
    Occupation; isian yang kosong tidak dicetak.
  - Interest Insured menjadi "Sum Insured (per PID)" dengan UP peserta.
  - Lampiran DAFTAR PESERTA tidak dicetak. Slip dengan dua peserta atau lebih
    tetap memakai lampiran.
  - Beneficiary tetap baris Detail tambahan bawaan TOC 1004, jadi tidak
    tercetak dua kali.
- **Master Data, Jenis Manfaat PA** (lookup baru `pa_benefit`):
  - Meninggal Dunia (`death`), Cacat Tetap (`disability`), dan Biaya Medis
    (`medical`).
  - Kodenya dipakai sistem, jadi ketiga baris itu ditandai sistem. Namanya
    bisa diubah, dan jenis manfaat lain bisa ditambah.
- **Form slip General Accident, bagian Daftar Peserta:** limit per jenis
  manfaat dalam persen UP.
  - Bawaannya 100, 100, dan 10, sesuai contoh LCH.
  - Limit ini hanya dipakai untuk peringatan klaim. Manfaat yang dicetak di
    slip tetap ditulis di Special Conditions.
  - Duplikat slip ikut menyalin limit.
- **Polis dari slip General Accident** menyalin limit itu, termasuk bawaan
  untuk slip yang belum pernah diisi.
- **Form klaim, polis yang punya daftar peserta:**
  - Field **Jenis Manfaat** wajib. Keterangannya menunjukkan limit, misalnya
    "Limit 20% × UP IDR 150.000.000 = IDR 30.000.000".
  - Peringatan muncul langsung kalau estimasi, nilai diajukan, atau nilai
    dibayar melebihi UP peserta atau limit jenis manfaatnya.
  - Peringatan tidak menahan penyimpanan.
  - Server menolak klaim PA tanpa jenis manfaat, atau dengan jenis manfaat
    yang bukan dari lookup `pa_benefit`.
- **Detail klaim** menampilkan jenis manfaat dan peringatan yang sama. Export
  register klaim mendapat kolom **Jenis Manfaat**.

## File utama

- `prisma/schema.prisma` dan migrasi `20261108090000_limit_manfaat_pa`:
  - lookup `pa_benefit`;
  - `placing_slips.pa_benefit_limits` dan `policies.pa_benefit_limits`
    (JSONB);
  - `claims.pa_benefit_id`.
- `lib/pa-benefits.ts`: bawaan limit, pembersihan isian, dan teks peringatan
  klaim.
- `lib/slip-participants.ts`: `participantPidText`, dan Interest peserta
  tunggal.
- `components/documents/doc-blocks.tsx`: baris PID dan lampiran untuk dua
  peserta atau lebih.
- `components/underwriting/placing-slip-form.tsx`, `lib/server/placing-slips.ts`,
  dan `app/(app)/underwriting/actions.ts`: limit di slip.
- `lib/server/policies.ts`: salin limit ke polis, dan `getPolicyRoster`.
- `lib/server/claims.ts` dan `app/(app)/claims/actions.ts`: jenis manfaat,
  pengecekan server, dan `getClaimRosterAction`.
- `components/claims/claim-form.tsx`, `claim-detail-sheet.tsx`, dan
  `claims-view.tsx`: jenis manfaat dan peringatan.

## Dampak

- **Database:**
  - Tiga baris lookup baru.
  - Dua kolom JSONB nullable dan satu kolom FK nullable.
  - Data lama tidak berubah. Slip dan polis tanpa limit memakai bawaan.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos. Satu warning lama di
  `claims-view.tsx:128` tidak terkait.
- `npx tsx --test tests/*.test.ts`: 95 lolos.
  - Termasuk `tests/pa-benefits.test.ts` (limit, peringatan, dan baris PID).
  - Test Interest peserta tunggal di `slip-participants.test.ts` disesuaikan
    ke "Sum Insured (per PID)".
- `npm run build`: lolos.
- **Uji server lokal** dengan skrip sementara; data ujinya sudah dihapus:
  - Slip GA satu peserta dengan limit Biaya Medis 20%: limit tersimpan dan
    Interest menjadi "Sum Insured (per PID)".
  - Polis dari slip itu menyimpan limit {death 100, disability 100, medical
    20}.
  - Klaim tanpa jenis manfaat ditolak, dan jenis manfaat dari lookup lain
    ditolak.
  - Klaim Biaya Medis tersimpan dengan UP 150 jt dan limit 20%.
- **Uji browser** dengan sesi login lokal sementara:
  - Cetakan Placing Slip: baris PID tercetak dan lampiran tabel tidak ada.
  - Form slip menampilkan limit 100 / 100 / 20.
  - Form klaim:
    - peserta tunggal terpilih otomatis;
    - keterangan limit tampil;
    - nilai diajukan 25 jt tanpa peringatan;
    - 35 jt memunculkan peringatan limit Biaya Medis (30 jt);
    - estimasi 200 jt memunculkan peringatan UP (150 jt);
    - klaim tetap tersimpan.
  - Detail klaim menampilkan jenis manfaat dan peringatan yang sama.

## Catatan untuk yang melanjutkan

- **Peringatan per klaim**, bukan akumulasi beberapa klaim satu peserta.
  Kalau limit Biaya Medis berlaku per tahun (beberapa klaim dijumlah),
  pengecekannya perlu diubah. Tanyakan ke Harry kalau kasusnya muncul.
- **Cacat Tetap memakai satu limit** untuk cacat tetap total maupun sebagian.
  Persentase cacat sebagian sesuai tabel polis belum dihitung sistem.
- **Limit tidak tercetak di slip.** Kalau LCH ingin blok Benefit tercetak
  dari isian ini, buat PR terpisah supaya Special Conditions tidak dobel.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
