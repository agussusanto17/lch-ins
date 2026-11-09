# Impor judul klausul dari contoh slip LCH

- **Tanggal:** 2026-11-09
- **Branch:** `feat/impor-judul-klausul-contoh-slip`
- **PR:** [#186](https://github.com/agussusanto17/lch-ins/pull/186)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Banyak klausul di 26 contoh slip LCH belum ada di Master Clauses, jadi tidak
  bisa dipilih di placing slip.
- Pertanyaan nomor 4 ke Harry: judulnya diinput sebagai klausul tanpa wording,
  dan wording-nya dilengkapi LCH nanti di Master Clauses. Jawaban Harry
  (9 November 2026): boleh.
- **Jumlah di pertanyaan itu, ±190, adalah perkiraan dari analisa
  6 November** untuk Marine Hull, Misc dan kontainer, Liability, serta PA dan
  TS.
  - Hasil hitung ulang untuk empat area itu cocok: 77, 69, 43, dan 32.
  - Ada 156 judul tambahan dari Engineering, Cargo, Cash In Transit,
    Property, dan Motor Vehicle.
  - Analisa lama menganggap klausul Engineering sudah ada di master. Ternyata
    master Engineering hanya berisi pustaka Machinery Breakdown, sedangkan CAR
    dan EAR memakai klausul Munich Re (MR001, MR004, dan seterusnya) yang
    belum ada.
  - Aturannya sama dengan yang disetujui Harry, jadi ikut diimpor.

## Yang berubah

- **377 judul klausul baru, tanpa wording,** per kelompok:

  | Kelompok | Jumlah | Terikat ke |
  | --- | --- | --- |
  | Engineering (CAR, EAR, CPM) | 88 | COB Engineering |
  | Hull (H&M, War, IV) | 77 | COB Marine Hull |
  | PL (PL, CGL, PI) | 43 | COB Liability |
  | MAR (container) | 41 | 1213 Movable All Risk |
  | Cargo | 29 | COB Marine Cargo |
  | PA | 21 | COB General Accident |
  | CIS | 18 | 1203 Cash In Safe |
  | CIT | 15 | 0308 Cash In Transit |
  | PAR | 15 | COB Property |
  | TS | 11 | 0116 Terrorism & Sabotage |
  | Fidelity | 10 | 1202 Fidelity Guarantee |
  | MB | 7 | COB Engineering |
  | MV | 2 | COB Motor Vehicle |

  - Kelompok dan pengikatannya mengikuti pola master yang sudah ada:
    - PAR, MB, PL, Cargo, PA, dan MV di level COB;
    - CIT, CIS, dan Fidelity ke type of cover-nya.
  - Kelompok baru: Engineering, Hull, MAR, dan TS. Hull diikat di level COB
    supaya klausul War juga bisa dipakai di slip H&M, seperti CI Patria.
- **Dokumen:** judul tanpa wording tercetak di CLAUSES, lalu judulnya saja di
  CLAUSE WORDING, seperti klausul tanpa wording sebelumnya.
- **Master Clauses:**
  - filter baru **Wording belum diisi**;
  - klausul tanpa wording ditandai "Wording belum diisi, hanya judul yang
    tercetak", supaya LCH mudah melengkapinya.

## Cara daftar disusun

1. Semua butir di daftar klausul 26 PDF contoh diekstrak per section: 1.200
   butir. Daftar klausul di sini mencakup Clauses, Conditions, Extensions,
   Warranties, dan sejenisnya.
2. **Butir yang dianggap sudah ada** adalah butir dengan padanan di master
   yang tampil di slip COB dan type of cover yang sama. Padanannya salah satu
   dari:
   - judul sama;
   - kode standar sama (MR, LMA, NMA, JH, JW, JC, JX, IUA, LSW);
   - judul sama setelah rincian batas di dalam kurung atau setelah titik dua
     dibuang;
   - kata isinya hampir sama.

   Varian batas, misalnya "Cancellation Clause (14 days)", cukup diedit per
   slip.
3. **Tidak diimpor:**
   - butir Exclusion dan baris "Exclude …", karena masuk isian Exclusions
     slip;
   - kalimat operatif ("The insurer will indemnify…", "Subject to insurer's
     policy terms…");
   - baris deductible, Retroactive Date, label WPC, dan "CL 380" yang berdiri
     sendiri;
   - form wording yang sudah ada di master Wording Form (Institute Cargo
     Clauses A, Buku Wording PSAKBI).
4. **Dibersihkan:**
   - typo sumber yang jelas: NEGILIGENCE, INTERST, INCLUIDNG, IMBSC,
     NOTHWITHSTANDING, ANNIVESARY, Cluse, Clase, Brust, copywright, Bellarus,
     LEASEE;
   - "Board Pair and Set" menjadi "Broad Pair and Set", sesuai judul di
     lampiran wording;
   - titik dan titik dua di akhir judul, serta kurung yang tidak tertutup.
5. **Varian dari beberapa contoh digabung** menjadi satu judul (34 judul).
   Contohnya MR004 "(3 months)" dan "(1 month)" menjadi "MR004 - Extended
   Maintenance Clause". Batasnya diisi per slip.

Form wording Institute untuk Hull (ITC Hulls, Institute War and Strikes Hulls,
Disbursements and Increased Value) tetap diimpor sebagai judul klausul, karena
CI LCH mencetaknya di CONDITIONS.

## File utama

- `prisma/migrations/20261109180000_impor_judul_klausul_contoh_slip/migration.sql`.
- `prisma/seed-data/judul-klausul-contoh-slip.csv`: daftar yang sama, beserta
  nomor contoh slip sumbernya. Dipakai `seedSampleClauseTitles` di
  `prisma/seed.ts`.
- `lib/server/clauses.ts`, `components/underwriting/master-clauses.tsx`, dan
  `app/(app)/underwriting/master-clauses/page.tsx`: filter dan tanda wording
  belum diisi.
- `tests/clause-titles-import.test.ts`.

## Dampak

- **Database:** 377 baris baru di `clauses`, tanpa perubahan skema.
  - Satu judul dilewati bila judul yang sama sudah ada di kelompok itu, atau
    sudah ada sebagai klausul aktif yang tampil di slip COB dan type of cover
    yang sama, misalnya karena sudah ditambahkan LCH.
  - Jadi migrasi aman dijalankan di demo dan produksi yang master clauses-nya
    sudah diubah LCH.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan otomatis saat build. Database baru mendapat
  judul yang sama lewat seed.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 120 lolos. Test baru memeriksa:
  - CSV seed dan migrasi berisi daftar yang sama;
  - tidak ada judul kembar per kelompok;
  - judul rapi;
  - kode COB dan type of cover valid.
- **Database lokal:** 377 judul masuk (597 menjadi 974 klausul). Dijalankan
  ulang di transaksi yang di-rollback: tidak menambah baris.
- **Database sementara dari nol** (dibuat lalu dihapus): 67 migrasi berhasil,
  dan seed membuat 595 klausul pustaka plus 377 judul.
- **Uji browser lokal** dengan sesi login sementara:
  - filter Wording belum diisi menampilkan 377 clause;
  - kelompok Hull berisi 77 judul;
  - picker slip Marine Hull menampilkan BAIL CLAUSE, tapi tidak menampilkan
    judul CIS;
  - Placing Slip mencetak "Bail Clause" di CLAUSES dan "BAIL CLAUSE" di CLAUSE
    WORDING;
  - "Klausul Syarat Penyimpanan Uang" muncul di slip Cash In Safe, tapi tidak
    di slip Fidelity Guarantee;
  - tanpa error halaman.
- Draft uji dan sesi sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- **Wording yang ada di PDF contoh tidak ikut diimpor**, sesuai kesepakatan.
  Ekstraksi mencatat 348 butir yang punya wording di PDF-nya. Kalau LCH ingin
  dibantu mengisinya, wording itu bisa diambil dari PDF yang sama.
- **Judul yang sama di dua COB** menjadi dua klausul, satu per kelompok,
  karena picker menyaring per COB. Contohnya Absolute Asbestos Exclusion
  Clause di PL dan di Hull.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
