# SUBJECTIVITY dicetak tepat di atas SECURITY

- **Tanggal:** 2026-11-10
- **Branch:** `fix/subjectivity-di-atas-security`
- **PR:** [#211](https://github.com/agussusanto17/lch-ins/pull/211)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Permintaan LCH lewat Agus, 10 November 2026: di tampilan cetak, bagian SUBJECTIVITY ditaruh di atas SECURITY. Sebelumnya SUBJECTIVITY tercetak sesudah DEDUCTIBLE & CONDITIONS, jauh dari SECURITY.

## Yang berubah

- SUBJECTIVITY sekarang tercetak tepat di atas SECURITY di tiga dokumen:
  - **Quotation Slip** dan **Cover Note:** … RATE & PREMIUM → SUBJECTIVITY → SECURITY.
  - **Closing Instruction:** … RATE & PREMIUM → BROKERAGE → SUBJECTIVITY → SECURITY.
- Blok yang sebelumnya ditulis tiga kali digabung menjadi satu komponen, `SubjectivityBlock`. Blok ini tidak tampil kalau subjectivity kosong, sama seperti sebelumnya.
- Placing Slip tidak berubah karena memang tidak mencetak subjectivity.

## File utama

- `components/documents/slip-documents.tsx`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.
- **Uji browser lokal** (Playwright dan Chrome, sesi sementara), memakai slip `005/LCH-PLCMT/PS-MC/X/2026` yang punya subjectivity. Urutan judul bagian:
  - **QS:** INTEREST INSURED → COVERAGE → DEDUCTIBLE & CONDITIONS → CLAUSES → RATE & PREMIUM → SUBJECTIVITY → SECURITY → CLAUSE WORDINGS.
  - **CN:** … → RATE & PREMIUM → SUBJECTIVITY → SECURITY → SIGNED → CLAUSE WORDINGS.
  - **CI:** … → RATE & PREMIUM → BROKERAGE → SUBJECTIVITY → SECURITY → CLAUSE WORDINGS.
  - Tidak ada error di console.

## Catatan untuk yang melanjutkan

- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
