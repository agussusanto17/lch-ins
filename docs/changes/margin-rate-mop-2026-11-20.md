# Margin rate deklarasi MOP di report

- **Tanggal:** 2026-11-20
- **Branch:** `feat/margin-rate-mop`
- **PR:** #297
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 20 November 2026: "misalnya kita quote ke klien pakai rate 0.1%, kita bayar ke MAG 0.085%, kan ada margin 0.015%. Nah kan kita upload sesuai polis di merimen (sistem lain) ratenya 0.1%, kita setting rate di MOP 0.085%. bisa ga margin itu muncul di report?"

Upload deklarasi (catatan `upload-deklarasi-excel-2026-11-17.md`) mengambil premi dari kolom Gross Premium di General Marine Report, yaitu premi dengan rate ke klien. Rate di slip MOP adalah rate ke asuransi. Kategori rate yang dipakai tiap deklarasi tidak disimpan, jadi selisihnya tidak bisa dihitung atau dilaporkan.

## Yang berubah

- **Premi ke asuransi per deklarasi:** kolom baru `policies.insurer_premium`, yaitu premi menurut rate MOP.
  - Margin rate = premi deklarasi (rate ke klien) − premi ke asuransi.
  - Contoh: nilai 1 miliar, premi Merimen 1.000.000 (0,1%), premi ke MAG 850.000 (0,085%), margin 150.000.
- **Upload deklarasi:**
  - Premi ke asuransi dihitung dari kategori rate MOP: dari kolom Kategori Rate, atau otomatis bila MOP hanya punya satu rate.
  - Pratinjau menampilkan margin per baris dan total "margin rate".
  - Baris tanpa Gross Premium memakai premi dari rate MOP, jadi marginnya 0.
- **Form Tambah/Edit deklarasi:**
  - Isian baru Premi ke Asuransi, terisi otomatis saat Kategori Rate dipilih atau nilai/jumlah unit diubah.
  - Premium tetap bisa diubah ke premi rate klien, dan keterangannya menampilkan margin.
- **Policy Database:**
  - Deklarasi bermargin menampilkan "Margin {nominal}" di bawah premi.
  - Export mendapat kolom Premi ke Asuransi dan Margin Rate.
- **Rekap Produksi:** dua kolom tambahan di ujung, sesudah 49 kolom contoh LCH: `Margin_Rate_OC` dan `Margin_Rate` (Rupiah dengan kurs report).
  - Per asuransi sesuai share.
  - Ditulis negatif seperti komisi dan fee (konvensi pendapatan contoh LCH).
  - Polis lain dan deklarasi tanpa premi ke asuransi berisi 0.
- **Deklarasi lama:** migrasi mengisi premi ke asuransi bila slip MOP-nya hanya punya satu rate berkategori dengan dasar persen. MOP dengan beberapa kategori atau rate per unit dibiarkan kosong karena kategorinya tidak tercatat.
- **Audit Trail:** perubahan premi ke asuransi ikut tercatat.

## Asumsi

- **Rate MOP di slip = rate ke asuransi**, dan premi deklarasi = premi ke klien, sesuai alur Merimen yang dijelaskan Agus.
- **`(Income)/Beban` tidak ditambah margin**, supaya 49 kolom contoh LCH tidak berubah nilainya. Margin ada di kolom sendiri. Kalau LCH mau margin masuk `(Income)/Beban`, cukup satu baris di `recapRows`.
- **Brokerage MOP tetap dihitung** dari premi deklarasi seperti sebelumnya. Kalau margin sebenarnya pengganti brokerage, brokerage di polis MOP perlu dikosongkan supaya pendapatan tidak terhitung dua kali.

## File utama

- `prisma/schema.prisma` dan migrasi `20261120140000_margin_rate_mop`: kolom `policies.insurer_premium` dan isi ulang deklarasi lama.
- `lib/open-cover.ts`: `declarationMargin`.
- `lib/declaration-import.ts` dan `components/policies/declaration-upload.tsx`: premi ke asuransi dan margin di upload.
- `components/policies/policy-form.tsx` dan `components/policies/policy-database.tsx`: form, tabel, dan export.
- `lib/production-recap.ts` dan `lib/server/production-recap.ts`: kolom margin di Rekap Produksi.
- `lib/server/policies.ts`, `app/(app)/policies/actions.ts`, `lib/data/types.ts`.
- `tests/margin-rate-mop.test.ts` (baru) dan `tests/production-recap.test.ts`.

## Dampak

- **Database:** migrasi `20261120140000_margin_rate_mop` menambah kolom `insurer_premium` DECIMAL(18,2) nullable di `policies`, lalu mengisinya untuk deklarasi MOP satu rate.
- **Report:** Rekap Produksi sekarang 51 kolom. Kolom tambahan ada di ujung, jadi urutan 49 kolom contoh LCH tidak berubah.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 379 lolos, termasuk 4 test baru:
  - rumus margin;
  - upload dengan rate klien dari file;
  - kategori tidak diketahui dan rate per unit;
  - kolom margin Rekap Produksi per share dan kurs.
- **SQL isi ulang** diuji di transaksi yang di-rollback: MOP satu rate 0,085% dengan nilai 1 miliar dan 2 miliar mengisi 850.000 dan 1.700.000. Baris kategori kosong diabaikan. Data lokal hanya punya MOP dua kategori, jadi tidak ada yang terisi.
- **Browser lokal**, upload 3 deklarasi uji ke MOP lokal (DRY 0,075%, REEFER 0,0975%) dengan Gross Premium 0,1%:
  - pratinjau margin 250.000, 50.000, dan 0 (baris tanpa Gross Premium), total 300.000;
  - setelah disimpan, Policy Database menampilkan margin per deklarasi;
  - form edit menampilkan Premi ke Asuransi 750.000 dan margin 250.000;
  - Rekap Produksi dari data lokal: `Margin_Rate_OC` −250.000, −50.000, dan 0, sedangkan komisi dan `(Income)/Beban` tidak berubah.
- Deklarasi uji, audit-nya, dan sesi uji dihapus sesudahnya.

## Catatan untuk yang melanjutkan

- **Kategori rate per deklarasi** tidak disimpan; yang disimpan nominal premi ke asuransi. Kalau rate MOP direvisi, premi ke asuransi deklarasi lama tidak ikut berubah.
- **Brokerage MOP:** cek apakah polis MOP produksi (45031126000502) punya brokerage. Kalau margin adalah satu-satunya pendapatan dari MAG, brokerage-nya perlu 0.
- **PR premi installment (#296)** mengubah beberapa file yang sama. PR yang di-merge belakangan perlu di-rebase dulu.
- **graphify** belum terpasang di mesin ini, jadi graph tidak diperbarui.
