# Nilai casco per tahun polis bisa diubah (polis MV multi tahun)

- **Tanggal:** 2026-11-22
- **Branch:** `feat/nilai-casco-per-tahun`
- **PR:** #311
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry (22 November 2026, lewat Agus): "nilai casco bisa dirubah ya bro pertahunnya karena pasti depresiasi per tahun harga".

#294 menghitung nilai casco tiap tahun polis dari satu persen penyusutan untuk semua tahun. Kenyataannya harga kendaraan tidak selalu turun dengan persen yang sama setiap tahun.

## Yang berubah

- **Placing slip, tabel "Rincian per tahun polis"** (kartu kendaraan di Rate & Premium):
  - kolom Nilai casco tahun ke-2 dan seterusnya bisa diisi;
  - nilai yang diisi bertanda "manual";
  - tahun sesudahnya otomatis turun sesuai persen penyusutan dari nilai manual itu, kecuali tahun itu juga diisi;
  - mengosongkan isian mengembalikan tahun itu ke hitungan penyusutan;
  - tahun pertama tetap nilai kendaraan di Interest Insured.
- **Premi:** premi baris rate dan total slip memakai nilai per tahun yang sama dengan tabel.
- **Lampiran PERHITUNGAN PREMI PER TAHUN POLIS** di dokumen memakai nilai itu. Catatannya menjadi "Nilai kendaraan per tahun polis sesuai tabel" bila ada nilai manual.
- **Audit Trail:** perubahan tercatat sebagai "Nilai casco manual per tahun polis", misalnya "Kendaraan 1 tahun 2: IDR 480.000.000".
- **Migrasi `20261122180000_nilai_casco_per_tahun`:** kolom `slip_items.year_values` (JSONB, boleh kosong). Nilainya ikut baris kendaraan, karena kendaraan disimpan ulang setiap slip disimpan.

## Asumsi

- **Isian manual per kendaraan per tahun.** Persen penyusutan di slip tetap dipakai sebagai nilai awal tahun yang tidak diisi.
- **Polis di Policy Database** tetap menyimpan premi total dari slip, sama seperti sebelumnya.

## File utama

- **Hitungan:** `lib/multi-year.ts` (`yearlySumInsured` dengan nilai manual, `withYearValue`, `cleanYearValues`), `lib/multi-year-schedule.ts`, dan `lib/calc.ts`.
- **Form:** `components/underwriting/slip-vehicles.tsx` (tabel bisa diisi).
- **Data dan server:**
  - `lib/data/types.ts` (`LineItem.yearValues`);
  - `prisma/schema.prisma`;
  - `lib/server/placing-slips.ts` (simpan dan muat);
  - `app/(app)/placement/actions.ts`.
- **Dokumen dan audit:** `components/documents/doc-blocks.tsx` (catatan lampiran), `lib/slip-audit.ts`, dan `components/audit/audit-fields.ts`.
- **Tes:** `tests/polis-multi-tahun.test.ts`.

## Dampak

- **Database:** satu migrasi yang hanya menambah kolom boleh kosong. Data lama tidak berubah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 422 lolos. Tes baru:
  - nilai manual tahun 2: 1.555.000.000 / 1.450.000.000 / 1.305.000.000 / 1.174.500.000;
  - tahun pertama tidak bisa ditimpa;
  - mengosongkan kembali ke penyusutan;
  - premi slip sama dengan total rincian.
- **Browser lokal:** slip MV 022 dibuka sementara sebagai Draft 3 tahun dengan penyusutan 10%, lalu dikembalikan.
  - Tahun 2 diubah menjadi 480.000.000 (tanda "manual"). Tahun 3 otomatis menjadi 432.000.000, dan total premi 17.650.000.
  - Setelah disimpan dan dimuat ulang nilainya tetap. Lampiran cetak menulis nilai yang sama dengan catatan "sesuai tabel".
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.
