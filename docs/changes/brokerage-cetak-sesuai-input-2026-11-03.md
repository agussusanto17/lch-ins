# Brokerage di dokumen sesuai input, tanpa Net Premium

- **Tanggal:** 2026-11-03
- **Branch:** `fix/brokerage-cetak-sesuai-input`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Di dokumen Placing Slip sebuah slip Motor Vehicle, blok BROKERAGE mencetak
"Brokerage 0,00% (INCL. VAT) IDR 0,00", padahal brokerage diisi 10% dan form
menampilkan Nilai Brokerage IDR 691.500 (Request & Temuan REQ-011).

Penyebabnya aturan dari PR #72
([sit-minggu-3-klausula-klien-ppn-2026-11-02.md](sit-minggu-3-klausula-klien-ppn-2026-11-02.md)):
untuk Motor Vehicle, dokumen mencetak brokerage dikurangi diskon, mengikuti
arahan 2 November 2026. Dengan diskon 10% atau lebih, brokerage 10% tercetak 0%
dan Net Premium sama dengan Total Premium. Form tidak memakai aturan itu, jadi
form dan dokumen berbeda.

Diminta juga: baris Net Premium (after Brokerage) tidak perlu dicetak.

## Yang berubah

- Blok BROKERAGE di Placing Slip dan Closing Instruction mencetak brokerage
  sesuai yang diisi di slip, sama dengan form, untuk semua COB termasuk Motor
  Vehicle. Nilainya brokerage dikali Total Premium, dengan label INCL. VAT atau
  EXCL. VAT seperti sebelumnya.
- Baris Net Premium (after Brokerage) tidak dicetak lagi, begitu juga catatan
  rumus Net Premium di Closing Instruction.
- Quotation Slip dan Cover Note tetap tanpa brokerage.

## File utama

- `components/documents/doc-blocks.tsx`: `BrokerageBlock`.
- `components/documents/slip-documents.tsx`: pemanggil `BrokerageBlock`; aturan
  brokerage dikurangi diskon (`documentBrokeragePct`) dihapus.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Dokumen Placing Slip dan Closing Instruction dirender ke HTML lewat skrip,
  memakai slip MV lokal 001/LCH-PLCMT/PS/VIII/2026 dengan brokerage 10%, diskon
  10%, dan Include VAT:
  - sebelum: "Brokerage 0,00% (INCL. VAT) IDR 0,00", lalu "Net Premium (after
    Brokerage) IDR 8.095.000,00";
  - sesudah: "Brokerage 10,00% (INCL. VAT) IDR 809.500,00", sama dengan nilai
    brokerage di form, tanpa Net Premium.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Perlu dikonfirmasi ke Harry apakah arahan 2 November 2026 "Motor Vehicle 25%
  dikurangi diskon" dimaksudkan sebagai batas maksimal brokerage OJK. Kalau ya,
  validasi batas di `brokerageExceedsCap` (`lib/server/tariffs.ts`) perlu
  memperhitungkan diskon; sekarang hanya membandingkan brokerage dengan 25%.
- `netPremium()` di `lib/calc.ts` tidak lagi dipakai dokumen. Fungsi itu
  dibiarkan untuk modul Finance.
- SIT-040 di sheet SIT masih menyebut net premium; sesuaikan setelah perubahan
  ini tayang.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
