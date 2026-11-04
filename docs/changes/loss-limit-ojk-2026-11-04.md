# Loss limit OJK di master data dan premi slip Property

- **Tanggal:** 2026-11-04
- **Branch:** `feat/loss-limit-ojk`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Polis Property yang tidak dipertanggungkan secara nilai penuh (loss limit)
membayar premi sebagian sesuai skala OJK, SE OJK 6/SEOJK.05/2017 Lampiran I
Tabel I.B. Diminta skala itu masuk master data dan dipakai menghitung premi.
Contoh dari permintaan: FLEXAS IDR 1.000.000 × 0,1127% × 85% (Request & Temuan
REQ-024, 4 November 2026).

## Yang berubah

- **Master data:** tabel `loss_limit_scales` berisi 137 baris dari PDF OJK, dan
  tab "Loss Limit" di Master Data > Tarif Baku OJK. Tab ini read-only seperti
  tab OJK lain, dengan empat kolom seperti di PDF (34, 34, 34, 35 baris).
- **Satu skala untuk tiga tabel OJK:** Tabel I.B (FLEXAS), II.C (banjir), dan
  III.B (gempa) dibandingkan dari ketiga PDF dan isinya sama persis.
- **Placing slip Property:** isian Loss Limit di bawah Subtotal Material
  Damage. Form menampilkan persentasenya terhadap nilai Section 1 dan persen
  premi dari skala. Kartu Rate & Premium memberi keterangan kalau premi memakai
  loss limit.
- **Premi:** baris rate selain BI dihitung nilai Section 1 × rate × persen
  premi. Baris BI tetap penuh. Loss limit yang tidak di bawah nilai Section 1
  dihitung full value. Persen premi disimpan di slip
  (`loss_limit_premium_pct`), supaya dokumen lama tetap cocok dengan preminya.
- **Dokumen** (Placing Slip, Quotation Slip, Cover Note, Closing Instruction):
  - baris "Loss Limit (x% of Section 1 values)" di bawah Total Sum Insured;
  - rumus premi PAR dan EQVET menulis faktornya, misalnya
    "FLEXAS : IDR 1.000.000,00 x 0,11270% x 85,00% =";
  - tabel premi umum memberi label "(Loss Limit 85,00%)".
- **Polis dari slip loss limit:** Total Sum Insured polis adalah loss limit
  ditambah Section 2, karena menurut SE OJK loss limit adalah harga
  pertanggungan.
- **Duplikat slip** ikut menyalin loss limit.

## Asumsi

- Persentase di antara baris memakai baris berikutnya ke atas, supaya premi
  tidak kurang. Di bawah 1% memakai baris 1%.
- Faktor berlaku untuk semua baris rate Property kecuali BI: FLEXAS, FWTWD,
  RSMDCC, Others, dan EQVET.
- Skala di master data read-only seperti tabel OJK lain. Perhitungan memakai
  salinan di `lib/data/loss-limit.ts`, mengikuti pola data OJK lain
  (`lib/data/ojk-tariff.ts`). Kedua salinan harus identik.

## File utama

- `prisma/schema.prisma` dan
  `prisma/migrations/20261104140000_loss_limit_ojk/migration.sql`: tabel,
  isi 137 baris, dan kolom `loss_limit`, `loss_limit_premium_pct` di
  `placing_slips`.
- `lib/data/loss-limit.ts`: `LOSS_LIMIT_SCALE` dan `lossLimitPremiumPct`.
- `lib/calc.ts`: `slipLossLimit`, `insuredAmount`, faktor di `premiumFromRate`,
  `recalcSlip`, dan `calculateParEqvet`.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: simpan,
  muat, dan duplikat.
- `lib/server/master-data.ts`, `app/(app)/master-data/tariff-ojk/page.tsx`,
  `components/master-data/tariff-ojk-tab.tsx`: tab Loss Limit.
- `components/underwriting/placing-slip-form.tsx`: isian dan keterangan.
- `components/documents/doc-blocks.tsx`: baris Loss Limit dan rumus.
- `components/policies/policy-form.tsx`: TSI polis dari slip.

## Dampak

- **Database:** migrasi baru, jalan otomatis saat build di Vercel dan VPS.
  Isi skala ikut migrasi. Slip lama tanpa loss limit tidak berubah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Skala: baris contoh sama dengan PDF (50% → 85%, 48% → 84,46%, 7,5% → 55%,
  1% → 32,5%). 50,5% → 85,20%, 33,333% → 80,22%, 120% → full value. Tabel
  database identik dengan `lib/data/loss-limit.ts`.
- Premi, dengan contoh dari permintaan: FLEXAS 1.000.000 × 0,1127% = 1.127
  untuk full value, dan × 85% = 957,95 untuk loss limit 50%. EQVET ikut
  faktor, BI tetap penuh, dan TSI polis menjadi loss limit + Section 2.
- Simpan dan muat ke database lokal: loss limit 500.000 dan 85% tersimpan. COB
  bukan Property tidak menyimpan loss limit. Slip uji dihapus.
- Dokumen, form, dan tab master data dirender dengan komponen asli dan CSS
  hasil build.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Server menyimpan persen premi yang dihitung form; server tidak menghitung
  ulang dari skala.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
