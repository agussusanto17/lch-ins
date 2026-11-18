# Alur tahapan Placement: Quotation terpisah dari Cover Note & Closing Instruction

- **Tanggal:** 2026-11-18
- **Branch:** `feat/alur-tahapan-placement`
- **PR:** #277
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (17 November 2026), poin 8: setelah Quotation, tahap berikutnya adalah Cover Note dan Closing Instruction. Saat itu tahap Quotation dan Cover Note masih tergabung.
- Kondisinya, form Quotation Slip (dan halaman edit slip yang bukan Draft) sudah memuat isian Closing Instruction dan Catatan Draft Cover Note.
- Tahapan yang disepakati:
  1. Placing Slip (Released);
  2. Quotation Slip (Quoted): security, subjectivity, dan perhitungan premi;
  3. Cover Note + Closing Instruction (Closed): isian Closing Instruction dan Catatan Cover Note, lalu keduanya dicetak;
  4. polis tercatat di Policy Database dari Closing Instruction.

## Yang berubah

- **Tahap Quotation** hanya berisi Subjectivity, Security (Panel Asuransi), dan perhitungan premi, termasuk additional discount (poin 7).
- **Isian Closing Instruction dan Catatan Cover Note** tidak lagi tampil di Quotation.
  - Isian ini hanya ada di tahap Cover Note & Closing Instruction (`/placement/closing/edit/[id]`).
  - Halaman edit slip yang sudah Closed juga masih menampilkannya.
  - Endorsement dan cancellation slip tidak memakainya.
  - Isian yang sudah terisi sebelumnya tetap tersimpan dan muncul di tahap ketiga.
- **Nama tahap ketiga** menjadi "Cover Note & Closing Instruction" di:
  - judul form;
  - breadcrumb;
  - judul halaman;
  - aksi di daftar slip ("Cover note & closing instruction").
  - Tombol di Quotation menjadi "Lanjut ke Cover Note & CI".
- **Kartu "Catatan Draft Cover Note"** menjadi "Catatan Cover Note", dengan penjelasan bahwa isinya dicetak sebagai REMARKS di Draft Cover Note.
- **Cetakan tidak berubah.** Closing Instruction dan Draft Cover Note dicetak dari tahap ketiga; Draft Cover Note tetap tersedia setelah Closing Instruction diterbitkan.

## File utama

- `components/underwriting/placing-slip-form.tsx`: `showClosingSections`, judul, dan tombol.
- `components/underwriting/slip-table.tsx`, `components/layout/app-topbar.tsx`, `app/(app)/placement/closing/edit/[id]/page.tsx`, `components/underwriting/closing-draft-form.tsx`.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: lolos (tanpa test baru; perubahannya di tampilan form).
- **Browser lokal** (SIT Admin, hanya membaca data):
  - **Quotation slip Released 003/PS:** tanpa Closing Instruction dan Catatan Cover Note; ada Subjectivity dan Security; tombol Lanjut ke Cover Note & CI.
  - **Tahap ketiga slip Quoted 005/PS-MC:** judul halaman, breadcrumb, dan judul form Cover Note & Closing Instruction; isian Closing Instruction dan Catatan Cover Note ada.
  - **Halaman edit:** slip Released tanpa kedua isian; slip Closed 006/PS-CAR menampilkannya.
  - **Quotation slip Closed:** tanpa kedua isian.
  - **Menu baris di daftar slip:** "Cover note & closing instruction".

## Catatan untuk yang melanjutkan

- **Status slip tetap Draft → Released → Quoted → Closed.** Polis tercatat dari Closing Instruction seperti sebelumnya (tahap 4).
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
