# Input Lengkap di Draft Quotation, Cover Note, dan Closing

- **Tanggal:** 2026-11-03
- **Branch:** `feat/input-lengkap-draft-quotation`
- **PR:** #99
- **Dikerjakan oleh:** Antigravity

## Latar belakang

Berdasarkan masukan operasional tim LCH (Task 2 / Image 2), form editor pada halaman draft quotation (`/underwriting/quotation/edit/[id]`) sebelumnya hanya menampilkan ringkasan ringkas Placing Slip serta isian Subjectivity, Security Panel, Closing Instruction, dan Remarks Cover Note. Tim LCH membutuhkan menu inputan lengkap seperti input Placing Slip (Informasi Dasar, Objek Pertanggungan Section 1 & 2 / Interest Items, Okupasi, Deductibles per cover, Klausula, Tarif & Premi, Brokerage) agar data penempatan dapat disesuaikan secara langsung pada tahap quotation tanpa bolak-balik form. Selain itu:
1. Perubahan di form quotation harus langsung memperbarui record `placing_slips` yang sama di database (1 data bersama).
2. Setelah status naik (`Released` atau `Quoted`), seluruh field tetap bebas diedit hingga slip berstatus `Closed` (atau `Cancelled`).
3. Label tombol simpan disesuaikan menjadi "Simpan Perubahan" saat status sudah bukan `Draft`.

## Yang berubah

- **Unifikasi Komponen Form:** Komponen `PlacingSlipForm` ditingkatkan untuk mendukung mode `"quotation"` selain `"new"` dan `"edit"`. Komponen `QuotationDraftForm` mendelegasikan langsung ke `PlacingSlipForm` dengan `mode="quotation"`, mencegah duplikasi ~1.000 baris kode kalkulasi dan logika input.
- **Input Lengkap & Bagian Quotation:** Mode quotation menampilkan seluruh section placing slip lengkap, ditambah section Subjectivity, Security (Panel Asuransi / Co-insurance dengan verifikasi total share 100%), Closing Instruction, dan Remarks Cover Note.
- **Status Lifecycle & Label Tombol:**
  - Status `Draft`: tombol simpan bertuliskan "Simpan Draft".
  - Status `Released` / `Quoted`: tombol simpan bertuliskan "Simpan Perubahan".
  - Pada mode quotation, penyimpanan otomatis mengelevasi status dari `Released` menjadi `Quoted` jika panel asuransi telah terisi valid (total share 100% dan ada leader).
  - Status `Closed`: form terkunci via `<fieldset disabled={locked}>`.
- **Aksi Cepat Quotation:** Pada mode quotation, action bar menyediakan tombol langsung ke "Lihat Placing Slip", "Simpan Perubahan", "Quotation Slip", "Draft Cover Note", serta "Terbitkan Closing Instruction".
- **Props Server Halaman:** Route server `app/(app)/underwriting/quotation/edit/[id]/page.tsx` memuat opsi kendaraan (`listVehicleOptions`) dan klien tertanggung (`listInsuredOptions`) secara paralel via `Promise.all` dan meneruskannya ke form.

## File utama

- `components/underwriting/placing-slip-form.tsx`: Komponen form terpadu yang menangani mode input placing slip dan quotation slip, beserta validasi security panel dan transisi status.
- `components/underwriting/quotation-draft-form.tsx`: Komponen wrapper yang mendelegasikan langsung ke `PlacingSlipForm` dengan `mode="quotation"`.
- `app/(app)/underwriting/quotation/edit/[id]/page.tsx`: Server page route untuk menyuplai slip, opsi kendaraan, dan klien tertanggung.

## Dampak

- **Database:** Tidak ada migrasi baru; menggunakan skema tabel `placing_slips` dan relasi yang sudah ada.
- **Env:** Tidak ada variabel baru.
- **Deploy:** Tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`: lolos tanpa error.
- `npm run build`: lolos build Next.js (Turbopack) tanpa error.
- Akses editor `/underwriting/quotation/edit/[id]` menampilkan seluruh menu input placing slip beserta Subjectivity dan Security Panel, serta tombol "Simpan Perubahan".
