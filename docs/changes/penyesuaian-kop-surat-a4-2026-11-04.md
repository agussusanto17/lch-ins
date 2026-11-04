# Penyesuaian Kop Surat Resmi dan Standar Cetak Kertas A4

- **Tanggal:** 2026-11-04
- **Branch:** `feat/penyesuaian-kop-surat-a4`
- **PR:** #107 (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

LCH memberikan contoh dokumen resmi cetak (scan dokumen fisik ukuran kertas A4) dan meminta penyesuaian terhadap kop surat sistem back office:
1. Kop surat bagian atas tidak perlu mencantumkan alamat kantor (hanya logo resmi PT. LCH Insurance Brokers).
2. Alamat kantor lengkap dan informasi legalitas/keanggotaan (OJK terdaftar & diawasi, serta nomor keanggotaan APPARINDO: 237-2016/APPARINDO/2016) ditempatkan di bagian footer dokumen dengan bar gelap navy/purple khas LCH (`#2e243e`).
3. Pengaturan kertas dan layout dokumen cetak disesuaikan dengan standar kertas A4 (`@page { size: A4; margin: 14mm 12mm; }`), dengan footer bar yang merentang penuh (*bleed*) ke batas margin kertas saat dicetak.

## Yang berubah

- **Aset Regulasi Resmi (`public/images/regulatory-badges.png`):**
  - Dihasilkan dari ekstraksi resolusi tinggi (300 DPI) dari scan dokumen resmi LCH, memuat logo *"Terdaftar & diawasi oleh OJK"* dan *"APPARINDO No. Sertifikat Keanggotaan : 237-2016/APPARINDO/2016"* dengan background transparan.
- **Kop Surat Header & Footer (`components/documents/letterhead.tsx`):**
  - `Letterhead`: default prop `withAddress = false`, menghilangkan baris alamat dan garis pembatas bawah di header dokumen sehingga tampilan atas bersih hanya menampilkan logo resmi.
  - `DocumentFooter`: didesain ulang menjadi bar gelap navy (`bg-[#2e243e] text-white`) dengan alamat kantor di sisi kiri, logo OJK & APPARINDO di sisi kanan, serta kompensasi margin cetak A4 (`print:mx-[-12mm] print:mb-[-14mm] print:w-[calc(100%+24mm)] print:rounded-none print:px-[12mm] print:py-3 print:shadow-none`) agar tercetak rapi menempel di dasar halaman kertas A4.
- **Dokumen Penutupan & Underwriting (`components/documents/slip-documents.tsx`):**
  - Mengubah seluruh panggilan `Letterhead` di `PlacingSlipDocument`, `QuotationSlipDocument`, `CoverNoteDocument`, dan `ClosingInstructionDocument` agar menggunakan kop surat atas tanpa alamat.
  - Menambahkan komponen `<PrintedAt />` pada `PlacingSlipDocument` agar Placing Slip juga memiliki footer resmi LCH seperti dokumen lainnya.
- **Dokumen SPPA / KYC (`components/documents/sppa-documents.tsx`):**
  - Menambahkan aset `regulatoryBadges` ke `KycFooter` agar dokumen KYC menyertakan badge regulasi OJK & APPARINDO.

## File utama

- `public/images/regulatory-badges.png`: aset gambar logo OJK & APPARINDO dari dokumen resmi.
- `components/documents/letterhead.tsx`: implementasi `Letterhead` (header tanpa alamat) dan `DocumentFooter` (footer bar navy A4).
- `components/documents/slip-documents.tsx`: penyesuaian dokumen Placing Slip, Quotation Slip, Cover Note, dan Closing Instruction.
- `components/documents/sppa-documents.tsx`: penyesuaian footer SPPA / KYC.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** standar.

## Verifikasi

- `npx tsc --noEmit` lolos tanpa error.
- `npm run build` lolos (Turbopack production build).
- Verifikasi E2E visual via `ego-browser`:
  - Placing Slip (`/underwriting/slip/...`): header bersih tanpa alamat, footer bar navy `#2e243e` tampil dengan alamat lengkap dan badge OJK/APPARINDO.
  - Quotation Slip (`/underwriting/quotation/...`): header dan footer bar navy ter-render sempurna sesuai spesifikasi kertas A4.

## Catatan untuk yang melanjutkan

- Dimensi cetak kertas A4 dikendalikan oleh `.print-sheet` dan aturan `@page { size: A4; margin: 14mm 12mm; }` di `components/documents/document-shell.tsx`. Kompensasi margin `print:mx-[-12mm]` dan `print:mb-[-14mm]` pada `DocumentFooter` memastikan bar navy menutupi seluruh lebar halaman bawah saat dicetak.
