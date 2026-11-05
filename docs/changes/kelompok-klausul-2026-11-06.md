# Kelompok klausul berjudul dan urutan klausul

- **Tanggal:** 2026-11-06
- **Branch:** `feat/kelompok-klausul` (di atas `feat/blok-exclusions`)
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini bagian pertama fitur Tahap 1 nomor 3 dari analisa 26 contoh slip LCH (6
November 2026). Beberapa contoh mengelompokkan klausulnya dengan judul, dan
nomornya mulai dari 1 di tiap kelompok:

- **13 CI Cendanawati (Moveable All Risk):** EXTENSIONS 1) sampai 7), lalu
  GENERAL CONDITIONS 1) sampai 22).
- **14 QS Habco Primatama (Equipment All Risks):** EXTENSIONS dan GENERAL
  CONDITIONS.
- **03 CI CGL Orela:** "Major Condition and Extension" dan "Compulsory
  Clauses".

Di sistem, slip tanpa section hanya punya satu daftar klausul tanpa judul.
Urutan cetaknya juga mengikuti urutan klik dan tidak bisa diubah. Padahal
contoh 24 dan 25 memakai klausul yang sama dengan urutan berbeda di 12 posisi.

Paket klausul bawaan per type of cover, bagian kedua fitur nomor 3, menyusul
di PR terpisah.

## Yang berubah

- **Form placing slip, slip tanpa section** (COB selain Property, dan slip
  CAR/EAR yang section-nya mati):
  - Daftar klausula terpilih tampil per kelompok. Tiap kelompok punya isian
    judul dengan saran: Main Conditions, Extensions, General Conditions,
    Compulsory Clauses, Warranties, dan Special Conditions.
  - Judul disimpan saat keluar dari isian atau Enter. Judul yang sama dengan
    kelompok lain menggabungkan keduanya.
  - Tiap klausula punya pilihan kelompok: Tanpa judul, kelompok yang ada, atau
    Kelompok baru. Klausula yang dipindah masuk di akhir kelompok tujuan.
  - Klausula yang baru dipilih masuk kelompok klausula terakhir, jadi daftar
    bisa diisi kelompok demi kelompok.
  - Kelompok bisa dinaikkan atau diturunkan beserta klausulanya.
- **Urutan klausula, semua slip:** tiap klausula terpilih punya tombol naik
  dan turun, dan nomor urutnya tampil seperti di dokumen. Ini berlaku juga
  untuk tiap kelompok slip Property dan slip ber-section.
- **Dokumen** (CLAUSES dan lampiran CLAUSE WORDING): klausula dicetak per
  kelompok dengan judulnya, dan nomornya mulai dari 1 di tiap kelompok.
  Klausula tanpa judul tercetak seperti sebelumnya.
- **Audit trail:** label "Kelompok klausul".

## File utama

- `lib/clause-groups.ts` (baru): kelompok, urutan, pindah kelompok, ganti
  judul, dan pembersihan judul.
- `prisma/schema.prisma` dan migrasi `20261106090000_kelompok_klausul`: kolom
  `slip_clauses.group_title`.
- `components/underwriting/clause-picker.tsx`: daftar terpilih per kelompok,
  dengan tombol naik dan turun.
- `components/underwriting/placing-slip-form.tsx`: kelompok untuk daftar
  utama slip tanpa section.
- `components/documents/doc-blocks.tsx`: cetakan per kelompok.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: simpan,
  baca, validasi (judul maksimal 200 karakter), dan duplikat.
- `tests/clause-groups.test.ts`: lima tes baru.

## Dampak

- **Database:** migrasi menambah satu kolom teks. Jalan otomatis saat build di
  Vercel dan VPS.
- **Slip lama:** tidak berubah. Klausulnya satu kelompok tanpa judul dengan
  urutan yang sama.
- **Slip ber-section dan Property:** kelompok tetap per section. Judul
  kelompok tidak disimpan untuk slip ini.
- **Env:** tidak ada.
- **Deploy:** merge #143 sampai #146 dulu, lalu PR ini. Setelah itu
  sinkronkan fork.

## Verifikasi

- **Script uji ke fungsi server** (sudah dihapus):
  - Empat klausul Miscellaneous dikirim berselang-seling. Hasilnya tersimpan
    dengan kelompok berdampingan (Extensions, General Conditions, tanpa
    judul), dan judulnya dirapikan.
  - Urutan manual dan kelompok kosong juga tersimpan.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - **Closing Instruction:** CLAUSES mencetak EXTENSIONS 1 sampai 3, lalu
    GENERAL CONDITIONS 1 sampai 2.
  - **Form slip Cash In Safe:**
    - Judul kelompok tanpa judul diganti General Conditions.
    - Asbestos Exclusion Clause dipindah ke General Conditions, dan masuk di
      akhir kelompok itu.
    - General Conditions dinaikkan di atas Extensions.
    - Satu klausula dinaikkan di dalam kelompoknya.
    - Klausula yang baru dipilih masuk Extensions, kelompok terakhir.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **Paket klausul bawaan per type of cover** menyusul. Rencananya, klausul
  master diberi tanda paket, kelompok bawaan, dan urutan, lalu satu tombol di
  form memasang semuanya.
- **Judul kelompok di slip ber-section** belum bisa diisi. Marine Hull Patria
  (Tahap 3) butuh Section A, B, C, dan General. Kolom `group_title` sudah per
  baris klausul, jadi bisa diperluas ke kelompok section.
- **MAIN CONDITIONS di contoh 13** berupa teks, bukan klausul master. Isinya
  bisa masuk Coverage atau Special Conditions.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
