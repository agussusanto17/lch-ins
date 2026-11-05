# Rate per objek untuk COB selain Property dan Motor Vehicle

- **Tanggal:** 2026-11-05
- **Branch:** `feat/rate-per-objek-cob-lain`
- **PR:** [#136](https://github.com/agussusanto17/lch-ins/pull/136)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Setelah Property multi lokasi
([#129](https://github.com/agussusanto17/lch-ins/pull/129)) dan Motor
Vehicle multi kendaraan
([#132](https://github.com/agussusanto17/lch-ins/pull/132)), Agus meminta
COB lain juga bisa multi (5 November 2026). Satu slip sering punya lebih dari
satu objek dengan rate berbeda, misalnya peserta PA, unit MB dan CPM, atau
Cash In Transit dan Cash In Safe di satu slip Money Insurance. Sebelumnya COB
selain Property dan Motor Vehicle hanya punya satu rate untuk total nilai
semua objek.

Heavy Equipment adalah type of cover Motor Vehicle, jadi sudah multi lewat
#132.

## Yang berubah

- **Rate per objek:** di COB selain Property dan Motor Vehicle, setiap baris
  Interest Insured punya rate sendiri. Premi objek = nilai objek × rate.
  Total premi adalah jumlah premi semua objek.
- **Form:** isian Rate dan Basis perhitungan di Rate & Premium diganti tabel
  per objek, dengan kolom No, Objek, Nilai, Rate, dan Premium.
  - Objek dan nilainya tetap diisi di Interest Insured. Objek baru langsung
    mendapat baris rate kosong sendiri.
  - Slip dengan beberapa objek punya isian "Rate semua objek" dan tombol
    Terapkan ke semua objek, supaya peserta PA yang banyak tidak perlu diisi
    satu per satu.
  - Rate boleh dikosongkan untuk baris yang hanya keterangan, misalnya limit
    yang tidak dikenai premi.
- **Dokumen** slip dengan beberapa objek (keempat dokumen slip):
  - Objek di INTEREST INSURED dicetak bernomor.
  - "Rate & Premium : As per schedule below" diikuti tabel PREMIUM
    CALCULATION dengan kolom No, Objek, Sum Insured, Rate, dan Premium, lalu
    Total Premium.
  - Discount, Admin Cost, Stamp Duty, dan Total Payable dicetak di bawahnya.
  - Slip satu objek tidak berubah.
- **Deductible per cover** tetap satu daftar, disimpan di objek pertama,
  sama seperti lokasi dan kendaraan.
- **Daftar slip:** slip dengan beberapa objek menulis jumlah objeknya,
  misalnya "3 objek".
- **Kode:** logika rate per baris Interest yang dulu khusus kendaraan
  dipindah ke `lib/slip-items.ts` dan dipakai bersama Motor Vehicle dan COB
  lain. Field `vehicleId` dan kolom `vehicle_item_id` tetap bernama begitu
  supaya tidak perlu migrasi ganti nama; isinya kini kendaraan atau objek.

## File utama

- `lib/slip-items.ts`: pengelompokan baris rate per objek dan normalisasinya.
  Untuk kendaraan dibuat format slip satu kendaraan; untuk objek COB lain
  cukup satu rate.
- `lib/slip-vehicles.ts`: tinggal yang khusus kendaraan, yaitu nama, tarif
  OJK, dan batas casco.
- `lib/calc.ts`: premi per objek.
- `components/underwriting/slip-item-rates.tsx`: tabel rate per objek di form.
- `components/documents/doc-blocks.tsx` dan `slip-documents.tsx`: jadwal
  premi per objek.
- `lib/server/placing-slips.ts`: baris rate COB lain ikut ditautkan ke
  objeknya saat disimpan.
- Migrasi `20261105235800_rate_per_objek`.
- `tests/calc.test.ts`: tiga tes baru.

## Dampak

- **Database:** migrasi data, jalan otomatis saat build di Vercel dan VPS.
  - Baris rate slip COB lain yang sudah ada menjadi milik objek pertama.
  - Slip dengan beberapa objek dulu memakai satu rate untuk total nilai.
    Objek lainnya sekarang mendapat salinan rate itu, jadi total premi tetap.
  - Di database lokal, slip Engineering tiga objek menjadi tiga baris rate
    dengan total premi tetap 999.750.000. Total premi semua slip lain tidak
    berubah.
- **Dokumen slip lama:** slip COB lain dengan beberapa objek sekarang
  mencetak jadwal premi per objek. Total premi dan Total Payable sama dengan
  sebelumnya.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Database lokal:** migrasi dijalankan. Total premi per slip dibandingkan
  dengan salinan database sebelum migrasi: hanya slip Engineering yang
  barisnya bertambah (1 menjadi 3), dengan total yang sama.
- **Hitung ulang:** semua slip Motor Vehicle dan COB lain memberi premi dan
  Total Payable yang sama saat dibuka di form.
  - Tiga slip Property lokal memang berubah saat dihitung ulang, tapi itu
    juga terjadi di kode `main`. Penyebabnya rate BI otomatis
    ([#115](https://github.com/agussusanto17/lch-ins/pull/115)), bukan
    perubahan ini.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - Form slip Engineering menampilkan tabel tiga objek, dan form tidak
    dianggap berubah saat dibuka.
  - Rate semua objek 0,3% mengisi ketiganya, dengan total premi 1.395.000.000.
  - Closing Instruction mencetak jadwal per objek dengan Total Payable yang
    sama.
  - Contoh CI Money Insurance LCH (CIT 1,2 M × 0,025%, CIS 250 jt × 0,25%)
    menghasilkan 300.000, 625.000, dan total 925.000. Dengan policy cost dan
    stamp duty menjadi 1.025.000, sama dengan CI LCH.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (44 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- **Validasi release** COB lain tidak mewajibkan rate di setiap objek, karena
  sebagian baris memang hanya keterangan. Cukup minimal satu rate di slip,
  seperti sebelumnya.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
