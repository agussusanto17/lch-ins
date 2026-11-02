# Perbaikan temuan SIT Minggu 3: klausula per COB, klien di slip, nominal PPN brokerage

- **Tanggal:** 2026-11-02
- **Branch:** `fix/sit-minggu-3-klausula-klien-ppn`
- **PR:** #72
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

SIT Minggu 3 (SIT-029 sampai SIT-044) menyisakan dua kasus gagal dan satu
temuan yang sumbernya kode:

- **SIT-035:** semua klausul pustaka LCH di database punya `cob_id` kosong.
  Pemilih klausul menganggap klausul tanpa COB berlaku untuk semua COB, jadi
  klausul Cargo, MV, dan PL ikut muncul di slip Property. Pratinjau wording juga
  menampilkan tag HTML mentah.
- **SIT-031:** setelah slip disimpan lalu dibuka lagi, field Klien kosong.
  Pemilih tertanggung mencari klien di store browser yang berisi data contoh,
  bukan di database.
- **SIT-041:** nominal PPN brokerage tidak terlihat. Keputusan user: dokumen
  tetap hanya mencetak persentase brokerage (Opsi A), dan brokerage yang diisi
  dianggap sudah termasuk PPN, sesuai koreksi Harry tanggal 19/10 dan rumus
  `effectiveBrokeragePct`.

## Yang berubah

- Klausul pustaka dipetakan ke COB menurut kelompok produknya. Type of cover
  ikut diisi hanya kalau satu COB berisi produk yang berbeda:

  | Kelompok | COB | Type of cover |
  |---|---|---|
  | PAR, EQVET | 01 PROPERTY | - |
  | MV | 02 MOTOR VEHICLE | - |
  | Cargo | 03 MARINE CARGO | - |
  | CIT | 03 MARINE CARGO | 0308 Cash In Transit |
  | MB | 08 ENGINEERING | 0803 Machinery Breakdown Insurance |
  | PL | 09 LIABILITY | - |
  | PA | 10 GENERAL ACCIDENT | - |
  | CIS | 12 MISCELLANEOUS | 1203 Cash In Safe |
  | Fidelity | 12 MISCELLANEOUS | 1202 Fidelity Guarantee |

  Klausul yang COB atau type of cover-nya sudah diisi lewat master tidak
  disentuh.
- Pemilih klausul menampilkan pratinjau dan pencarian wording sebagai teks
  biasa, dan badge menampilkan kelompok sumber (PAR, EQVET, dan seterusnya).
- Pemilih tertanggung membaca daftar klien dari database lewat server. NPWP
  sudah disamarkan di server, data KYC lain tidak dikirim ke browser.
- Saat Include VAT aktif, ringkasan brokerage di form slip menampilkan
  "PPN 2,2% (termasuk)" dan "Brokerage sebelum PPN". Contoh: brokerage
  229.500 menjadi PPN 4.940,31 dan brokerage sebelum PPN 224.559,69.
- Dokumen Placing Slip dan Closing Instruction menampilkan `INCL. VAT` atau
  `EXCL. VAT`, tanpa baris nominal PPN. Untuk Motor Vehicle, persentase brokerage
  di dokumen adalah `brokeragePct - discountPct`, sesuai arahan Harmul tanggal
  2 November 2026. Contoh brokerage 25% dengan diskon 15% ditampilkan 10%.
- Judul section "Sum Insured" (Property) dan "Interest Insured" (COB lain)
  diberi tanda `*` karena wajib diisi sebelum release.

## File utama

- `prisma/migrations/20261102120000_clause_cob_mapping/migration.sql`:
  pemetaan klausul yang sudah ada di database.
- `prisma/seed.ts`: `CLAUSE_GROUP_COB` memetakan klausul untuk database baru.
- `components/underwriting/clause-picker.tsx`: pratinjau, pencarian, dan badge.
- `lib/server/clients.ts`: `listInsuredOptions()` untuk pemilih tertanggung.
- `components/underwriting/insured-picker.tsx`: memakai daftar klien dari server.
- `lib/calc.ts`: `brokerageVatAmount()`.
- `components/underwriting/placing-slip-form.tsx`: baris PPN dan tanda wajib.

## Dampak

- **Database:** migrasi data baru `20261102120000_clause_cob_mapping`. Di
  produksi migrasi ini jalan otomatis lewat `prisma migrate deploy` saat build
  Vercel setelah fork disinkronkan. Tidak ada perubahan skema.
- **Env:** tidak ada.
- **Deploy:** setelah merge, `gh repo sync vourdev/lch-ins -b main`.

## Verifikasi

- Database lokal setelah `prisma migrate deploy`: 595 klausul, semuanya punya
  `cob_id`; kelompok CIT, MB, CIS, dan Fidelity juga punya `cover_type_id`.
- `npx eslint` pada file yang diubah: tidak ada masalah.
- `npx tsc --noEmit` dan `npm run build`: lihat PR.
- Uji E2E di localhost (dev server, database lokal, slip draft uji):
  - SIT-035: slip Property hanya menampilkan klausul PAR dan EQVET (265),
    tanpa tag HTML. Motor Vehicle hanya MV (16). Marine Cargo menampilkan
    Cargo dan CIT (89); dengan type of cover Marine Cargo, CIT hilang (49).
  - SIT-031: klien dari database muncul di pemilih, tetap terisi setelah
    reload, dan tautan "Lihat klien" memakai UUID yang benar. NPWP lengkap
    tidak ada di payload halaman.
  - SIT-041: brokerage 15% dari premi 1.530.000 dengan Include VAT
    menampilkan PPN 4.940,31 dan brokerage sebelum PPN 224.559,69. Tanpa VAT
    kedua baris hilang. Dokumen menampilkan `INCL. VAT` atau `EXCL. VAT`.
    Motor Vehicle brokerage 25% diskon 15% tercetak "Brokerage 10,00%".
  - SIT-037: mengetik "1.53" dengan keyboard tersimpan sebagai 1,53.

## Catatan untuk yang melanjutkan

- SIT-037 ("0.4" tersimpan sebagai 4) bukan bug. `NumberInput` preset
  `rate`/`percent` sudah mengubah titik menjadi koma saat diketik. Hasil gagal
  di SIT berasal dari cara uji yang mengisi nilai tanpa menekan tombol.
- Hasil yang diharapkan SIT-041 di spreadsheet SIT (PPN 5.049) perlu diganti
  menjadi 4.940,31, karena brokerage dianggap sudah termasuk PPN.
- Klausul Cargo dipetakan ke COB Marine Cargo tanpa type of cover, jadi ikut
  muncul di slip Cash In Transit. Satu klausul hanya bisa punya satu type of
  cover; kalau LCH ingin memisahkannya, atur per klausul lewat master.
- Atas permintaan user, data contoh operasional di database produksi dihapus
  langsung lewat SQL pada 2 November 2026, termasuk slip uji SIT
  001/LCH-PLCMT/PS/XI/2026. Yang tersisa: klien PT Graha Sentosa Properti dan
  Mr. Harry Mulyono, SPPA Draft Harry, slip 002/LCH-PLCMT/PS-PAREQ/VIII/2026,
  polis PAR/2025/JKT/0871, dan klaim CLM/2026/08/0031. Tiap modul mengisi
  ulang data contoh kalau tabelnya kosong, jadi jangan kosongkan tabel ini.
- Klausul baru yang dibuat dengan COB "semua" tetap muncul di semua COB.
  Itu memang perilaku yang diinginkan.
