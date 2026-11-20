# Batas OJK dihitung ulang saat okupasi, kelas, atau alamat lokasi berubah

- **Tanggal:** 2026-11-18
- **Branch:** `fix/batas-ojk-ganti-okupasi`
- **PR:** #273
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ditemukan 18 November 2026 saat menguji PR #272 (floating sum insured). Masalahnya juga ada di slip Property biasa.

- **Batas tersimpan didahulukan.** Saat simpan, release, dan terbit CI, form mengirim `rateLinesWithBounds(slip)`, jadi batas OJK otomatis ikut tersimpan di `slip_rate_lines.rate_min` dan `rate_max`. Sesudah itu `rateLinesWithBounds` (form) dan `attachSlipRateBounds` (server) memakai batas tersimpan itu dan tidak menghitung ulang.
- **Ganti okupasi tidak mereset batas.** `updateLocationPatch` hanya mengganti data lokasi. Contoh: rate FLEXAS 1,127 pada lokasi 29371 Class I (batas 1,127–1,260). Setelah lokasi diganti 29378 Class II (batas 3,382–3,780), batas lama tetap dipakai, dan rate itu lolos tanpa tanda "butuh alasan".
- **Asal batas (`boundSource`) tidak tersimpan.** Skema zod server action membuangnya, dan tabel tidak punya kolomnya. Setelah slip dimuat ulang, batas dari panel Referensi Tarif OJK tidak bisa dibedakan dari batas otomatis.

## Yang berubah

- **Ganti okupasi atau kelas konstruksi lokasi.** Batas tersimpan FLEXAS dan EQVET lokasi itu dikosongkan, lalu dihitung ulang dari isian baru.
- **Ganti alamat lokasi.** Batas tersimpan EQVET dan FWTWD lokasi itu dikosongkan, karena zona gempa dan wilayah banjir di `getPropertyRateBounds` mengikuti alamat. Batas FLEXAS tetap.
- **Tidak dihitung ulang:** perubahan nama okupasi di dokumen (`occupationLabel`) dan isian yang nilainya sama.
- **Tombol "Samakan okupasi & kelas dengan Lokasi 1"** memakai aturan yang sama. Sebelumnya tombol ini mengganti lokasi tanpa mereset batas.
- **Slip floating.** Rate bersama berlaku di semua lokasi, jadi batasnya dihitung ulang dalam empat keadaan:
  - okupasi, kelas, atau alamat lokasi mana pun berubah, dengan cover sesuai aturan di atas;
  - lokasi dihapus, karena lokasi paling berisiko bisa ikut terhapus;
  - floating dinyalakan atau dimatikan: slip floating memakai batas lokasi paling berisiko, slip biasa memakai batas lokasinya sendiri;
  - rate diisi dari panel Referensi Tarif OJK. Panel hanya mengisi rate dan tidak lagi menyimpan batas lokasi panelnya. Sebelumnya rate dari panel lokasi yang lebih ringan menyimpan batas lokasi itu, sehingga rate di bawah batas lokasi paling berisiko lolos tanpa alasan. Pesan panel sekarang menyebut "Batas OJK mengikuti lokasi paling berisiko."
- **Asal batas tersimpan** di kolom baru `slip_rate_lines.bound_source`. Kolom ini diisi hanya bila baris punya batas. Setelah slip dimuat ulang, tooltip batas di tabel rate dan dialog alasan rate tetap menyebut asalnya.
- **Alasan rate (`rateExceptions`) tidak diubah.**
  - Alasan yang tidak lagi diperlukan terbuang saat simpan, seperti sebelumnya. Hanya baris di luar batas yang disimpan alasannya.
  - Release tetap meminta alasan untuk rate yang di luar batas baru dan belum punya alasan.

## File utama

- `components/underwriting/slip-model.ts`:
  - `locationsPatch` dan `copyFirstOccupationPatch` (baru);
  - `updateLocationPatch` sekarang lewat `locationsPatch`;
  - cabang floating `removeLocationPatch` dan `floatingSumInsuredPatch` ikut mereset batas.
- `components/underwriting/slip-locations.tsx`: tombol Samakan memakai `copyFirstOccupationPatch`.
- `components/underwriting/placing-slip-form.tsx`: `applyOjkRate` untuk slip floating.
- `lib/calc.ts`: `withoutBounds` untuk satu baris, dipakai juga oleh `withoutOjkBounds`.
- `app/(app)/placement/actions.ts`, `lib/server/placing-slips.ts`, `prisma/schema.prisma`: `boundSource` disimpan dan dibaca.
- `prisma/migrations/20261118213000_sumber_batas_rate/migration.sql`.
- `tests/batas-ojk-lokasi.test.ts`.

## Dampak

- **Database:** migrasi `20261118213000_sumber_batas_rate` menambah kolom `slip_rate_lines.bound_source` (text, boleh kosong).
  - Baris lama tetap kosong sampai batasnya dihitung ulang.
  - Tidak ada data lain yang diubah.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 303 lolos, termasuk 11 test baru. Pada kode sebelum perbaikan, 9 test baru gagal. Dua sisanya menjaga hal yang tidak boleh berubah.
- `npx tsc --noEmit` dan `npm run build`: lolos.
- **Browser lokal** (Admin LCH, slip draft baru, dihapus lagi setelah uji):
  1. Lokasi 29371 Class I, rate FLEXAS 1,127, simpan draft: batas 1,127–1,260, `bound_source` "FLEXAS okupasi 29371 K1". Setelah muat ulang, tooltip batas tetap menyebut asalnya.
  2. Okupasi diganti 29378, kelas Class II: batas menjadi 3,382–3,780 ("FLEXAS okupasi 29378 K2"), muncul "Di bawah batas OJK · alasan wajib diisi" dan "1 rate butuh alasan". Hasilnya sama setelah simpan dan muat ulang.
  3. Tambah lokasi 2 (29371 Class I), lalu nyalakan floating: batas rate bersama 3,382–3,780 ("…, lokasi 1").
  4. Isi rate dari panel lokasi 2, "Bawah 1,127": batas tetap 3,382–3,780 dan rate butuh alasan.
  5. Isi database setelah simpan: `rate_min` 3,382, `rate_max` 3,78, `bound_source` "FLEXAS okupasi 29378 K2, lokasi 1".

## Catatan untuk yang melanjutkan

- **Batas tersimpan tetap didahulukan**, sesuai komentar skema: batas yang berlaku saat rate diisi. Akibatnya setiap jalur yang mengubah okupasi, kelas, atau alamat lokasi harus lewat `locationsPatch` atau `updateLocationPatch`.
  - Contoh: upload lokasi Excel (MoM poin 6) yang menambah lokasi ke slip floating. Lokasi baru bisa menjadi lokasi paling berisiko.
- **Slip lama dengan batas basi**, yaitu okupasinya diganti sebelum perbaikan ini, tidak berubah sendiri.
  - Batasnya dihitung ulang begitu okupasi, kelas, atau alamat lokasinya diganti.
  - Memilih okupasi yang sama tidak dihitung sebagai perubahan. Kosongkan dulu dengan tombol ×, lalu pilih lagi.
- **Alasan rate lama tetap terhitung** bila rate tetap di luar batas baru, misalnya alasan potongan yang ditulis untuk batas okupasi lama. Ini sesuai keputusan untuk membiarkan alasan rate.
- **Form hanya menghitung batas FLEXAS otomatis.** Batas EQVET dan FWTWD otomatis dihitung server saat release (`getPropertyRateBounds`). Ini perilaku lama.
- **Motor Vehicle punya pola yang sama**: batas casco tersimpan tidak dihitung ulang saat merek, deskripsi, TSI, atau plat kendaraan diganti. Belum diubah di PR ini.
- **graphify** belum terpasang di mesin ini, jadi aturan Wajib nomor 4 belum dijalankan, sama seperti PR #272.
