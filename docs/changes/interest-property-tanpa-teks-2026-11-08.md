# Objek Interest Property tetap tercetak walau teks section kosong

- **Tanggal:** 2026-11-08
- **Branch:** `fix/interest-property-tanpa-teks`
- **PR:** belum dibuka
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Temuan SIT 8 November 2026, dari uji SIT-081 dengan slip PSATSI
009/LCH-PLCMT/PS-TS/XI/2026 di server lokal:

- Objek Building senilai IDR 2 M tersimpan di lokasi.
- Teks Interest "Section 1 — Material Damage" dikosongkan, dan release
  tetap diterima karena teks itu tidak wajib.
- Akibatnya, blok INTEREST INSURED di keempat dokumen slip hanya mencetak
  Total Sum Insured. Objek dan subtotalnya tidak tercetak.

Penyebabnya, `InterestBlock` hanya mencetak blok section Property bila teks
section-nya diisi. Daftar objek dan subtotal berada di dalam blok itu.

## Yang berubah

- **`InterestBlock`, slip Property:** blok Section 1 atau Section 2 dicetak
  bila teks section-nya diisi **atau** section itu punya objek.
- **Paragraf teks section** hanya dicetak bila teksnya ada.
- **Section tanpa teks dan tanpa objek** tetap tidak dicetak. Contohnya
  Section 2 pada slip tanpa Business Interruption.

## File utama

- `components/documents/doc-blocks.tsx`: syarat cetak blok section Property.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.
- **Dokumen:** berlaku di keempat dokumen slip, yaitu Placing Slip, Quotation
  Slip, Cover Note, dan Closing Instruction.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint `components/documents/doc-blocks.tsx`: lolos.
- `npx tsx --test tests/*.test.ts`: 110 lolos.
- `npm run build`: lolos.
- **Uji browser lokal** dengan sesi login sementara, di keempat dokumen:
  - **Slip PSATSI 009/LCH-PLCMT/PS-TS/XI/2026 tanpa teks section:** sekarang
    mencetak "Section 1 — Material Damage", Building IDR 2.000.000.000, dan
    Subtotal Section 1. Section 2 tidak tercetak.
  - **Slip PAR dua lokasi 010/LCH-PLCMT/PS-PAR/XI/2026 dengan teks section:**
    tidak berubah. Teks tetap tercetak, lalu objek per Lokasi 1 dan Lokasi 2,
    lalu subtotal.

## Catatan untuk yang melanjutkan

- **Teks Interest section tetap opsional saat release.** Kalau LCH ingin
  teks itu wajib, tambahkan di pengecekan release form dan server.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
