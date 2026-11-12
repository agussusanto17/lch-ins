# Garis pemisah kalimat perubahan di endorsement dan cancellation slip

- **Tanggal:** 2026-11-12
- **Branch:** `fix/garis-endorsement-slip`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Lanjutan cetak endorsement slip berbahasa Inggris ([#226](https://github.com/agussusanto17/lch-ins/pull/226), catatan `endorsement-slip-bahasa-inggris-2026-11-12.md`).

Pada 12 November 2026, Harry menandai cetakan endorsement slip di demo dan minta garis di dua tempat:
- di antara data polis (baris Deductible) dan kalimat "It is hereby noted and agreed…";
- di antara "All other terms and conditions remain unchanged." dan judul PREMIUM CALCULATION.

## Yang berubah

- Blok kalimat perubahan, dari kalimat pembuka sampai penutup, sekarang punya garis atas dan bawah (`border-y py-4`). Gayanya sama dengan garis tabel di dokumen yang sama.
- Berlaku untuk kedua cetakan yang memakai format ini:
  - endorsement dan cancellation slip dari Placement (`components/documents/endorsement-slip-document.tsx`);
  - cetak endorsement dan cancellation dari Policy Database (`components/documents/endorsement-document.tsx`).

## File utama

- `components/documents/endorsement-slip-document.tsx`
- `components/documents/endorsement-document.tsx`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint app components lib tests next.config.ts --quiet`, `npx tsx --test tests/*.test.ts` (209 tes), dan `npm run build`: lolos.
- **Uji browser ujung ke ujung** (Playwright dan Chrome, sesi sementara, worktree di port 3001). Slip MV uji 018 dibawa sampai Closed, lalu dibuat ES 019 dan CS 020.
  - Garis atas dan bawah tampil di cetakan Placement dan di cetakan record Policy DB.
  - Semua cek teks bahasa Inggris dari #226 tetap lolos.
  - Tidak ada error di console.
  - Data uji dihapus per id, dan counter PS kembali ke 17.

## Catatan untuk yang melanjutkan

- **Additional Fee Rp 0 di Report Operational:** Harry menanyakannya bersamaan dengan permintaan garis ini. Penyebabnya data, bukan kode, dan tidak ada perubahan untuk itu:
  - polis tahun 2026 di demo berasal dari slip 003 dan 005 (Property, fee kosong) serta 004 dan 006 (Engineering dan Miscellaneous, yang tidak punya isian Additional Fee; isian itu hanya untuk Property dan Motor Vehicle);
  - satu-satunya slip ber-fee adalah 007. Polisnya, 45020125022398, mulai 24 November 2025 dan fee-nya masih 0 karena tercatat sebelum penyalinan fee ke polis (#213).
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
