# Premi flat per objek

- **Tanggal:** 2026-11-06
- **Branch:** `feat/premi-flat-objek` (di atas `feat/detail-tambahan-slip`)
- **PR:** [#139](https://github.com/agussusanto17/lch-ins/pull/139)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini fitur kedua Tahap 1 dari analisa 26 contoh slip LCH (6 November 2026).
Lima contoh memakai premi flat, yaitu premi yang ditentukan langsung tanpa
rate: CGL Orela, PL Habco, PL Infiniti, PI LCH, dan Machinery Breakdown Habco.

Contohnya, PL Habco mencetak "Premium: Flat IDR 10.000.000" untuk limit IDR
10 M. Sebelumnya premi COB lain selalu nilai objek × rate, dan release
mewajibkan rate. Premi flat harus diakali dengan rate = premi ÷ limit. Cara
ini mencetak rate yang tidak ada di slip, dan untuk angka sembarang bisa
meleset beberapa rupiah karena rate dibulatkan 6 desimal.

## Yang berubah

- **Form:** tabel rate per objek di COB selain Property dan Motor Vehicle
  punya kolom "Flat".
  - Objek yang dicentang mengisi premi langsung. Premi hasil rate menjadi
    isian awal, dan rate dikosongkan.
  - Hilangkan centang untuk kembali ke rate.
  - "Rate semua objek" tidak mengubah objek berpremi flat.
- **Hitung:** premi flat dipakai apa adanya dan ikut Total Premium. Diskon,
  admin cost, stamp duty, dan brokerage tetap dihitung dari Total Premium.
  Motor Vehicle dan Property tidak bisa memakai premi flat, karena dicek
  terhadap tarif OJK.
- **Release:** cukup ada satu rate atau satu premi flat. Pesannya menjadi
  "Isi minimal satu rate atau premi flat." untuk COB yang boleh flat. Form
  dan pengecekan ulang di server kini memakai satu fungsi yang sama.
- **Dokumen** (keempat dokumen slip): kolom Rate baris premi flat dicetak
  "Flat", baik di tabel premi slip satu objek maupun di jadwal premi per objek.

## File utama

- `prisma/schema.prisma` dan migrasi `20261106030000_premi_flat_objek`:
  kolom `slip_rate_lines.is_flat_premium`.
- `lib/slip-items.ts`: `allowsFlatPremium`, `isFlatLine`, `missingRateIssue`.
- `lib/calc.ts`: premi flat di `recalcSlip`.
- `components/underwriting/slip-item-rates.tsx`: kolom Flat dan isian premi.
- `components/underwriting/slip-model.ts`, `lib/server/tariffs.ts`: aturan
  release.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: simpan
  dan baca.
- `components/documents/doc-blocks.tsx`: cetakan "Flat".
- `tests/calc.test.ts`: dua tes baru.

## Dampak

- **Database:** migrasi menambah satu kolom boolean (default false). Jalan
  otomatis saat build di Vercel dan VPS. Baris rate lama tetap dihitung dari
  rate, jadi tidak ada angka premi yang berubah.
- **Polis, Debit Note, dan laporan:** tidak perlu diubah, karena memakai premi
  per baris yang tersimpan.
- **Env:** tidak ada.
- **Deploy:** merge #138 dulu, lalu PR ini. Setelah itu sinkronkan fork.

## Verifikasi

- **Script uji ke fungsi server** (sudah dihapus): slip Liability dengan premi
  flat IDR 10 jt tersimpan dan terbaca dengan rate kosong. Total premi dari
  database 10.000.000, dan release tidak lagi meminta rate.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - Mencentang Flat lalu mengisi 10.000.000 memberi Total Premium 10.000.000
    dan Total Payable 10.050.000.
  - Menghilangkan centang mengembalikan isian rate dengan premi 0.
  - Closing Instruction mencetak "Public Liability Insurance | Flat | IDR
    10.000.000,00", Admin Cost 50.000, dan Total Payable 10.050.000. Angka
    ini sama dengan CI PL Habco.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (53 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- **Label "Total Sum Insured":** COB Liability masih mencetak nilai limit
  dengan label itu. Judul "Limit of Liability" masuk fitur Tahap 1 berikutnya
  (limit yang tidak menambah TSI).
- **Premi minimum dan deposit premium** belum ada contohnya, jadi belum
  dibuat.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
