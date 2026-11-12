# Deductible per lokasi, kendaraan, dan objek

- **Tanggal:** 2026-11-13
- **Branch:** `feat/deductible-per-lokasi`
- **PR:** [#240](https://github.com/agussusanto17/lch-ins/pull/240)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Keputusan sebelumnya (Harry, 5 November 2026, Q3 usulan multi lokasi):** satu daftar deductible per cover berlaku untuk semua lokasi, kendaraan, atau objek. Deductible yang beda per lokasi diketik di teksnya, misalnya "Nil (for Location 1)". Daftarnya disimpan di baris rate lokasi atau objek pertama; baris unit lain tidak pernah dibaca.
- **Permintaan Agus, 13 November 2026:** "untuk yg multi lokasi atau multi lainnya untuk deductible dibuat juga di masing-masing lokasi". Deductible diisi per lokasi (Property), per kendaraan (Motor Vehicle), dan per objek (COB lain).

## Yang berubah

- **Form placing slip, Deductible & Clauses:** slip dengan lebih dari satu lokasi, kendaraan, atau objek punya saklar **Deductible berbeda per lokasi** (atau per kendaraan, per objek).
  - **Saklar mati:** satu daftar seperti sebelumnya, berlaku untuk semua unit. Isian di daftar ini langsung ditulis ke cover yang sama di setiap unit.
  - **Saklar menyala:** satu kotak "Deductible per cover" per unit, dengan judul "Lokasi 1" dan alamatnya, "Kendaraan 1" dan nama kendaraannya, atau "Objek 1" dan uraiannya.
  - **Mematikan saklar** saat deductible antarunit berbeda meminta konfirmasi "Samakan deductible semua lokasi dengan Lokasi 1?". Deductible unit lain lalu diganti dengan deductible unit 1, cover demi cover.
  - Saat form dibuka, saklar menyala bila deductible antarunit memang berbeda.
  - Keterangan lama "Deductible yang beda per lokasi ditulis sebagai isian terpisah … (for Location 1)" dihapus.
- **Lokasi, kendaraan, dan objek baru** menyalin deductible unit pertama, cover demi cover. TPL dan PA kendaraan ikut disalin di baris pertama tabelnya.
- **Hapus lokasi, kendaraan, atau objek** tidak lagi memindahkan deductible-nya ke unit pertama, karena setiap unit sudah punya deductible sendiri.
- **Dokumen slip (Placing, Quotation, Closing Instruction, Cover Note), endorsement, ES/CS, dan info polis di form klaim:**
  - Deductible yang sama di semua unit dicetak sekali seperti sebelumnya.
  - Deductible yang berbeda dicetak per unit dengan judul "Location 1", "Vehicle 1", atau "Object 1", sesuai nomor di DAFTAR LOKASI, DAFTAR UNIT KENDARAAN, dan jadwal premi objek. Kelompok section Property (Section 1 dan 2) menjorok di bawah judul unit.
  - Polis PAR dan EQVET dibandingkan per bagian. Contoh: deductible FLEXAS beda per lokasi tetapi EQVET sama, maka polis EQVET tetap mencetak satu daftar.
- **Tidak berubah:**
  - Slip ber-section (CAR dan EAR dengan Section 1 dan 2) tetap satu daftar per section.
  - Objek "limit saja" bukan unit deductible.
  - Slip dengan satu lokasi atau objek tampil seperti sebelumnya.

## File utama

- `components/underwriting/slip-model.ts`: `deductibleUnits`, `unitsShareDeductibles`, `setDeductiblesAllUnits`, `shareDeductiblesPatch`; `deductibleRows` dan `extraDeductibleCovers` per unit; `addLocationPatch` menyalin deductible lokasi 1; `removeLocationPatch` tanpa pemindahan deductible.
- `lib/slip-items.ts`: `withItemRates` menyalin deductible objek berpremi pertama ke objek baru dan tidak lagi memindahkan deductible objek yang dihapus.
- `components/underwriting/deductible-input.tsx`: `SlipDeductibles` (saklar, kotak per unit, dialog samakan) dan `DeductiblePerCover` per unit.
- `lib/slip-deductibles.ts` dan `lib/deductible-text.ts`: kelompok deductible per unit (`unit`) dan `deductiblesByUnit`.
- `components/documents/doc-blocks.tsx`, `components/documents/endorsement-document.tsx`, `components/claims/claim-policy-info.tsx`: cetak judul unit.
- `prisma/migrations/20261113061000_deductible_per_lokasi_objek/migration.sql`.
- `tests/slip-deductibles.test.ts` (5 tes baru) dan `tests/calc.test.ts` (2 tes diubah, 1 tes baru).

## Dampak

- **Database:** migrasi data `20261113061000_deductible_per_lokasi_objek`, tanpa kolom baru.
  - Untuk slip Property multi lokasi, serta slip Motor Vehicle dan COB lain tanpa section dengan beberapa objek, deductible unit pertama disalin ke cover yang sama di unit lain.
  - Cover yang tidak ada di unit pertama dikosongkan, karena dulu tidak pernah dipakai.
  - Hasilnya, slip lama tetap mencetak satu daftar yang sama.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos, kecuali 3 tes margin cetak 18 mm di `tests/documents.test.ts`. Ketiganya sudah gagal di `main` sejak #236 mengganti margin ke 10 mm, tidak terkait perubahan ini.
- **Migrasi di database lokal:** slip CAR 006 (tiga objek, bukan ber-section) dan satu draft Motor Vehicle dua kendaraan mendapat salinan deductible unit pertama; baris lain tidak berubah. Dokumen CAR 006 tetap mencetak satu daftar dengan teks yang sama, dan form draft Motor Vehicle membuka saklar dalam keadaan mati.
- **Uji browser lokal** (build `next start`, sesi admin sementara, slip 010/LCH-PLCMT/PS-PAR/XI/2026 dua lokasi):
  - Deductible FLEXAS di daftar bersama tertulis ke kedua lokasi.
  - Saklar menyala menampilkan Lokasi 1 dan Lokasi 2 dengan alamatnya.
  - FLEXAS lokasi 2 diubah, lalu saklar dimatikan: dialog konfirmasi muncul, dan Batal mempertahankan isian per lokasi.
  - Setelah disimpan, dokumen mencetak "Location 1" dan "Location 2", masing-masing dengan Section 1 — Material Damage dan deductible-nya sendiri.
  - Data slip uji dikembalikan setelah uji. Tidak ada error console atau server.

## Catatan untuk yang melanjutkan

- Pakai `deductibleUnits(slip)` untuk membaca deductible per unit. Jangan lagi membaca baris unit pertama saja.
- **Audit trail:** Update slip hanya mencatat beberapa field kepala (nama tertanggung, status, tanggal, brokerage, PPN, additional fee). Perubahan deductible, rate, dan klausul tercatat sebagai "Update" tanpa rincian. Ini sudah begitu sebelum perubahan ini.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
