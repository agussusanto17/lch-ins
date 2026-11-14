# Komentar kode dirapikan

- **Tanggal:** 2026-11-14
- **Branch:** `chore/rapikan-komentar-antislop`
- **PR:** #253
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Banyak komentar di codebase tumbuh panjang: blok 3 sampai 12 baris yang
menumpuk riwayat ("dulu…", "sejak…"), contoh nama klien, dan rantai alasan di
sekitar satu aturan. Ada juga banner pemisah di `schema.prisma`, JSDoc yang
hanya mengulang nama fungsi, dan label JSX kosong seperti `{/* Ringkasan */}`.
Komentar dirapikan mengikuti pedoman antislop-code: satu baris, dua kalau baris
kedua membawa fakta baru.

## Yang berubah

- Hanya komentar yang berubah. Kode, impor, format, dan indentasi tetap.
- Banner `// ----` di `schema.prisma` jadi satu baris judul biasa.
- Komentar yang mengulang nama atau baris kode di bawahnya dihapus, termasuk
  label JSX kosong (`User Identity & Avatar Dropdown`, `Add Document Form`, dan
  sejenisnya).
- Blok panjang dipangkas ke 1–2 baris. Yang dipertahankan: aturan bisnis,
  rujukan PRD, SIT, OJK, dan PMK, edge case, catatan keamanan, workaround
  browser atau Next.js, dan tanda sumber keputusan seperti
  "(Harry, 6 November 2026)".
- Riwayat, nomor PR, dan contoh nama klien di komentar dibuang. Riwayatnya
  sudah ada di `docs/changes/` dan git.
- Beberapa komentar yang salah tempat atau basi diluruskan:
  - Dua JSDoc di `lib/data/types.ts` dipindah ke deklarasi yang benar.
  - JSDoc ganda di `derivedDocNumber` dan `SecurityPanelBlock` digabung. Untuk
    `SecurityPanelBlock`, yang dipertahankan adalah versi yang sesuai kode:
    share selalu dicetak.
  - Kalimat di `policyFieldsFromSlip` yang bertentangan dengan kode dihapus.
    Kodenya memakai nama insured di slip, dan nama klien hanya cadangan.
- Yang sengaja dibiarkan lebih dari dua baris karena berupa daftar referensi,
  satu baris per butir:
  - header konvensi di `schema.prisma`;
  - daftar CSV di `prisma/seed.ts`;
  - perintah pemakaian di `scripts/move-files-to-object-storage.ts` dan
    `scripts/sweep-orphan-objects.ts`.
- File shadcn bawaan di `components/ui/` tidak disentuh. Pengecualiannya tiga
  komentar kustom di `button.tsx`, `select.tsx`, dan `toggle.tsx`.

## Dampak

- **Database:** tidak ada. Komentar `///` di `schema.prisma` tidak masuk ke
  migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- Setiap file yang berubah dibandingkan dengan `main` setelah komentarnya
  dibuang. Caranya: AST TypeScript dicetak tanpa komentar, lalu hasilnya
  dibandingkan. Semua file identik, jadi tidak ada kode yang berubah.
- `npx tsc --noEmit` dan `npm run build` lolos. `prisma validate` lolos.
- `npx tsx --test tests/*.test.ts`: 252 lolos, 3 gagal. Ketiganya test margin
  cetak 18mm di `tests/documents.test.ts`, yang sudah gagal di `main` sejak
  margin diubah di #236.

## Catatan untuk yang melanjutkan

- Pakai pedoman yang sama untuk komentar baru. Tulis alasan atau aturannya,
  bukan riwayatnya. Taruh tanda sumber keputusan, misalnya (Nama, tanggal), di
  akhir kalimat.
- Test margin di `tests/documents.test.ts` masih perlu disesuaikan dengan
  margin cetak sekarang (`var(--print-x, …)`). Itu topik terpisah.
