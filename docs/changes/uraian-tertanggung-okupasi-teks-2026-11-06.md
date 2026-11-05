# Uraian tertanggung dan okupasi teks bebas

- **Tanggal:** 2026-11-06
- **Branch:** `feat/uraian-tertanggung-okupasi-teks` (di atas
  `feat/limit-di-luar-tsi`)
- **PR:** [#142](https://github.com/agussusanto17/lch-ins/pull/142)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dua fitur Tahap 1 dari analisa 26 contoh slip LCH (6 November 2026).

1. **Uraian tertanggung (nomor 7).** Contoh LCH sering menulis tertanggung
   lebih dari satu baris. CGL Orela memuat daftar pihak a), b), c), dan CI
   marine hull menulis ASSURED panjang. Insured Name di sistem hanya satu
   baris dan dicetak kapital semua, jadi uraian seperti itu tidak muat.
2. **Okupasi teks bebas (nomor 8).** Liability, Miscellaneous, dan
   kontainer mencetak okupasi seperti "Office", "Shipyard", atau "Insurance
   Broker". Sistem hanya menerima okupasi dari daftar OJK, yang merupakan
   tabel tarif Property, dan kodenya ikut tercetak.

## Yang berubah

- **Uraian tertanggung di dokumen:** isian baru di bawah Nama Tertanggung,
  untuk semua COB.
  - Dicetak di bawah Insured Name dengan huruf apa adanya.
  - Nama tetap dicetak kapital seperti sebelumnya.
  - Ikut tersalin saat slip diduplikat.
- **Okupasi COB selain Property:** "Nama okupasi di slip" bisa diketik
  langsung tanpa memilih okupasi OJK, dan dicetak apa adanya tanpa kode. Kalau
  okupasi OJK dipilih, cetakannya tetap "kode - nama" seperti sebelumnya.
  Property tidak berubah, karena tarifnya bergantung pada okupasi OJK.
- **Audit trail:** label "Uraian tertanggung".

## File utama

- `prisma/schema.prisma` dan migrasi `20261106050000_uraian_tertanggung`:
  kolom `placing_slips.insured_description`.
- `components/underwriting/insured-picker.tsx`: isian uraian.
- `components/underwriting/placing-slip-form.tsx`: okupasi tanpa OJK.
- `components/underwriting/slip-model.ts` (`slipOccupationText`) dan
  `components/documents/doc-blocks.tsx`: cetakan.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: simpan,
  baca, validasi, dan duplikat.
- `tests/calc.test.ts`: satu tes baru.

## Dampak

- **Database:** migrasi menambah satu kolom teks. Jalan otomatis saat build
  di Vercel dan VPS.
- **Dokumen slip lama:** tidak berubah. Uraian tertanggung masih kosong, dan
  okupasi yang sudah ada tetap berkode.
- **Env:** tidak ada.
- **Deploy:** merge #138, #139, dan #141 dulu, lalu PR ini. Setelah itu
  sinkronkan fork.

## Verifikasi

- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - Closing Instruction CGL mencetak "PT ORELA SHIPYARD", lalu uraian a), b),
    c) per baris dengan huruf asli. Occupation tercetak "Shipyard" tanpa
    kode.
  - Di form slip Liability baru, isian "Uraian tertanggung di dokumen" berada
    di antara Insured Name dan Correspondence Address.
  - Isian okupasi bisa diketik tanpa memilih OJK, dengan petunjuk "Ketik
    okupasi, misalnya Office".
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (56 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- CI Liability Infiniti memakai dua okupasi: Business Occupation dan Risk
  Occupation. Okupasi kedua bisa diisi lewat Detail tambahan
  ([#138](https://github.com/agussusanto17/lch-ins/pull/138)).
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
