# Simpan draft quotation dan penerbitan closing ke database

- **Tanggal:** 2026-11-03
- **Branch:** `fix/simpan-draft-quotation`
- **PR:** (menunggu nomor PR)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Form Draft Quotation Slip (`/underwriting/quotation/edit/[id]`) sebelumnya hanya menyimpan perubahan ke store in-memory browser (`store.upsert("slips", record)`), tanpa memanggil server action `savePlacingSlipAction`.

Akibatnya:
- Nilai field Subjectivity, Security Panel (co-insurance), Closing Instruction, dan Cover Note Remarks hilang setiap kali halaman di-refresh, dibuka di tab baru, atau diakses oleh pengguna lain.
- Perubahan status dari `Released` ke `Quoted` (saat panel lengkap) dan dari `Quoted`/`Released` ke `Closed` (saat tombol Terbitkan Closing Instruction ditekan) tidak tersimpan di database.
- Tampilan cetak Quotation Slip, Cover Note, dan Closing Instruction yang memuat data dari database via server component menerima data lama.

## Yang berubah

- `components/underwriting/quotation-draft-form.tsx`:
  - Mengganti fungsi simpan lokal dengan pemanggilan asinkron `savePlacingSlipAction(record, "edit")`.
  - State lokal `slip` dan store diperbarui dengan data kembalian server setelah berhasil disimpan.
  - Menambahkan feedback status `isPending` pada tombol Simpan ("Menyimpan…"), Terbitkan Closing ("Menerbitkan…"), serta menonaktifkan tombol aksi dokumen saat proses simpan berlangsung agar tidak terjadi duplikasi request atau navigasi prematur.
  - Tombol cetak dokumen (Quotation Slip, Draft Cover Note, Draft Closing Instruction) otomatis menyimpan perubahan ke database sebelum berpindah ke halaman cetak.
  - Tombol Terbitkan Closing Instruction di modal konfirmasi menutup modal dan berpindah halaman hanya setelah status `Closed` berhasil ditulis ke database.
- `app/(app)/underwriting/actions.ts`:
  - Menambahkan revalidasi path cetak (`/underwriting/quotation/[id]`, `/underwriting/cover-note/[id]`, `/underwriting/closing/[id]`) pada helper `revalidateUnderwritingPaths` agar cache Next.js untuk halaman cetak selalu segar setelah perubahan disimpan.

## File utama

- `components/underwriting/quotation-draft-form.tsx`: integrasi `savePlacingSlipAction`, penanganan loading transition, dan propagasi data server.
- `app/(app)/underwriting/actions.ts`: penambahan revalidasi path dokumen cetak.

## Dampak

- **Database:** tidak ada perubahan skema (kolom `subjectivity`, `closingInstruction`, `coverNoteRemarks`, `status`, dan relasi `slip_security_panel` sudah ada di schema Prisma).
- **Env:** tidak ada penambahan variabel lingkungan.
- **Deploy:** standar.

## Verifikasi

- `npx tsc --noEmit` lolos tanpa error.
- `npx eslint` lolos tanpa error pada file yang diubah.
- `npm run build` lolos.

## Catatan untuk yang melanjutkan

- Tugas berikutnya (tugas 2) adalah menambahkan menu input lengkap Placing Slip ke halaman draft quotation serta Subjectivity dan Security. Karena `savePlacingSlipAction` sudah terhubung dan menangani update seluruh field placing slip, integrasi komponen input Placing Slip nantinya dapat langsung memanfaatkan alur simpan database ini.
