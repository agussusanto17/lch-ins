# Upload daftar kendaraan Motor Vehicle dari Excel

- **Tanggal:** 2026-11-19
- **Branch:** `feat/upload-kendaraan-excel`
- **PR:** #282
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1, poin 20 (permintaan Team LCH, 19 November 2026): daftar kendaraan di placing slip Motor Vehicle bisa di-upload dari Excel, seperti upload lokasi Property di poin 6.
- Sebelumnya kendaraan diisi satu per satu di form. Setiap kendaraan punya merek dan tipe dari Master Data, data kendaraan, TSI, rate casco dan perluasan, dua baris TPL, PA Driver dan Passenger, serta deductible.

## Yang berubah

- **Tombol Upload Excel** di bagian Interest Insured slip Motor Vehicle, di bawah Tambah kendaraan, membuka drawer Upload Kendaraan dari Excel:
  - tombol **Template Excel** untuk mengunduh template yang mengikuti cover slip dan Master Data;
  - pilih file, lalu isinya dicek per baris dengan ringkasan dibaca, siap ditambahkan, gagal, dan dilewati, seperti upload lokasi dan deklarasi MOP;
  - pratinjau per kendaraan (sum insured dan premi), dengan premi dihitung sama seperti form;
  - saklar **Ganti semua kendaraan yang ada**. Tanpa saklar itu, kendaraan dari file ditambahkan di akhir daftar.
  - Kendaraan masuk ke form dan baru tersimpan saat Simpan Draft. Kartu rate per kendaraan langsung terlipat setelah upload.
- **Template** (sheet Kendaraan, Petunjuk, dan Merek & Tipe):
  - satu baris satu kendaraan, maksimal 500;
  - kolom data: Merek (dropdown dari Master Data), Tipe, Model / Seri, Tahun, Warna, No. Polisi, No. Rangka, No. Mesin, dan Sum Insured;
  - satu kolom rate (%) per cover slip;
  - limit dan rate untuk TPL 1, TPL 2, PA Driver, dan PA Passenger;
  - kolom deductible per cover, ditambah TPL dan PA;
  - kolom Cek Premi berumus sama dengan hitungan sistem.
- **Aturan baca file** (sama dengan Ketentuan poin 20 di MoM):
  - Merek dan tipe dicocokkan dengan Master Data tanpa beda huruf besar-kecil. Merek atau tipe yang belum ada atau nonaktif membuat barisnya gagal.
  - No. Rangka wajib. Nomor rangka yang sudah ada di slip dilewati, dan nomor rangka kembar di file membuat barisnya gagal.
  - Sum Insured wajib dan harus lebih dari 0. Rate dalam persen 0–100. Tahun 4 angka.
  - Premi dan batas OJK per kendaraan dihitung sistem setelah upload. Drawer menyebut jumlah rate di luar batas OJK dan kendaraan yang belum punya rate.
  - File tanpa deductible: kendaraan baru memakai deductible Kendaraan 1, sama dengan kendaraan yang ditambah lewat form.
  - Kolom rate atau deductible yang bukan cover slip ini disebutkan di drawer dan diabaikan.
- **Salinan template untuk dicek Team LCH:** `documents/Template Upload Kendaraan MV LCH.xlsx`.
  - Dibuat dari Master Data lokal (10 merek), tanpa merek uji SIT.
  - Template yang diunduh dari form selalu memakai Master Data yang sedang berlaku.

## File utama

- `lib/vehicle-import.ts`: daftar kolom, pembaca file (`vehiclesFromRows`), dan template (`fillVehicleTemplate`).
- `components/underwriting/slip-model.ts`: `importVehiclesPatch`, `importReplacesVehicles`, `isBlankVehicleGroup`, `vehicleRateLabels`.
- `components/underwriting/vehicle-upload.tsx`: drawer upload.
- `components/underwriting/placing-slip-form.tsx`: tombol Upload Excel dan pemasangan drawer.
- `tests/vehicle-import.test.ts`.

## Dampak

- **Database:** tidak ada. Kendaraan disimpan di slip lewat Simpan Draft seperti isian form.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint: lolos, kecuali 1 warning lama di `components/claims/claims-view.tsx`.
- `npx tsx --test tests/*.test.ts`: 333 lolos, termasuk 6 test baru:
  - template ditulis lalu dibaca ulang;
  - baris benar, beserta TPL dan PA;
  - pesan kesalahan per baris;
  - nomor rangka yang dilewati dan yang kembar;
  - kolom yang bukan cover slip;
  - premi dan penyalinan deductible setelah kendaraan masuk ke slip.
- **Browser lokal** (SIT Admin, slip baru Motor Vehicle, tidak disimpan):
  - Template Excel terunduh (`template-upload-kendaraan-mv-….xlsx`).
  - **File contoh 5 baris:** 3 siap. Dua gagal: tipe Swift tidak ada di Master Data, dan nomor rangka kembar.
  - **Premi pratinjau cocok dengan hitungan manual.** Contohnya Avanza: 250 juta × (2,5% + 0,075% + 0,12% + 0,05%) + TPL 25 juta × 1% + PA 10 juta × 0,5% + PA 40 juta × 0,1% = 7.202.500. Total 3 kendaraan 26.945.000.
  - **Setelah ditambahkan:** kartu Kendaraan #1–3 terisi merek dan tipe Master Data, nomor polisi, rangka, mesin, dan TSI. Kartu rate terlipat dengan kategori dan wilayah OJK. Ada 6 rate di luar batas OJK yang menunggu alasan.
  - **Upload ulang file yang sama:** 3 dilewati, 2 gagal, tombol berubah jadi Tutup. Dengan saklar ganti: "Ganti dengan 3 kendaraan".
  - File uji di `public/` dan sesi uji dihapus. Jumlah slip (31) dan audit (525) tidak berubah.

## Catatan untuk yang melanjutkan

- **Kolom rate** mengikuti cover kendaraan pertama di slip, atau cover standar Motor Vehicle bila belum ada kendaraan. Kalau type of cover diganti, unduh template lagi.
- **Kolom Tipe belum berupa dropdown** yang bergantung pada Merek. Tipe diketik dan dicocokkan saat upload; daftarnya ada di sheet Merek & Tipe.
- **Ketentuan poin 20** (cocokkan Master Data, nomor rangka dilewati) menunggu masukan Team LCH atas template.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
