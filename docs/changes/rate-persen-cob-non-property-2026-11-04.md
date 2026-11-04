# Rate persen untuk COB selain Property

- **Tanggal:** 2026-11-04
- **Branch:** `fix/rate-persen-cob-non-property`
- **PR:** [#108](https://github.com/agussusanto17/lch-ins/pull/108)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Placing slip COB selain Property dan Motor Vehicle (Marine Cargo, Engineering,
Liability, dan lainnya) menampilkan isian "Rate (‰)" dan menghitung premi per
mil. Diminta: rate Property per mil (‰), COB lain persen (%) (Request & Temuan
REQ-025, 4 November 2026).

## Yang berubah

- **Aturan satuan** (`lib/calc.ts`): `rateModeFor` memakai per mil hanya untuk
  Property; Motor Vehicle dan COB lain persen. Helper baru `rateUnitFor(cob)`
  memberi simbol ‰ atau %, dipakai label form, kolom Rate di dokumen, dan pesan
  release untuk rate di luar batas OJK. Tiga cek nama COB yang terpisah diganti
  helper ini.
- **Form placing slip:** isian rate COB standar berlabel "Rate (%)". Basis
  perhitungan tetap total sum insured.
- **Dokumen** (Placing Slip, Quotation, Cover Note, Closing Instruction): kolom
  "Rate (%)" untuk COB standar. Baris premi COB standar sekarang mencetak type
  of cover (misalnya "Public Liability") di kolom Peril / Cover, bukan label
  "Rate (‰)".
- **Label baris rate** COB standar: "Rate (‰)" menjadi "Rate (%)"
  (`GENERIC_RATE_LABEL`).
- **Master COB:** Mode rate semua COB selain Property menjadi Persen, lewat
  migrasi dan default seed, supaya kolom Mode rate di Master Data sesuai aturan
  di kode. Kode tetap menentukan satuan dari nama COB, bukan dari kolom master
  ini (lihat [kunci-cob-master-data-2026-10-31.md](kunci-cob-master-data-2026-10-31.md)).
- **Data contoh** (`lib/data/slips.ts`, dipakai seed slip demo): rate tiga slip
  COB standar dikonversi ke persen, preminya tetap.

## File utama

- `lib/calc.ts`: `rateModeFor` dan `rateUnitFor`.
- `components/underwriting/placing-slip-form.tsx`: label rate.
- `components/underwriting/slip-model.ts`: `GENERIC_RATE_LABEL`.
- `components/documents/slip-documents.tsx`, `components/documents/doc-blocks.tsx`:
  kolom Rate dan nama cover di tabel premi.
- `app/(app)/underwriting/actions.ts`: satuan di pesan release.
- `prisma/migrations/20261104160000_rate_persen_cob_non_property/`: migrasi data.
- `prisma/seed.ts`, `lib/data/slips.ts`: seed dan data contoh.

## Dampak

- **Database:** migrasi data `20261104160000_rate_persen_cob_non_property`,
  jalan otomatis saat build di Vercel dan VPS:
  - Mode rate di master COB selain Property menjadi Persen.
  - Rate slip COB standar yang sudah ada dibagi 10 (1,35‰ menjadi 0,135%),
    termasuk batas rate bila ada, dan labelnya menjadi "Rate (%)". Kolom premi
    tidak disentuh, jadi premi slip dan dokumen yang sudah dirilis tetap sama.
  - Slip Property dan Motor Vehicle tidak berubah.
  - Perubahan dari migrasi tidak tercatat di Audit Trail.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Satuan per COB: Property ‰; Motor Vehicle, Marine Cargo, Marine Hull,
  Engineering, Liability, General Accident, Miscellaneous, Health, dan COB uji
  SIT %. Contoh: 4.500.000 × 0,135% = 6.075.
- Migrasi di database lokal: empat slip COB standar terkonversi (Marine Cargo
  1,35 → 0,135; Engineering 2,15 → 0,215; Liability 0,85 → 0,085; COB uji SIT
  1,5 → 0,15) dengan label "Rate (%)". Jumlah premi 55 baris rate sebelum dan
  sesudah migrasi sama.
- Premi dihitung ulang dari rate untuk semua slip di database lokal (Property
  18 baris, Motor Vehicle 21, COB standar 4): semuanya sama dengan premi
  tersimpan.
- Data contoh: premi Liability 8.500.000, Marine Cargo USD 6.075, dan
  Engineering 999.750.000, sama seperti sebelum konversi.
- Form dan keempat dokumen dirender dengan komponen asli dan CSS hasil build:
  Marine Cargo menampilkan "Rate (%)" 0,135 dan premi USD 6.075; Property tetap
  "Rate (‰)"; Motor Vehicle tetap "Rate (%)".
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Template migrasi COB baru di `kunci-cob-master-data-2026-10-31.md` memakai
  `rate_mode` `permil`. Untuk COB baru selain Property, pakai `percent`.
- Form slip yang sudah terbuka sebelum deploy masih membawa rate per mil.
  Muat ulang halaman sebelum menyimpan.
- Test case SIT-039 masih mengharapkan rate per mil; perlu diubah setelah
  perubahan ini live.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
