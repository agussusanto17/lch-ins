# Audit trail placing slip mencatat isian dokumen

- **Tanggal:** 2026-11-15
- **Branch:** `fix/audit-isian-dokumen-slip`
- **PR:** [#254](https://github.com/agussusanto17/lch-ins/pull/254)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Temuan SIT-124, 15 November 2026** (uji ulang PR #241 di kode main bcaff7e): slip 008/LCH-PLCMT/PS-CAR/XI/2026 diubah Risk Location-nya menjadi dua butir bernomor dan Detail Tambahan-nya diisi (The Project, The Business), lalu disimpan. Audit trail mencatat baris Ubah tanpa rincian: "Tidak ada rincian perubahan yang tercatat pada log ini."
- **Penyebab:** ringkasan audit slip dari PR #241 hanya berisi total nilai pertanggungan, total premi, deductible, Special Conditions, dan klausul, ditambah nama tertanggung, status, tanggal dokumen, periode, brokerage, PPN, dan additional fee. Isian lain yang tercetak di dokumen tidak ikut, jadi perubahannya tidak terlacak.

## Yang berubah

- **Ringkasan audit slip** (`slipAuditSummary` di `lib/slip-audit.ts`) sekarang juga mencatat isian dokumen ini, sebelum dan sesudah, hanya bila teksnya berubah:
  - Type of Cover dan Type of Cover di dokumen;
  - uraian tertanggung dan alamat korespondensi;
  - label periode, teks periode, teks tanggal akhir, dan keterangan periode;
  - Detail Tambahan yang tercetak, satu baris "Label: isi" (baris tanpa isi tidak tercetak, jadi juga tidak dicatat);
  - okupasi, okupasi di dokumen, Risk Location, kelas konstruksi, dan Coverage;
  - judul Interest Insured Section 1 dan 2, kalimat pengantar deductible, dan Exclusions;
  - wording form (diurutkan, karena urutan relasinya di database tidak dijamin);
  - diskon, biaya admin, dan bea meterai;
  - Subjectivity, catatan Closing Instruction, dan catatan Cover Note.
- **Isi sesudah revisi dibaca ulang dari database** di dalam transaksi yang sama (`updatePlacingSlip`), dengan bentuk yang sama seperti isi sebelum revisi. Sebelumnya isi sesudah revisi disusun ulang dari input form; cara itu harus meniru setiap aturan simpan dan rawan berbeda dari yang benar-benar tersimpan.
- **Label baru** di `components/audit/audit-fields.ts`, misalnya "Alamat korespondensi", "Okupasi di dokumen", "Wording form", dan "Diskon (%)". Label yang sudah ada dipakai ulang, misalnya "Lokasi risiko" dan "Detail tambahan".
- **Tidak berubah:** uraian dan nilai tiap objek interest tidak dirinci (perubahan nilainya terlihat dari total), peserta PA, dan baris audit lama.

## Dampak

- **Database:** tidak ada migrasi. Simpan slip menambah satu query baca di dalam transaksi.
- **Env:** tidak ada.
- **Deploy:** biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 257 tes, 254 lolos. 2 tes baru di `tests/slip-audit.test.ts` (isian dokumen tercatat; urutan wording form tidak dianggap perubahan). 3 tes margin cetak 18 mm di `tests/documents.test.ts` gagal sejak #236 dan tidak terkait perubahan ini.
- **Uji browser lokal** (build `next start`, sesi uji SIT Admin, DB lokal), slip 008: Risk Location butir 2 diganti "Gudang Material SIT Cikarang" dan isi The Business diubah, lalu disimpan. Log Ubah mencatat tepat 2 rincian, Detail tambahan dan Lokasi risiko, dengan teks sebelum dan sesudah. Tidak ada rincian lain yang ikut tercatat, jadi pembacaan ulang dari database tidak menghasilkan perubahan palsu.

## Catatan untuk yang melanjutkan

- SIT-124 di sheet Test Case berstatus Gagal sampai perubahan ini live; setelah live, ulangi langkah 3 lalu ubah ke Lulus.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
