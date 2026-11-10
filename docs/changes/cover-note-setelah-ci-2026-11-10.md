# Draft Cover Note terbit setelah Closing Instruction

- **Tanggal:** 2026-11-10
- **Branch:** `feat/cover-note-setelah-ci`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Catatan meeting LCH, 10 November 2026: Draft Cover Note dibuat setelah Closing Instruction terbit. Isinya mirip Closing Instruction, hanya tanpa brokerage.

Sebelumnya tombol Draft Cover Note ada di form Quotation, jadi CN bisa dibuka sebelum CI terbit. Isi dokumennya juga belum memuat Subjectivity.

## Yang berubah

- **Tombol Draft Cover Note** pindah dari form Quotation ke form Closing Instruction.
  - Tombolnya baru aktif setelah slip berstatus Closed. Sebelum itu tampil nonaktif dengan keterangan "Tersedia setelah Closing Instruction diterbitkan".
  - Daftar Placement mendapat menu "Lihat draft cover note" untuk slip Closed.
- **Isi Draft Cover Note** mengikuti Closing Instruction, kecuali tiga bagian:
  - SUBJECTIVITY ditambahkan, di posisi yang sama dengan CI.
  - BROKERAGE tidak dicetak.
  - INSTRUCTION juga tidak dicetak, karena isinya instruksi ke asuransi. Contoh CN 728 dan CN 743 dari LCH juga tidak memuat brokerage maupun instruksi.
  - Yang tidak berubah: tanpa kop, REMARKS, dan tanda tangan per asuransi seperti contoh CN.
- **Tombol Kembali** di dokumen CN mengarah ke form Closing Instruction.
- **Tanggal CN ikut tanggal closing**, bukan tanggal quoted.
  - Ini mengubah keputusan #201, yang memakai tanggal quoted untuk QS dan CN. Karena CN sekarang terbit setelah CI, tanggal quoted (yang lebih awal) tidak lagi cocok.
  - Bagian Tanggal Dokumen di form ikut berubah: "Quotation Slip" (tanggal quoted) dan "Closing Instruction & Draft Cover Note" (tanggal closing).

## File utama

- `components/underwriting/placing-slip-form.tsx`: tombol CN di form Closing, label bagian Tanggal Dokumen.
- `components/documents/slip-documents.tsx`: isi CN (Subjectivity) dan tombol Kembali.
- `components/underwriting/slip-table.tsx`: menu "Lihat draft cover note".
- `lib/document-dates.ts`: CN memakai tanggal closing.
- `tests/document-dates.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (154 tes), dan `npm run build`: lolos.
- **Uji browser lokal** (Playwright dan Chrome, sesi admin sementara; subjectivity uji dikembalikan):

  | Uji | Hasil |
  |---|---|
  | Form Quotation slip Quoted (005/…/PS-MC/X/2026) | Tidak ada tombol Draft Cover Note |
  | Form Closing slip Quoted | Tombol Draft Cover Note nonaktif |
  | Form Closing slip Closed (015/…/PS-TS/XI/2026) | Tombol aktif dan membuka CN |
  | Isi CN | Ada SUBJECTIVITY, tanpa BROKERAGE dan INSTRUCTION, tanggal "Jakarta, 09 November 2026" (tanggal closing) |
  | Menu daftar Placement slip Closed | "Lihat draft cover note" ada |

- Tidak ada error di console browser.

## Catatan untuk yang melanjutkan

- Halaman `/underwriting/cover-note/[id]` tetap bisa dibuka langsung lewat URL untuk slip yang belum Closed. Yang dibatasi hanya tombol dan menunya.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
