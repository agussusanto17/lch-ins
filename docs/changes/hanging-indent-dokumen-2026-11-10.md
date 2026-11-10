# Indentasi Gantung (Hanging Indent) dan Justify pada Dokumen Cetak

- **Tanggal:** 2026-11-10
- **Branch:** `fix/hanging-indent-dokumen`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Pada dokumen cetak (Placing Slip, Quotation Slip, Cover Note, Closing Instruction, SPPA, Klaim, dan Renewal), daftar butir bertanda hubung/bullet (`-`, `•`, `*`) atau bernomor urut sebelumnya dicetak dalam kontainer teks satu blok dengan `whitespace-pre-line text-justify`.

Ketika kalimat pada suatu butir membungkus (*wrap*) ke baris kedua dan seterusnya—seperti pada isian Wording Form:
```text
- Munich-Re Wording Amended with Riot, Strike, Malicious Damage and Civil Commotion
Endorsement (Code 4.1B/2007)
```
Teks baris baru jatuh rata kiri persis di bawah simbol `-`, bukan sejajar dengan awal kalimat. Pengguna meminta agar seluruh butir teks berpoin di semua dokumen menerapkan *hanging indent* (indentasi gantung) dengan teks yang tetap ter-*justify* rapi:
```text
- Munich-Re Wording Amended with Riot, Strike, Malicious Damage and Civil Commotion
  Endorsement (Code 4.1B/2007)
```

## Yang berubah

- **Komponen reusable `HangingIndentText` dan utilitas parser `parseBulletLine`:**
  - Membuat parser murni di `lib/document-format.ts` dengan regex `BULLET_LINE_REGEX` yang presisi mendeteksi tanda butir (`-`, `•`, `*`, `–`, `—`) maupun penomoran (`1.`, `1)`, `(1)`, `(1).`, `a.`, `a)`, `(a)`, `i.`, `iv.`) tanpa salah mendeteksi nama entitas bisnis (misal `PT. Asuransi`) atau rentang tanggal.
  - Memisahkan marker (`shrink-0 select-none`) dan konten kalimat (`flex-1 min-w-0 text-justify`) dalam flex row layout, sehingga saat teks membungkus (*line wrap*), seluruh baris lanjutan otomatis tertahan sejajar rapi di sebelah kanan simbol/nomor butir.
- **Tabel detail kunci-nilai dokumen (`InfoTable`):**
  - Menerapkan `HangingIndentText` pada seluruh sel nilai `InfoTable`. Karena `InfoTable` adalah komponen universal di `DetailTable`, lampiran slip, SPPA, rincian klaim, dan renewal, semua isian formulir multi-baris berpoin langsung rapi secara otomatis.
- **Tabel tarif dan klausula (`doc-blocks.tsx`):**
  - `OpenCoverRateBlock`: merender baris kategori tarif dengan hanging indent untuk label yang panjang.
  - `ParEqvetRateBlock`: merender baris tarif peril Property All Risks dan Gempa Bumi dengan hanging indent.
  - `ClausesBlock`: merender daftar judul klausula bernomor `{i + 1}.` dengan hanging indent terpisah antara nomor urut dan judul.
  - `ClauseWordingAppendix`: merender lampiran klausula `{i + 1}.` dengan penomoran hanging indent berhuruf tebal (`font-semibold`).
  - `CoverageBlock` & `DeductibleBlock` (Special Conditions): menggunakan `HangingIndentText` agar ketentuan khusus berpoin langsung rapi.
- **Blok teks bebas slip (`slip-documents.tsx`):**
  - `Subjectivity`, `Remarks`, dan `Instruction` pada Quotation Slip, Cover Note, dan Closing Instruction kini memakai `HangingIndentText`.

## File utama

- `lib/document-format.ts`: parser ekspresi reguler `BULLET_LINE_REGEX` dan fungsi `parseBulletLine`.
- `components/documents/doc-blocks.tsx`: komponen `HangingIndentText`, integrasi ke `InfoTable`, `OpenCoverRateBlock`, `ParEqvetRateBlock`, `ClausesBlock`, `ClauseWordingAppendix`, `CoverageBlock`, dan `DeductibleBlock`.
- `components/documents/slip-documents.tsx`: integrasi `HangingIndentText` pada bagian Subjectivity, Remarks, dan Instruction.
- `tests/documents.test.ts`: penambahan unit test untuk variasi format bullet, penomoran, dan negative case.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah khusus.

## Verifikasi

- **Unit Test:** `npx tsx --test tests/*.test.ts` (145/145 pengujian lulus 100%, termasuk 5 pengujian dokumen).
- **Typecheck:** `npx tsc --noEmit` bersih tanpa error (0 diagnostics).
- **Production Build:** `npm run build` sukses membuat artefak produksi Next.js.

## Catatan untuk yang melanjutkan

- Struktur flex `flex gap-2` dengan `span.shrink-0` dan `span.flex-1.min-w-0.text-justify` aman di browser cetak modern Chromium/WebKit (Print PDF / Ctrl+P) dan tidak mengganggu pagination tabel `@page` A4.
