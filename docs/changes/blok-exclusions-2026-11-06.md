# Blok Exclusions setelah Clauses

- **Tanggal:** 2026-11-06
- **Branch:** `feat/blok-exclusions` (di atas `feat/periode-label-satu-tanggal`)
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini fitur Tahap 1 nomor 9 dari analisa 26 contoh slip LCH (6 November 2026).
Dua contoh mencetak daftar exclusion tersendiri:

- **03 CGL Orela:** "Exclusion" a) sampai m), lalu kalimat penutup "And other
  exclusion as may be agreed by the company".
- **15 PL Infiniti:** "Exclusion" 1) sampai 7).

Sistem belum punya tempat untuk daftar ini. Selama ini exclusion masuk Special
Conditions dan tercetak di bawah label itu.

## Yang berubah

- **Form placing slip:** isian "Exclusions" di akhir bagian Deductible &
  Clauses, untuk semua COB. Satu exclusion per baris, dan nomornya diketik
  sendiri, misalnya a) atau 1).
- **Dokumen** (keempat dokumen slip): blok EXCLUSIONS dicetak setelah
  CLAUSES.
  - Nomor seperti a), 1), 1., (iv), atau - dipisah dari teksnya, jadi baris
    yang terlipat rata dengan teks.
  - Baris tanpa nomor, seperti kalimat penutup, dicetak apa adanya.
  - Blok tidak dicetak bila isiannya kosong.
- **Audit trail:** label "Exclusions".

## File utama

- `prisma/schema.prisma` dan migrasi `20261106080000_exclusions_slip`: kolom
  `placing_slips.exclusions`.
- `components/underwriting/slip-model.ts`: `exclusionItems`, yang memecah teks
  menjadi baris dan nomor.
- `components/documents/doc-blocks.tsx` (`ExclusionsBlock`) dan
  `components/documents/slip-documents.tsx`: cetakan.
- `components/underwriting/placing-slip-form.tsx`: isian.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: simpan,
  baca, validasi (maksimal 4000 karakter), dan duplikat.
- `tests/calc.test.ts`: satu tes baru.

## Dampak

- **Database:** migrasi menambah satu kolom teks. Jalan otomatis saat build di
  Vercel dan VPS.
- **Slip lama:** tidak berubah. Exclusion yang dulu ditulis di Special
  Conditions tetap di sana sampai dipindahkan manual.
- **Env:** tidak ada.
- **Deploy:** merge #143, #144, dan #145 dulu, lalu PR ini. Setelah itu
  sinkronkan fork.

## Verifikasi

- **Script uji ke fungsi server** (sudah dihapus): exclusions tersimpan dan
  terbaca kembali tanpa spasi di awal dan akhir.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - **Closing Instruction CGL:**
    - EXCLUSIONS tercetak a), b), c), dan m).
    - Baris b) yang panjang terlipat rata dengan teksnya.
    - Kalimat penutup tercetak tanpa nomor.
  - **Form:** isian Exclusions berada di akhir bagian Deductible & Clauses,
    dengan petunjuk penomoran.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **Tempat exclusion masih ditanyakan ke Harry** (pertanyaan 3): PL Habco
  menaruhnya di Subjectivity, PI LCH di Clauses. Isian ini tidak mengubah
  keduanya. Kalau Harry memilih satu tempat, cukup pakai isian yang sesuai.
- **Klausul exclusion dari Master Data**, seperti Nuclear Energy Risk
  Exclusion NMA 1994, tetap dipilih sebagai klausul. Isian ini untuk daftar
  pendek yang bukan klausul.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
