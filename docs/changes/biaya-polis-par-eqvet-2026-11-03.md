# Biaya polis PAR + EQVET dari isian Admin Cost dan Stamp Duty

- **Tanggal:** 2026-11-03
- **Branch:** `fix/biaya-polis-par-eqvet`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

PR #92 ([perhitungan-premi-par-eqvet-2026-11-03.md](perhitungan-premi-par-eqvet-2026-11-03.md))
menghitung slip Property sebagai dua polis, PAR dan EQVET. Masing-masing
dikenai "Policy Cost + Stamp Duty" sebesar `slip.adminCost`, atau Rp 50.000
kalau Admin Cost kosong. Di form ini membingungkan (Request & Temuan REQ-014):
Total Premium IDR 0 dengan Admin Cost dan Stamp Duty 0 tetap menghasilkan Total
Payable IDR 100.000. Ada tiga sebab:

- Admin Cost 0 dianggap kosong, jadi tetap diganti Rp 50.000
  (`adminCost || 50_000`), dan isian Stamp Duty tidak dipakai sama sekali;
- biaya polis dikenakan ke kedua kelompok walaupun kelompoknya tanpa premi.
  Di slip PAR saja, dokumen tidak mencetak kelompok EQVET, tapi biayanya tetap
  masuk GRAND TOTAL, jadi angka yang tercetak tidak menjumlah;
- form tidak menunjukkan dari mana tambahan itu berasal.

## Yang berubah

- Biaya per polis adalah Admin Cost ditambah Stamp Duty dari form. Tidak ada
  lagi nilai bawaan Rp 50.000 yang tersembunyi; isian kosong atau 0 berarti 0.
- Kelompok PAR atau EQVET yang preminya 0 tidak dikenai biaya polis.
- Untuk slip PAR + EQVET, ringkasan premi di form menampilkan rinciannya,
  misalnya "Policy cost + stamp duty: 2 polis × IDR 50.000", di atas Total
  Payable.
- Dokumen cetak tidak berubah strukturnya; baris "Policy Cost + Stamp Duty" per
  kelompok dan GRAND TOTAL sekarang memakai angka di atas.

## File utama

- `lib/calc.ts`: `parEqvetPolicyCharge` dan `calculateParEqvet`.
- `components/underwriting/placing-slip-form.tsx`: baris rincian biaya polis di
  ringkasan premi.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.
- Slip Property yang Admin Cost-nya kosong tidak lagi mendapat tambahan Rp
  100.000. Kalau LCH memang selalu memakai biaya polis dan materai standar,
  isiannya perlu diisi, atau dibuat terisi otomatis setelah ada jawaban Harry.

## Verifikasi

- Skrip lokal menghitung `calculateParEqvet` dan `totalPayable` untuk slip
  Property 002/LCH-PLCMT/PS-PAREQ/VIII/2026, dibandingkan dengan kode
  sebelumnya:

  | Kasus | Sebelum | Sesudah |
  |---|---|---|
  | Admin 0, Stamp 0 | +100.000 | +0 |
  | Admin 40.000, Stamp 10.000 | +80.000 (Stamp diabaikan) | +100.000 (2 polis × 50.000) |
  | PAR saja, Admin 40.000, Stamp 10.000 | +80.000 | +50.000 (1 polis) |
  | Premi 0, Admin 0, Stamp 0 | Total Payable 100.000 | 0 |
  | Admin 50.000, Stamp 0 | +100.000 | +100.000 |

- Dokumen Placing Slip slip PAR saja dirender lewat skrip. Sebelumnya Total
  Premium PAR IDR 373.134.000,00 sedangkan GRAND TOTAL IDR 373.174.000,00;
  sesudahnya keduanya IDR 373.144.000,00.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Menunggu jawaban Harry soal biaya polis dan materai standar per polis, dan
  apakah perlu terisi otomatis di slip Property baru.
- Label isian di form tetap "Admin Cost" dan "Stamp Duty". Untuk slip PAR +
  EQVET keduanya berlaku per polis, dan itu dijelaskan oleh baris rincian.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
