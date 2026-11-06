# Daftar peserta PA grup di placing slip

- **Tanggal:** 2026-11-06
- **Branch:** `feat/peserta-pa-grup`
- **PR:** [#160](https://github.com/agussusanto17/lch-ins/pull/160)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Pertanyaan 14 analisa contoh slip LCH. Jawaban Harry (6 November 2026):

> bukan hanya syariah, masih general insurance, ga usah dibatasin usia, kalau
> group buat lampiran list peserta seperti table excel dan data peserta harus
> diinput 1 persatu jadi jika ada klaim dan endorsment bisa tambah dan kurang
> peserta

Contohnya ada dua:

- **Placing Slip PA Salam Pacific:** 1.627 peserta dalam lampiran, dengan
  kolom nama, lokasi kerja, jabatan, level jabatan, tanggal lahir, jenis
  kelamin, usia, dan sum insured. Preminya total UP × 0,08%.
- **CI PA ekspatriat:** satu peserta dengan nomor paspor dan tanggal lahir.

Sebelumnya peserta hanya bisa dicatat sebagai objek Interest Insured, tanpa
data per orang.

Ini PR pertama dari tiga:

1. Peserta di placing slip (PR ini).
2. Peserta ikut ke polis, dan endorsement menambah atau mengurangi peserta.
3. Klaim PA memilih peserta.

## Yang berubah

- **Form placing slip, COB General Accident:** bagian baru **Daftar Peserta**.
  - **Template Excel:**
    - Sheet Peserta berisi kolom Nama*, No. Identitas, Tanggal Lahir, Jenis
      Kelamin, Jabatan, Level Jabatan, Lokasi Kerja, Sum Insured*, dan Ahli
      Waris.
    - Sheet Petunjuk berisi cara mengisi.
  - **Impor dari Excel:**
    - Judul kolom dicari di baris mana pun, dan judul dari lampiran lama ikut
      dikenali, misalnya "Tgl Lahir" atau "Sum Insured (per participant)
      (IDR)".
    - Tanggal lahir dibaca dari format tanggal Excel, DD/MM/YYYY, atau MM/DD
      bila bagian pertama tidak mungkin hari. Contoh LCH mencampur keduanya.
    - Angka dibaca dengan pemisah titik maupun koma.
    - Jenis kelamin L/P dirapikan menjadi Pria/Wanita.
    - File dengan kesalahan tidak diimpor. Kesalahannya ditampilkan per nomor
      baris Excel.
    - Daftar yang sudah ada diganti setelah konfirmasi.
  - **Unduh daftar:** daftar peserta saat ini sebagai file Excel.
  - **Tabel:**
    - Isian per baris, 25/50/100 baris per halaman, dan pencarian nama,
      identitas, jabatan, atau lokasi.
    - Label aksesibel setiap isian memakai judul kolom, misalnya "Lokasi Kerja
      peserta 3".
    - Tombol tambah peserta, hapus per baris, dan hapus semua.
  - **Tidak ada batas usia.**
- **Interest Insured:** terisi otomatis satu baris, misalnya "1.627
  participants as attached", dengan nilai total UP. Rate diisi seperti biasa,
  jadi premi = total UP × rate, sama dengan contoh LCH.
- **Release:** peserta tanpa nama atau tanpa sum insured ditolak dengan nomor
  pesertanya. Pengecekan yang sama dijalankan di server. Draft tetap bisa
  disimpan walaupun ada baris yang belum lengkap.
- **Dokumen** (Placing Slip, Quotation, Cover Note, Closing Instruction):
  lampiran **DAFTAR PESERTA** di halaman baru setelah tanda tangan.
  - Kolom yang kosong di semua baris tidak dicetak.
  - Usia dihitung pada tanggal mulai polis.
  - Baris terakhir berisi total peserta dan total UP.
- **Duplikat slip** ikut menyalin peserta.

## File utama

- `prisma/schema.prisma` dan migrasi `20261106210000_peserta_pa_grup`: tabel
  `slip_participants`.
- `lib/slip-participants.ts` (baru): baca baris Excel, tanggal, angka,
  usia, total, baris Interest Insured, dan cek release.
- `components/underwriting/slip-participants.tsx` (baru): isian Daftar
  Peserta.
- `components/underwriting/placing-slip-form.tsx`: bagian Daftar Peserta dan
  Interest Insured otomatis.
- `components/documents/doc-blocks.tsx` (`ParticipantAppendix`),
  `components/documents/slip-documents.tsx`: lampiran cetak.
- `lib/participant-schema.ts` (baru): validasi peserta, dipakai juga untuk
  endorsement.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`,
  `lib/server/tariffs.ts`: simpan, baca, validasi (maksimal 5.000 peserta),
  duplikat, dan cek release.
- `tests/slip-participants.test.ts`: lima tes baru.

## Dampak

- **Database:** tabel baru `slip_participants`. Jalan otomatis saat build di
  Vercel dan VPS.
- **Daftar slip:** tidak memuat peserta, supaya halaman Placement tetap
  ringan. Form dan dokumen mengambil peserta dari detail slip. Simpan tanpa
  data peserta tidak menghapus peserta yang ada.
- **Slip PA lama:** tidak berubah sampai peserta diisi.
- **Env:** tidak ada.
- **Deploy:** setelah merge, sinkronkan fork.

## Verifikasi

- **Script uji ke fungsi server** (sudah dihapus), dengan 1.627 peserta seperti
  contoh Salam Pacific:
  - Simpan butuh 441 ms dan baca 18 ms. Urutan dan isian tersimpan, dan TSI
    sama dengan total UP.
  - Daftar slip tidak memuat peserta, dan simpan dari data daftar tidak
    menghapus peserta.
  - Daftar peserta bisa diganti, dan peserta ikut terhapus bersama slip.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - **Impor file Excel 60 peserta** yang meniru lampiran contoh, dengan judul
    di baris kedua dan format tanggal campuran:
    - 60 peserta masuk dengan total UP IDR 4.650.000.000.
    - Interest Insured menjadi "60 participants as attached".
    - Tanggal 02/02/1971, 10/22/1986, dan 9/4/1986, serta tanggal Excel, terbaca
      benar.
  - **Pencarian** "Branch Manager" menemukan 6 peserta, dan halaman tabel
    menampilkan "1–25 dari 60 peserta".
  - **Tambah peserta** membuka halaman terakhir. Release menolak dengan "Isi
    nama dan sum insured peserta nomor 61.".
  - **Closing Instruction 30 peserta:**
    - "30 participants as attached IDR 2.325.000.000", lalu premi 0,08% IDR
      1.860.000.
    - Lampiran DAFTAR PESERTA dengan usia 39 dan total.
    - Kolom No. Identitas dan Ahli Waris tidak dicetak karena kosong.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **PR berikutnya: peserta di polis.**
  - Polis dari slip menyalin peserta.
  - Endorsement menambah atau mengurangi peserta dengan tanggal berlaku.
  - Asumsi premi endorsement pro-rata harian.
  - Klaim PA memilih peserta setelah itu.
- **Rate per level jabatan** belum ada. Contoh LCH memakai satu rate untuk
  total UP. Kalau perlu, peserta bisa dikelompokkan per level menjadi beberapa
  baris Interest Insured.
- **Switch "Pakai Section 1 & 2"** juga muncul di slip PA karena berlaku untuk
  semua COB objek (#143). Tidak dipakai untuk PA.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
