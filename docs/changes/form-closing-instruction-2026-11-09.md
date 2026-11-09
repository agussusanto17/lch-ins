# Form Input Closing Instruction dan Revisi Slip Closed

- **Tanggal:** 2026-11-09
- **Branch:** `feat/form-closing-instruction`
- **PR:** #187
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Alur penerbitan Closing Instruction sebelumnya langsung mengarahkan pengguna dari Quotation Slip ke halaman cetak dokumen (`/underwriting/closing/[id]`) tanpa form input perantara. Akibatnya, data closing instruction (seperti catatan instruction, panel asuransi, dsb.) tidak dapat ditinjau atau diedit dalam form khusus sebelum dokumen dicetak.

Selain itu, slip dengan status "Closed" sebelumnya terkunci secara ketat (*immutable*) baik di validasi server (`updatePlacingSlip`, `editableSlip`) maupun di form UI, sehingga perbaikan atau revisi pasca penerbitan tidak dapat disimpan tanpa membuka pembatalan.

## Yang berubah

- **Rute form input Closing Instruction (`/underwriting/closing/edit/[id]`):**
  - Menyediakan halaman form khusus untuk Closing Instruction yang simetris dengan alur Placing (`/underwriting/edit/[id]`) dan Quotation (`/underwriting/quotation/edit/[id]`).
  - Menghubungkan tombol navigasi di Quotation Slip form ("Lanjut ke Closing Instruction") ke form edit closing `/underwriting/closing/edit/[id]`, bukan langsung mencetak dokumen.
  - Membuka mode form `"closing"` pada `PlacingSlipForm` dan menyediakan wrapper component `ClosingDraftForm` di `components/underwriting/closing-draft-form.tsx`.
- **Dukungan revisi pada slip berstatus Closed:**
  - Menghilangkan larangan mutasi `existing.status === "Closed"` pada `updatePlacingSlip` (`lib/server/placing-slips.ts`) dan `editableSlip` (`lib/server/slip-files.ts`). Hanya status `Cancelled` yang tetap terkunci secara mutlak.
  - Pada form UI, slip berstatus `Closed` tetap dapat diedit dan menyediakan tombol "Simpan Revisi" yang menyimpan perubahan data ke database tanpa mengubah status Closed.
  - Di tabel Underwriting, slip berstatus `Closed` kini memiliki aksi "Edit slip" dan "Closing instruction" ke `/underwriting/closing/edit/[id]`, di samping aksi "Lihat closing instruction" (`/underwriting/closing/[id]`).
- **Navigasi dokumen dan revalidasi cache:**
  - Tombol kembali (back) pada dokumen Closing Instruction (`/underwriting/closing/[id]`) kini mengarah ke form input `/underwriting/closing/edit/[id]`.
  - Fungsi `revalidateUnderwritingPaths` di `app/(app)/underwriting/actions.ts` diperluas untuk merevalidasi `/underwriting/closing/edit/${id}`.
- **Penamaan heading lampiran klausula dokumen:**
  - Mengubah penamaan judul lampiran klausula di dokumen cetak (`components/documents/doc-blocks.tsx`) dari `CLAUSE WORDING` menjadi `CLAUSE WORDINGS`.

## File utama

- `app/(app)/underwriting/closing/edit/[id]/page.tsx`: Halaman Server Component untuk form input Closing Instruction.
- `components/underwriting/closing-draft-form.tsx`: Client Component wrapper `ClosingDraftForm` yang menggunakan `PlacingSlipForm` dalam mode `"closing"`.
- `components/underwriting/placing-slip-form.tsx`: Penambahan mode `"closing"`, banner revisi Closed, logika "Simpan Revisi", dan navigasi ke rute closing.
- `components/underwriting/slip-table.tsx`: Penambahan aksi menu "Closing instruction" dan pembukaan akses edit untuk slip Closed.
- `components/documents/slip-documents.tsx`: Penyesuaian `backHref` dokumen Closing Instruction ke form input closing.
- `components/documents/doc-blocks.tsx`: Perubahan section heading lampiran klausula menjadi `CLAUSE WORDINGS`.
- `lib/server/placing-slips.ts`: Relaksasi validasi status pada `updatePlacingSlip` agar slip Closed dapat dimutasi/direvisi.
- `lib/server/slip-files.ts`: Relaksasi validasi status pada `editableSlip` agar lampiran slip Closed dapat dikelola saat revisi.
- `app/(app)/underwriting/actions.ts`: Penambahan revalidasi path `/underwriting/closing/edit/${id}`.
- `tests/closing-instruction.test.ts`: Pengujian unit untuk penomoran dokumen CI, relaksasi status Closed, dan revalidasi rute.
- `tests/documents.test.ts`: Pengujian unit penamaan heading lampiran `CLAUSE WORDINGS`.

## Dampak

- **Database:** tidak ada (skema tetap sama, field `closingInstruction` sudah ada di tabel `placing_slips`).
- **Env:** tidak ada.
- **Deploy:** tidak ada.

## Verifikasi

- **Pengujian Unit:** `npx tsx --test tests/*.test.ts` (122 test lulus, termasuk 4 test baru untuk alur closing instruction).
- **Typecheck:** `npx tsc --noEmit` lolos tanpa error.
- **Build Produksi:** `npm run build` sukses.
- **Pengujian E2E Browser:**
  - Alur Placing -> Quotation -> Lanjut ke Closing Instruction berhasil memuat form di `/underwriting/closing/edit/[id]`.
  - Isian Closing Instruction dapat diubah dan disimpan dengan tombol "Simpan Perubahan".
  - Tombol "Dokumen Closing" membuka preview dokumen di `/underwriting/closing/[id]` dan tombol kembali kembali ke `/underwriting/closing/edit/[id]`.
  - Penerbitan Closing Instruction berhasil mengubah status menjadi `Closed`.
  - Pada status `Closed`, form tetap dapat diedit dan disimpan dengan tombol "Simpan Revisi" serta status tetap `Closed`.

## Catatan untuk yang melanjutkan

- Slip `Closed` tidak lagi dianggap read-only permanen agar operasional broker asuransi dapat mengakomodasi revisi minor (misalnya perbaikan redaksi klausula, deduktibel, atau instruksi penutupan). Hanya status `Cancelled` yang sepenuhnya terkunci dari segala bentuk perubahan.
