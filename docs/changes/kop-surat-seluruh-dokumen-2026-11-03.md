# Penyeragaman kop surat beralamat pada seluruh dokumen cetak

- **Tanggal:** 2026-11-03
- **Branch:** `feat/kop-surat-alamat`
- **PR:** #88
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

LCH meminta kop surat pada seluruh dokumen cetak disamakan formatnya (Image 3), yang memuat logo resmi PT. LCH Insurance Brokers dan nomor SKOJK, alamat kantor lengkap dengan pemisah titik tengah (`·`), nomor telepon resmi, serta garis pemisah di bawahnya.

Sebelumnya:
- Hanya Placing Slip yang menggunakan `<Letterhead withAddress />`.
- Quotation Slip, Closing Instruction, Renewal Letter, Renewal List, dan SPPA menggunakan `<Letterhead />` tanpa baris alamat (`withAddress = false`).
- Draft Cover Note sama sekali tidak memiliki kop surat (hanya judul dokumen).

Keputusan user:
- Cover Note sekarang memakai kop surat lengkap beralamat.
- Kop surat cukup muncul di halaman 1 dokumen cetak.

## Yang berubah

- `components/documents/letterhead.tsx`:
  - Mengubah nilai default prop `withAddress` dari `false` menjadi `true`. Dengan demikian, setiap pemanggilan `<Letterhead />` otomatis menyertakan baris alamat lengkap LCH.
- `components/documents/slip-documents.tsx`:
  - Menambahkan `<Letterhead withAddress />` pada `CoverNoteDocument`.
  - Menggunakan `<Letterhead withAddress />` secara eksplisit pada `QuotationSlipDocument` dan `ClosingInstructionDocument`.
  - Menghapus komentar lama yang menyatakan Cover Note sengaja dibuat tanpa kop surat.

## File utama

- `components/documents/letterhead.tsx`: default `withAddress = true`.
- `components/documents/slip-documents.tsx`: penambahan kop surat beralamat pada Cover Note, Quotation, dan Closing Instruction.

## Dampak

- **Database:** tidak ada perubahan skema atau data.
- **Env:** tidak ada.
- **Deploy:** standar.

## Verifikasi

- `npx tsc --noEmit` lolos tanpa error.
- `npx eslint` lolos tanpa error pada file yang diubah.
- `npm run build` lolos.

## Catatan untuk yang melanjutkan

- Permintaan LCH terkait kop surat di setiap halaman cetak (yang sebelumnya ditunda) tetap ditunda; kop surat saat ini tampil di halaman 1 dokumen.
