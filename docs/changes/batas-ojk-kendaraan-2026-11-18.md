# Batas OJK kendaraan dihitung ulang saat data kendaraan, domisili, atau type of cover berubah

- **Tanggal:** 2026-11-18
- **Branch:** `fix/batas-ojk-motor`
- **PR:** #276, stacked di atas #273. Merge setelah #273.
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Lanjutan #273 (`batas-ojk-ganti-okupasi-2026-11-18.md`), yang memperbaiki pola ini untuk lokasi Property. Slip Motor Vehicle punya masalah yang sama.

- **Batas tersimpan didahulukan.** Saat simpan, release, dan terbit CI, form mengirim `rateLinesWithBounds(slip)`, jadi batas casco dan perluasan otomatis ikut tersimpan di `slip_rate_lines`. Sesudah itu `rateLinesWithBounds` (form) dan `attachSlipRateBounds` (server) memakai batas tersimpan itu dan tidak menghitung ulang.
- **Ganti data kendaraan tidak mereset batas.** `vehicleTariff` menghitung kategori, wilayah, dan batas per kendaraan dari merek, tipe, uraian, TSI, dan nomor polisi kendaraan, domisili slip, serta type of cover.
  - Contoh: kendaraan plat B, TSI 150 juta, rate casco 2,5, disimpan. Batasnya Kategori 2 Wilayah 2, 2,47–2,72.
  - Setelah plat diganti BK, batas Wilayah 1 seharusnya 2,67–2,94. Batas lama tetap dipakai, dan rate 2,5 lolos tanpa tanda "butuh alasan".

## Yang berubah

- **Batas OJK tersimpan dikosongkan bila batas otomatisnya berubah**, lalu dihitung ulang dari isian baru. Yang diperiksa baris casco dan perluasan, saat:
  - merek, tipe, uraian, TSI, atau nomor polisi kendaraan diganti: baris kendaraan itu;
  - Domisili Kendaraan diganti: baris semua kendaraan;
  - type of cover diganti, atau coverage bila type of cover kosong: baris semua kendaraan.
- **Yang dibandingkan batas otomatisnya, bukan isiannya.** Uraian kendaraan disusun ulang dari model, tahun, plat, nomor rangka, nomor mesin, dan warna. Kalau yang dibandingkan isiannya, mengetik nomor rangka saja sudah membuang pilihan panel. Batas tidak dikosongkan saat:
  - nomor rangka, nomor mesin, atau warna diisi;
  - plat diganti ke plat lain di wilayah yang sama, atau domisili slip sudah terisi (wilayah ikut domisili);
  - TSI berubah tetapi masih di kategori yang sama.
- **Pilihan panel Referensi Tarif OJK tetap tersimpan** sampai kategori, wilayah, atau type of cover kendaraannya berubah. Pilihan panel (`applyOjkRate`) tidak lewat `set`, jadi tidak ikut diperiksa.
- **Perluasan mengikuti tarifnya.** Banjir dan gempa bergantung wilayah, jadi ikut berubah saat plat B diganti BK. SRCC dan terorisme tidak, jadi tetap, kecuali type of cover diganti TLO.
- **Pemeriksaan dipasang di `set` form.** Interest Insured, Domisili Kendaraan, Type of Cover, dan Coverage semuanya mengubah slip lewat `set`, jadi tidak ada bagian form yang perlu diubah satu per satu.
- **Slip lama tanpa kendaraan:** baris rate tanpa kendaraan ikut kendaraan pertama saat kendaraan ditambah. Batas tersimpannya dihitung dari domisili slip saja, jadi ikut dihitung ulang.
- **TPL dan PA tidak diubah.** Batasnya hanya dari label baris (`findMotorExtensionBounds(label)` dan `findMotorPaBounds(label)`), tidak dari kendaraan, domisili, atau type of cover. Form juga tidak pernah mengisi batas TPL dan PA.
- **Alasan rate (`rateExceptions`) tidak diubah**, sama seperti #273. Release tetap meminta alasan untuk rate yang di luar batas baru.

## File utama

- `components/underwriting/slip-model.ts`: `vehicleBoundsPatch` (baru).
- `components/underwriting/placing-slip-form.tsx`: `set` memakai `vehicleBoundsPatch`.
- `tests/batas-ojk-kendaraan.test.ts`.

## Dampak

- **Database:** tidak ada. Kolom `slip_rate_lines.bound_source` sudah ditambah di #273.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. PR ini di atas #273, jadi merge setelah #273.

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 315 lolos, termasuk 12 test baru.
  - Pada kode sebelum perbaikan, 11 test baru gagal.
  - Satu sisanya menjaga isian yang sama dan COB lain supaya tidak mengubah batas.
- `npx tsc --noEmit` dan `npm run build`: lolos.
- **Browser lokal** (port 3004, Admin LCH, slip draft baru, dihapus lagi setelah uji):
  1. Motor Vehicle, PSKBI, kendaraan plat B 1234 KJT tanpa domisili, TSI 150 juta, rate casco 2,5 dan banjir 0,11, simpan draft. Tersimpan casco 2,47–2,72 "Kategori 2 Wilayah 2 Comprehensive" dan banjir 0,1–0,125 Wilayah 2.
  2. Muat ulang, plat diganti BK 1234 KJT. Kartu kendaraan menjadi Wilayah 1 dan menampilkan "2 rate butuh alasan":
     - casco 2,670–2,940, "Di bawah batas OJK · alasan wajib diisi";
     - banjir 0,075–0,100, "Di atas batas OJK".
  3. Simpan lagi dan muat ulang: hasilnya sama. Di database casco 2,67–2,94 "Kategori 2 Wilayah 1 Comprehensive", banjir 0,075–0,1 Wilayah 1, SRCC tetap.
  4. Setelah uji, slip, audit log, dan sesi uji dihapus per id. `number_counters` dan jumlah baris 65 tabel sama dengan sebelum uji.

## Catatan untuk yang melanjutkan

- **Batas tersimpan tetap didahulukan**, seperti #273. Jalur baru yang mengubah data kendaraan di luar `set` form, misalnya upload kendaraan Excel di server, perlu lewat `vehicleBoundsPatch` atau mengosongkan batasnya sendiri.
- **Slip lama dengan batas basi**, yaitu data kendaraannya diganti sebelum perbaikan ini, tidak berubah sendiri. Batasnya dihitung ulang begitu kategori, wilayah, atau type of cover kendaraannya berubah lagi.
- **Kemungkinan temuan, belum diubah:** batas TPL dari label selalu 0,25–1,00%.
  - Tabel OJK TJH pihak ketiga untuk kendaraan niaga, truk, dan bus 0,375–1,5% per lapisan limit.
  - Akibatnya rate TPL truk 1,5% ditandai di atas batas saat release.
  - Perlu konfirmasi Harry dulu sebelum diubah.
- **graphify** belum terpasang di mesin ini, jadi aturan Wajib nomor 4 belum dijalankan, sama seperti #272 dan #273.
