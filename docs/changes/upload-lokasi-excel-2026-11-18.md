# Upload lokasi property dari Excel dan tertanggung per lokasi

- **Tanggal:** 2026-11-18
- **Branch:** `feat/upload-lokasi-excel`
- **PR:** #274
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (17 November 2026), poin 6: lokasi property bisa di-upload dari Excel. Ada client dengan puluhan sampai ratusan lokasi.
- Acuannya lampiran polis PT. SPIL (Fleet Office) PAR 50013026001304 halaman 7–26: 39 lokasi, masing-masing dengan nama tertanggung sendiri, okupasi, sum insured per item, rate per cover, dan deductible.
- Template Excel versi pertama dibuat 18 November untuk dicek Team LCH (`documents/Template Upload Lokasi Property LCH.xlsx`). Kolomnya dipakai di sini.
- Tindak lanjut MoM:
  - isian Nama Tertanggung per lokasi;
  - tombol Upload lokasi (Excel) dengan hasil berhasil, gagal, dan dilewati, seperti upload deklarasi MOP.

## Yang berubah

- **Nama Tertanggung per lokasi** (`slip_locations.insured_name`).
  - Isian pertama di kartu lokasi. Kosong berarti sama dengan tertanggung slip.
  - Ringkasan kartu yang terlipat menampilkan namanya.
- **Cetakan:**
  - Lampiran DAFTAR LOKASI mencetak nama tertanggung lokasi, bila berbeda dari tertanggung slip, tebal di atas alamat.
  - Slip floating dan slip satu lokasi mencetaknya di atas alamat pada Risk Location.
  - Audit trail mencatat isian baru "Tertanggung per lokasi".
- **Tombol Upload Excel** di samping Tambah lokasi membuka drawer Upload Lokasi dari Excel. Isinya:
  - tombol Template Excel, yang dibuat di browser;
  - tombol Pilih file;
  - ringkasan Dibaca / Siap ditambahkan / Gagal / Dilewati dengan alasan per baris;
  - catatan, misalnya rate di luar batas OJK;
  - pratinjau per lokasi berisi tertanggung, alamat, okupasi, sum insured, dan premi hitungan sistem.
- **Lokasi masuk ke form**, lalu ikut tersimpan saat Simpan Draft.
  - Lokasi ditambahkan di akhir daftar.
  - Lokasi yang alamat dan tertanggungnya sudah ada dilewati, jadi file yang sama bisa diupload ulang setelah baris gagal diperbaiki.
  - Saklar "Ganti semua lokasi yang ada" mengganti semua lokasi beserta sum insured, rate, dan deductible-nya.
  - Satu-satunya lokasi yang masih kosong, misalnya pada slip baru, ikut diganti.
- **Parser** (`lib/location-import.ts`, `locationsFromRows`):
  - kolom dikenali dari judul;
  - baris yang hanya berisi rumus template dianggap kosong;
  - kode okupasi dicocokkan dengan daftar OJK;
  - kelas konstruksi bisa ditulis Class I, I, 1, K1, atau Kelas 1;
  - rate per mil boleh berupa angka atau teks berkoma;
  - deductible dipecah per baris, maksimal 5.
- **Kesalahan per baris:**
  - alamat atau okupasi kosong;
  - kode okupasi tidak dikenal;
  - kelas konstruksi wajib karena ada rate FLEXAS atau EQVET;
  - Interest MD 1 kosong;
  - angka sum insured atau rate salah;
  - cover yang tidak ada di type of cover slip;
  - lokasi kembar di file.
- **Kesalahan tingkat file:**
  - judul kolom tidak ditemukan;
  - tidak ada lokasi;
  - lebih dari 500 lokasi;
  - Period of Indemnity berbeda antar baris. Slip hanya menyimpan satu periode; nilai yang sama dipakai untuk slip.
- **Rate per lokasi** mengikuti baris rate lokasi pertama (type of cover).
  - Rate BI PAR dan BI EQVET tetap dihitung sistem. Isian manual dari template versi pertama hanya dicatat.
  - Deductible diambil dari file. Bila file tanpa deductible, deductible disalin dari Lokasi 1.
- **Slip floating** hanya memakai kolom Data Lokasi: tertanggung, alamat, okupasi, dan kelas. Sum insured dan rate bersama tetap.
- **Template dari tombol Template Excel** memakai daftar kolom yang sama dengan parser (`LOCATION_COLUMNS`). Isinya:
  - 40 kolom dengan urutan yang sama dengan template versi pertama;
  - 500 baris dengan dropdown okupasi, kelas, dan Period of Indemnity;
  - sheet Petunjuk, Okupasi (beserta batas FLEXAS per kelas), dan Skala BI.
  - **Bedanya dengan versi pertama:** kolom Rate BI PAR dan Rate BI EQVET menjadi rumus otomatis, sama dengan hitungan sistem: rate lokasi × skala Period of Indemnity. Dengan begitu Cek Premi sama dengan premi sistem.
  - Sheet Contoh SPIL tidak ikut, supaya data client tidak tersebar lewat aplikasi.

## File utama

- `lib/location-import.ts`: daftar kolom, parser, dan pembuat template.
- `components/underwriting/location-upload.tsx`: drawer upload.
- `components/underwriting/slip-model.ts`: `importLocationsPatch`, `importReplacesLocations`, `isBlankLocationGroup`.
- `lib/slip-locations.ts`: `locationKey`, `locationInsuredName`, `riskLocationItemsText`.
- `components/underwriting/slip-locations.tsx`: isian Nama Tertanggung dan tombol Upload Excel.
- `components/documents/doc-blocks.tsx`, `lib/slip-audit.ts`.
- `lib/server/placing-slips.ts` dan `app/(app)/placement/actions.ts`: simpan dan baca `insuredName` lokasi.
- `prisma/migrations/20261118210000_tertanggung_per_lokasi/migration.sql`.
- `tests/location-import.test.ts`.

## Dampak

- **Database:** migrasi `20261118210000_tertanggung_per_lokasi` menambah kolom `slip_locations.insured_name` (text, boleh kosong).
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: lolos, termasuk 12 test baru. Template dibuat, diisi lokasi 1–4 SPIL, dibaca ulang, lalu dimasukkan ke slip.
  - Premi per lokasi sama dengan lampiran polis: 54.316.635,26; 40.845.876,02; 1.042.884,92; 4.147.553,98.
  - Total sum insured 101.521.676.800.
- **Browser lokal** (SIT Admin, slip draft uji, dihapus lagi setelah uji):
  - Template Excel terbentuk, 162 KB.
  - File uji 5 baris (4 lokasi SPIL dan 1 kode okupasi 9999):
    - hasil baca: Dibaca 5, Siap ditambahkan 4, Gagal 1, dengan alasan baris 7;
    - pratinjau premi total IDR 100.352.950,18;
    - 4 lokasi masuk ke form dan terlipat.
  - Simpan draft, lalu:
    - mode Ganti semua lokasi berjalan;
    - upload ulang file yang sama memberi Dilewati 4, dan tombol menjadi Tutup;
    - nama tertanggung per lokasi tersimpan dan tercatat di audit trail;
    - lampiran DAFTAR LOKASI mencetak nama tertanggung di atas alamat, dengan Grand Total Premium IDR 100.352.950,18.
- **Temuan saat uji:** skema zod lokasi di server action belum memuat `insuredName`, jadi nama tertanggung terbuang saat simpan. Sudah ditambahkan.

## Catatan untuk yang melanjutkan

- **Template di `documents/`** masih versi pertama untuk Team LCH. Template dari tombol Template Excel adalah versi terbaru, dengan rate BI otomatis. Kolom dan urutannya sama, jadi file versi pertama tetap bisa diupload.
- **Rate yang diupload tidak membawa alasan rate di luar batas OJK.** Drawer menyebut jumlahnya; alasannya diisi di form sebelum release.
- **Uji browser di localhost:** sesi Claude lain bisa memakai cookie localhost di browser pane yang sama. Uji ini memakai `lch.localhost:3002`, yang punya cookie terpisah dan tetap diizinkan dev server Next. `127.0.0.1` diblokir resource dev-nya.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
