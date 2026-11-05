# Coverage, Interest Insured, dan nomor klausula di dokumen slip

- **Tanggal:** 2026-11-05
- **Branch:** `fix/cetak-coverage-interest-nomor-klausula`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus menemukan empat hal di print out slip (5 November 2026):

1. Coverage slip Machinery Breakdown tidak tercetak.
2. Coverage slip CIT/CIS juga tidak tercetak.
3. Interest Insured di print out kehilangan baris barunya. Teks seperti
   "Limit of Liability:" dan baris "- Any one Carrying ..." menyatu jadi satu
   paragraf.
4. Nomor klausula menyambung lintas section (1–7, lalu 8–23, lalu 24–26),
   padahal CI LCH mulai dari 1 lagi di tiap section.

Sebelum dikerjakan, dicek dulu bahwa belum ada PR atau branch Adi untuk
keempatnya.

## Yang berubah

- **Coverage dicetak:** isian Coverage di Detail Coverage & Ketentuan
  dicetak sebagai blok COVERAGE tepat setelah INTEREST INSURED, di Placing
  Slip, Quotation Slip, Cover Note, dan Closing Instruction.
  - Paragraf dan baris barunya dipertahankan.
  - Urutannya mengikuti CI LCH Machinery Breakdown (046/LCH-PLCMT/CI-MB/IX/2025),
    yang mencetak Coverage sesudah Interest Insured. CI Money Insurance LCH
    mencetaknya sebelum Interest Insured; dipilih satu urutan untuk semua COB.
  - Berlaku untuk semua COB yang punya isian Coverage, yaitu semua selain
    Motor Vehicle. Coverage kosong tidak dicetak.
- **Interest Insured COB selain Property:** baris baru di uraian interest
  dipertahankan di print out.
- **Nomor klausula** mulai dari 1 di tiap kelompok, yaitu klausula tanpa
  section, Section 1, dan Section 2. Berlaku di daftar CLAUSES dan CLAUSE
  WORDING. COB selain Property hanya punya satu kelompok, jadi tidak berubah.

## File utama

- `components/documents/doc-blocks.tsx`: `CoverageBlock` baru, uraian interest
  dengan baris baru, dan penomoran klausula per kelompok.
- `components/documents/slip-documents.tsx`: `CoverageBlock` di keempat
  dokumen slip.

## Dampak

- **Database:** tidak ada.
- **Dokumen slip yang sudah ada:** slip yang Coverage-nya terisi sekarang
  mencetak blok COVERAGE, dan nomor klausula slip Property dengan beberapa
  kelompok berubah menjadi per kelompok.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - Closing Instruction Engineering dengan Coverage contoh LCH Machinery
    Breakdown mencetak COVERAGE dua paragraf setelah INTEREST INSURED.
  - Closing Instruction slip CIT dengan Interest dan Coverage contoh LCH
    Money Insurance: baris "Limit of Liability:" dan "- Any one Carrying"
    tetap terpisah.
  - Placing Slip Property dengan klausula di tiga kelompok mencetak 1–3,
    Section 1 1–3, dan Section 2 1–2, di CLAUSES dan CLAUSE WORDING.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (38 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Ini menjawab pertanyaan terbuka dari
  [klausula-tanpa-section-2026-11-05.md](klausula-tanpa-section-2026-11-05.md)
  soal penomoran: sekarang mulai dari 1 di tiap kelompok.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
