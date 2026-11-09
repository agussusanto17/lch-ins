# Slip multi lokasi dan multi kendaraan: "As Attached" dan tabel lampiran

- **Tanggal:** 2026-11-09
- **Branch:** `feat/lampiran-unit-as-attached`
- **PR:** belum dibuka
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Pertanyaan konfirmasi no. 8 (DAFTAR UNIT KENDARAAN):** Harry bertanya
  maksudnya. Agus memutuskan (9 November 2026):

  > kalo yg multi lokasi multi unit dll di slip tulis aja bro. as attached nah
  > buatin tabel lampirannya.

- **Contoh CI LCH Truckindo dan SBI Fleet:**
  - Halaman 1 menulis "Object of Insured: Merk / Model / Sub Model : As
    Attached …" dan "Rate & Premium : As Attached".
  - Halaman 2 berisi tabel DAFTAR UNIT KENDARAAN, satu baris per kendaraan.
- **Sebelumnya** slip multi lokasi (#129, #150) dan multi kendaraan (#132)
  mencetak semua lokasi atau kendaraan beserta jadwal premi lengkapnya di
  badan dokumen.

## Yang berubah

Berlaku di Placing Slip, Quotation Slip, Draft Cover Note, dan Closing
Instruction.

- **Motor Vehicle dengan lebih dari satu kendaraan:**
  - **Badan dokumen:**
    - INTEREST INSURED berisi "Object of Insured", lima baris "As Attached"
      seperti CI Truckindo, lalu Total Sum Insured dengan jumlah unit.
    - "Rate & Premium : As Attached", lalu Total Payable.
  - **Lampiran DAFTAR UNIT KENDARAAN** (DAFTAR UNIT ALAT BERAT untuk Heavy
    Equipment):
    - Satu baris per kendaraan, berisi merk/tipe/model, tahun, warna, no.
      polisi, no. rangka dan mesin, sum insured, coverage dengan rate dan
      premi, perluasan (FWTWD, EQVET, SRCC, TS, dan lainnya), TPL, PA driver
      dan penumpang, serta total premi.
    - Di bawahnya Total Premium, Discount, Admin Cost, Stamp Duty, dan Total
      Payable.
- **Property dengan lebih dari satu lokasi:**
  - **Badan dokumen:**
    - "Risk(s) Location : As Attached (n locations)".
    - Occupation dan Construction Class dicetak sekali bila semua lokasi
      sama, selain itu "As Attached".
    - Interest per section berisi teksnya, "As Attached", dan subtotal.
    - Bagian RATE tetap dicetak bila rate semua lokasi sama.
    - "Premium" atau "Rate & Premium : As Attached", lalu Grand Total.
  - **Lampiran DAFTAR LOKASI:**
    - Tabel lokasi: alamat, okupasi dan kelas, objek Section 1 dan 2,
      sum insured per lokasi, dan total.
    - Lalu PREMIUM CALCULATION per lokasi dan cover seperti sebelumnya,
      termasuk Discount, Policy Cost, Stamp Duty, dan Grand Total.
- **Posisi lampiran:** setelah tanda tangan, daftar lampiran file, dan DAFTAR
  PESERTA, sebelum CLAUSE WORDING. Dimulai di halaman baru saat dicetak.
- **Yang tidak berubah:**
  - Slip satu lokasi atau satu kendaraan.
  - Slip open cover.
  - COB lain dengan beberapa objek, misalnya daftar limit Liability, tetap
    dicetak di badan dokumen.
  - PA grup tetap memakai DAFTAR PESERTA.

## Keputusan teknis

- **Tabel kendaraan dicetak di A4 portrait.** Kolom yang berkaitan ditumpuk
  dan lebar kolom ditetapkan, sehingga satu baris per kendaraan tetap muat.
  - Halaman landscape sudah dicoba lewat `@page` bernama, tapi Chrome tetap
    memakai lebar portrait untuk isi halaman itu sehingga tabel terpotong.
  - Footer tetap juga salah posisi di halaman portrait sesudahnya.
- **Logika lampiran dipisah ke `lib/slip-schedule.ts`:** kapan "As Attached"
  dipakai, rincian kendaraan, kolom perluasan, dan total per kendaraan.
  Fungsinya bisa diuji tanpa browser.
- **`LocationPremiumSchedule` dan `VehiclePremiumSchedule` dipecah.** Versi
  badan dokumennya menjadi `LocationPremiumAttached` dan
  `VehiclePremiumAttached`. Tabelnya pindah ke `LocationScheduleAppendix` dan
  `VehicleScheduleAppendix`.

## File utama

- `lib/slip-schedule.ts` (baru).
- `components/documents/doc-blocks.tsx`: `DetailTable`, `InterestBlock`, blok
  badan "As Attached", dan dua lampiran.
- `components/documents/slip-documents.tsx`: pemilihan blok premi dan posisi
  lampiran di keempat dokumen.
- `tests/slip-schedule.test.ts` (baru).

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.
- **SIT:**
  - SIT-086 mengharapkan Interest Insured multi lokasi dikelompokkan per
    lokasi di badan dokumen (REQ-045, #150). Sekarang rincian itu ada di
    lampiran DAFTAR LOKASI, jadi SIT-086 perlu ditulis ulang.
  - Jadwal premi per lokasi dan per kendaraan (REQ-036) pindah ke lampiran.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 122 lolos. Empat test baru:
  - "As Attached" hanya untuk banyak kendaraan atau lokasi; Liability tiga
    objek tidak;
  - nilai sama dicetak sekali;
  - tabel dua truk CI Truckindo (premi per truk 12.840.000, Total Premium
    25.680.000, Total Payable 23.157.000);
  - rincian kendaraan lama dari uraiannya.
- `npm run build`: lolos.
- **Uji browser lokal** dengan sesi login sementara:
  - **Draft MV dua truk sementara:** badan dokumen mencetak lima baris "As
    Attached", Total Sum Insured (2 units), "Rate & Premium : As Attached",
    dan Total Payable. Lampiran DAFTAR UNIT KENDARAAN di halaman 3 memuat
    semua kolom tanpa terpotong. Quotation Slip, Draft Cover Note, dan
    Closing Instruction ikut mencetak lampiran.
  - **Slip 010/LCH-PLCMT/PS-PAR/XI/2026 (dua lokasi):**
    - okupasi dan kelas yang sama dicetak sekali;
    - "Risk(s) Location : As Attached (2 locations)";
    - Interest "As Attached";
    - RATE, "Premium : As Attached", dan Grand Total 10.800.000;
    - lampiran DAFTAR LOKASI di halaman 3.
  - **Slip satu lokasi (009) dan slip MV satu kendaraan:** tidak berubah.
  - **PDF cetak:** semua halaman A4 portrait, dengan footer di setiap halaman.
- Draft uji sudah dihapus.

## Catatan untuk yang melanjutkan

- Kalau LCH ingin COB lain dengan banyak unit juga memakai "As Attached",
  misalnya alat CPM atau unit MB, tambahkan aturannya di
  `printsUnitsAsAttached` dan buat lampiran objek.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
