# Deductible Personal Accident dan Third Party Liability di slip Motor Vehicle

- **Tanggal:** 2026-11-04
- **Branch:** `feat/deductible-pa-tpl-motor`
- **PR:** [#113](https://github.com/agussusanto17/lch-ins/pull/113)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

"Deductible per cover" di placing slip hanya berisi cover dari daftar rate.
Slip Motor Vehicle juga punya Personal Accident dan Third Party Liability di
tabel tersendiri, yang sejak 29 Oktober 2026 tidak ikut punya deductible.
Diminta: di sisi kiri ada tombol tambah dengan dropdown, dan khusus MV bisa
menambah deductible Personal Accident dan Third Party Liability di bawah
Terrorism & Sabotage (Request & Temuan REQ-028, 4 November 2026). Lanjutan
dari [deductible-maks-5-per-cover-2026-11-04.md](deductible-maks-5-per-cover-2026-11-04.md).

## Yang berubah

- **Form placing slip MV** (juga Draft Quotation): di bawah daftar cover ada
  tombol "Tambah cover" dengan dropdown Personal Accident dan Third Party
  Liability. Cover yang dipilih muncul tepat di bawah Terrorism & Sabotage
  (PA lalu TPL; tanpa Terrorism & Sabotage, di paling bawah), dengan isian
  deductible yang sama: Pilih dari master data dan sampai lima isian. Tombol
  hapus di samping nama cover mengosongkan dan menyembunyikan barisnya lagi.
  Dropdown hanya berisi cover yang belum ditambah, dan TPL tidak ditawarkan
  kalau tabel TPL kosong.
- **Penyimpanan:** deductible PA dan TPL disimpan di kolom `deductibles` baris
  pertama tabel PA dan TPL (`slip_rate_lines` jenis pa dan tpl). Kolomnya
  sudah ada sejak #110, jadi tidak ada migrasi. Kalau baris TPL pertama
  dihapus, deductible-nya pindah ke baris yang menjadi pertama.
- **Dokumen** (keempatnya): deductible PA dan TPL dicetak di urutan yang sama
  dengan form, setelah deductible Terrorism & Sabotage.
- **COB lain:** tidak berubah. Tombol Tambah cover hanya muncul kalau ada
  cover yang bisa ditambah, saat ini hanya PA dan TPL di MV.

## File utama

- `components/underwriting/slip-model.ts`: `deductibleRows` (urutan baris form
  dan dokumen), `extraDeductibleCovers`, dan `keepGroupDeductibles`.
- `components/underwriting/deductible-input.tsx`: komponen
  `DeductiblePerCover`.
- `components/underwriting/placing-slip-form.tsx`: pemakaian di form dan
  penjagaan deductible saat baris TPL atau PA berubah.
- `components/documents/doc-blocks.tsx`: urutan cetak deductible.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Browser lokal, halaman uji sementara (dihapus sebelum commit) dengan slip MV
  dari data contoh: Tambah cover membuka dropdown berisi Personal Accident dan
  Third Party Liability; PA dan TPL muncul tepat di bawah Terrorism &
  Sabotage; isian PA diketik dan TPL diisi lewat Pilih tersimpan di baris
  pertama tabelnya; setelah keduanya ditambah tombol Tambah cover hilang;
  tombol hapus PA mengosongkan dan menyembunyikan barisnya, dan PA kembali ada
  di dropdown.
- Database lokal: slip MV dengan deductible PA dan TPL tersimpan dan dimuat
  ulang dengan baris PA dan TPL tampil lagi. Slip uji dihapus.
- Urutan dokumen: deductible Terrorism & Sabotage, PA, TPL, lalu Authorized
  Workshop. Menghapus baris TPL pertama memindahkan deductible-nya.
- Form: Tambah cover tampil kalau PA dan TPL belum ada, hilang kalau keduanya
  sudah ada, dan tidak ada di slip Property.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Cover yang bisa ditambah ada di `MOTOR_EXTRA_COVERS` di `slip-model.ts`.
  Kalau nanti COB lain butuh hal serupa, daftarnya bisa dipindah ke master
  data.
- Baris PA dan TPL yang ditambah tapi dibiarkan kosong hilang setelah slip
  disimpan, karena isian kosong tidak disimpan.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
