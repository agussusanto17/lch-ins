# Draft Quotation memakai form placing slip

- **Tanggal:** 2026-11-03
- **Branch:** `feat/quotation-form-seperti-placing`
- **PR:** [#100](https://github.com/agussusanto17/lch-ins/pull/100)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Halaman Draft Quotation (`/underwriting/quotation/edit/[id]`) sebelumnya
halaman tersendiri. Isinya hanya ringkasan slip, Subjectivity, Security (panel
asuransi), Closing Instruction, dan Catatan Draft Cover Note. Agus minta
tampilannya sama dengan input placing slip, ditambah Subjectivity dan Security
di bawah Brokerage (Request & Temuan REQ-017).

Rencana ini juga tercatat sebagai "tugas 2" di catatan PR #86
([simpan-draft-quotation-database-2026-11-03.md](simpan-draft-quotation-database-2026-11-03.md)).
Adi belum mulai, jadi dikerjakan di sini. Closing Instruction dan Catatan Draft
Cover Note tetap ada.

## Yang berubah

- `PlacingSlipForm` punya tahap baru, `stage="quotation"`. Semua bagian placing
  slip tampil dan bisa diedit seperti di form placing. Di bawah Brokerage
  muncul Subjectivity, Security (Panel Asuransi), Closing Instruction, dan
  Catatan Draft Cover Note.
- Tombol bawah tahap quotation: Tutup, Simpan, Quotation Slip, Draft Cover
  Note, dan Terbitkan Closing Instruction. Untuk slip Closed, tombol terakhir
  menjadi Closing Instruction.
- Perilaku quotation lama tetap:
  - saat disimpan, slip Released naik ke Quoted begitu panelnya lengkap;
  - dokumen dibuka setelah slip disimpan, dan slip Closed atau Cancelled
    langsung membuka dokumennya;
  - menerbitkan closing menjadikan slip Closed lalu membuka dokumen Closing
    Instruction;
  - aturan panel dari PR #97 (asuransi tunggal tanpa leader atau member)
    dipindah utuh.
- Bawaan dari form placing: peringatan saat menutup tab dengan perubahan yang
  belum disimpan, dan cek batas brokerage OJK saat simpan.
- Bagian quotation dan logika panel dipindah ke `quotation-sections.tsx`.
  `quotation-draft-form.tsx` dihapus.
- Kode pembentuk data yang dikirim ke server, yang sebelumnya disalin tiga kali
  di form placing, disatukan menjadi `recordToSend`.

## File utama

- `components/underwriting/quotation-sections.tsx` (baru): `QuotationSections`,
  `QuotationActions`, `panelIssues`, `panelForSave`, dan `quotationStatus`.
- `components/underwriting/placing-slip-form.tsx`: `stage`, `recordToSend`,
  `persist`, `openQuotationDoc`, `issueClosing`, judul dan tombol per tahap.
- `app/(app)/underwriting/quotation/edit/[id]/page.tsx`: memakai
  `PlacingSlipForm` dengan `stage="quotation"`.
- `components/underwriting/quotation-draft-form.tsx`: dihapus.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Kedua tahap dirender dengan komponen asli untuk slip Released
  001/LCH-PLCMT/PS/VIII/2026:
  - placing: judul "Edit Placing Slip", tanpa bagian quotation, tombol Batalkan
    Slip, Tutup, Lihat Dokumen, Tersimpan, dan Lanjut ke Quotation Slip, sama
    seperti sebelumnya;
  - quotation: judul "Draft Quotation Slip", bagian placing sampai Brokerage,
    lalu Subjectivity, Security, Closing Instruction, dan Catatan Draft Cover
    Note, dengan tombol tahap quotation.
- Jalur simpan diuji ke database lokal dengan `updatePlacingSlip`, memakai data
  seperti yang dibentuk `recordToSend`: status Released naik ke Quoted, baris
  panel kosong dibuang, asuransi tunggal tersimpan sebagai leader, dan
  Subjectivity, Closing Instruction, serta Catatan Cover Note tersimpan. Slip
  dikembalikan ke keadaan semula sesudahnya.
- Tampilan halaman quotation dirender dengan CSS hasil build dan dicek visual.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Untuk slip Released atau Quoted, halaman Edit Placing Slip dan Draft
  Quotation sekarang menampilkan isian placing yang sama. Tombol "Lanjut ke
  Quotation Slip" di form placing tetap ada.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
