# Nama tertanggung polis diambil dari isian slip

- **Tanggal:** 2026-11-13
- **Branch:** `fix/nama-tertanggung-polis-dari-slip`
- **PR:** [#249](https://github.com/agussusanto17/lch-ins/pull/249)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Laporan Agus, 13 November 2026:** slip klien D'BEST GROUP diisi Nama Tertanggung "PT MARGAMAS INDAH DEVELOPMENT and/or Subsidiary … and PT. BANK CIMB NIAGA TBK as MORTGAGEE.", tetapi polis dan report (termasuk kolom `aname` Rekap Produksi) masih menulis D'BEST GROUP.
- **Penyebab:** `policyFieldsFromSlip` mengisi nama tertanggung polis dengan nama klien di Data Klien (`client?.name ?? slip.insuredName`). Aturan ini terbawa dari form polis prototipe (12 September 2026) ke polis otomatis saat CI terbit (#206). Jadi bukan keputusan LCH.
- **Fungsi yang sama dipakai di beberapa jalur,** jadi semuanya ikut salah:
  - polis otomatis saat Closing Instruction terbit;
  - tombol Catat polis dari CI;
  - Tambah Polis yang diambil dari slip;
  - revisi slip yang diteruskan ke polis bernomor sementara.
- **Record endorsement/cancellation slip** menyalin nama tertanggung polis induknya, jadi ikut tertulis nama klien.

## Yang berubah

- `lib/policy-from-slip.ts`: nama tertanggung polis = isian Nama Tertanggung slip. Nama klien hanya dipakai bila isian slip kosong. Klien polis tetap tertaut lewat `clientId`, jadi kolom `insured` Rekap Produksi (kode + nama klien) tidak berubah.
- **Migrasi data `20261113152300_nama_tertanggung_polis_dari_slip`:**
  - Polis dari slip yang nama tertanggungnya masih sama persis dengan nama klien diganti dengan isian Nama Tertanggung slip. Nama yang sama persis dengan nama klien berarti belum diubah petugas polis.
  - Endorsement dan pembatalan manual dari polis induk itu, yang menyalin nama klien, ikut disamakan dengan induknya.
  - Polis yang nama tertanggungnya sudah diubah petugas polis tidak disentuh.
- `tests/policy-from-slip.test.ts`: tes nama tertanggung diubah mengikuti aturan baru, ditambah 1 tes untuk cadangan nama klien.

## Dampak

- **Database:** migrasi data, tanpa kolom baru.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build seperti biasa.
- **Report dan Rekap Produksi:** kolom Tertanggung dan `aname` sekarang menulis nama tertanggung polis yang sebenarnya.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos, kecuali 3 tes margin cetak 18 mm di `tests/documents.test.ts` yang sudah gagal di main sejak #236.
- **Migrasi di database lokal:**
  - Satu polis berubah: CAR/2026/JTG/0019, dari "PT Karya Bangun Perkasa" (nama klien) menjadi "PT KARYA BANGUN PERKASA and/or Employer and/or Sub-Contractors" (isian slip).
  - Sesudahnya tidak ada lagi polis dari slip yang nama tertanggungnya sama dengan nama klien tetapi berbeda dari isian slip.
- **Uji browser lokal:** baris CAR/2026/JTG/0019 di Policy Database menulis "PT KARYA BANGUN PERKASA and/or Employer and/or Sub-Contractors". Tidak ada error console.

## Catatan untuk yang melanjutkan

- Uraian tertanggung di dokumen (`insuredDescription`) belum ikut ke nama tertanggung polis. Di contoh Rekap Produksi Harry, `aname` berisi nama tertanggung lengkap dengan "and/or"-nya. Menunggu jawaban Harry apakah uraian itu perlu ikut.
- Endorsement/cancellation slip tercatat di Policy Database saat ditutup ("Tutup … Dikonfirmasi Asuransi"), bukan saat diterbitkan.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
