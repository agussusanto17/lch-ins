# Rate BI otomatis dan loss limit per baris rate di slip Property

- **Tanggal:** 2026-11-05
- **Branch:** `fix/premi-property-bi-loss-limit`
- **PR:** [#115](https://github.com/agussusanto17/lch-ins/pull/115)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Temuan Harry di slip Property, 5 November 2026 (Request & Temuan REQ-029 dan
REQ-030):

- **Premi salah karena rate BI PAR tidak menjumlah.** Di slip uji, rate BI PAR
  (FLEXAS + FWTWD + RSMDCC + Others) masih 1,343‰, padahal jumlah keempat rate
  1,147968‰. Penyebabnya, tombol skala BI di Referensi Tarif OJK hanya mengisi
  rate BI sekali. Rate 1,343 adalah jumlah batas bawah OJK FLEXAS dan FWTWD
  saat tombol diklik, dan tidak ikut berubah saat FLEXAS dan FWTWD diturunkan.
- **Isian Loss Limit (IDR) di bawah Section 1 tidak dipakai.** Gantinya kolom
  persentase di samping rate: sum insured × rate × persentase = premi.
- **Print memakai persen, input per mil.** Print hanya 5 desimal, jadi RSMDCC
  0,000009‰ tercetak 0,00000% dan FWTWD 0,034425% tercetak 0,03443%. Diminta
  rate di print selalu 7 angka di belakang koma.

Acuan rumusnya CI Grand Mercure Batam 2026 di folder CONTOH SLIP LCH:
- FWTWD 0,045000% × 85% = 0,038250%.
- BI (0,048300% + 0,038250% + 0,000001% + 0,000001%) × 90% untuk indemnity
  period 24 bulan, dikali sum insured Section 2.

## Yang berubah

- **Rate BI dihitung otomatis:**
  - BI PAR = jumlah rate FLEXAS, FWTWD, RSMDCC, dan Other Losses setelah loss
    limit, dikali skala BI OJK untuk indemnity period. Periode 12 bulan atau
    kosong dihitung 100%.
  - BI EQVET = rate EQVET setelah loss limit, dikali skala yang sama.
  - Isian rate BI menjadi read-only, dengan keterangan "Otomatis: …".
  - Rate BI dibulatkan 6 desimal (numeric(12,6)), setengah ke atas.
- **Tombol skala BI** di Referensi Tarif OJK sekarang hanya memilih indemnity
  period. Rate BI mengikuti otomatis.
- **Kolom Loss Limit (%)** di tabel rate Property, di antara Rate dan Premium,
  untuk baris selain BI:
  - Kosong berarti full value.
  - Premi = sum insured Section 1 × rate × persentase. Baris BI memakai
    Section 2.
  - Batas OJK tetap dibandingkan dengan rate sebelum persentase.
- **Isian Loss Limit (IDR) dihapus** dari form, termasuk keterangan premi loss
  limit di kartu Rate & Premium.
  - Baris "Loss Limit (x% of Section 1 values)" di INTEREST INSURED dokumen ikut
    dihapus.
  - Polis yang dibuat dari slip memakai total sum insured. Sebelumnya Section 1
    diganti nilai loss limit.
- **Dokumen:**
  - Bagian RATE mencetak pengali seperti CI LCH: "0,0450000% × 85% =
    0,0382500%" untuk baris ber-loss limit, dan "dasar × 90% = rate" untuk BI
    dengan indemnity period selain 12 bulan.
  - PREMIUM CALCULATION mencetak "x 85%", sebelumnya "x 85,00%".
  - Rate persen di RATE dan PREMIUM CALCULATION selalu 7 desimal, sebelumnya 5:
    FLEXAS 0,0803700%, dan 0,000009‰ tercetak 0,0000009%.
- **Satuan tidak berubah:** input Property tetap per mil (REQ-025), dokumen
  tetap persen.
- **Release:** cek "rate BI di bawah FLEXAS" dihapus. Rate BI sekarang dihitung
  otomatis, dan dengan skala di bawah 100% (misalnya 6 bulan 60%) memang bisa
  di bawah FLEXAS.
- **Master Data > Tarif Baku OJK > Loss Limit:** keterangannya menyebut skala
  ini sebagai acuan isian Loss Limit (%).
- `lib/data/loss-limit.ts` dihapus karena tidak dipakai lagi. Skalanya tetap
  ada di tabel `loss_limit_scales`.

## File utama

- `lib/calc.ts`: `recalcSlip`, `biRateBasis`, `biScalePct`, `effectiveRate`,
  dan `ratePercentText`.
- `components/underwriting/rate-tables.tsx`: kolom Loss Limit (%) dan rate
  otomatis.
- `components/underwriting/placing-slip-form.tsx`,
  `components/underwriting/ojk-panels.tsx`: form dan panel skala BI.
- `components/documents/doc-blocks.tsx`: bagian RATE, PREMIUM CALCULATION, dan
  INTEREST INSURED.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`,
  `lib/server/tariffs.ts`: simpan, validasi, dan release.
- `prisma/migrations/20261105100000_loss_limit_per_baris_rate/`.

## Dampak

- **Database:** migrasi `20261105100000_loss_limit_per_baris_rate`, jalan
  otomatis saat build di Vercel dan VPS:
  - Kolom baru `slip_rate_lines.loss_limit_pct` DECIMAL(7,4).
  - Slip lama yang punya loss limit (`placing_slips.loss_limit_premium_pct` di
    bawah 100): persennya disalin ke baris rate selain BI, jadi premi baris itu
    tetap sama. Di database lokal tidak ada slip seperti ini.
  - Kolom `placing_slips.loss_limit` dan `loss_limit_premium_pct` dibiarkan
    supaya kode versi sebelumnya tetap jalan selama deploy, tapi tidak dibaca
    lagi. Bisa dihapus di migrasi berikutnya.
  - Rate dan premi BI yang tersimpan tidak diubah oleh migrasi. Slip dihitung
    ulang saat dibuka di form dan tersimpan saat disimpan. Dokumen slip yang
    belum disimpan ulang masih mencetak angka lama.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork. Form
  yang sudah terbuka sebelum deploy perlu dimuat ulang.

## Verifikasi

- **Slip uji Harry** (skrip dengan fungsi asli; Section 1 930 jt, Section 2
  150 jt, BI PAR lama 1,343):
  - BI PAR menjadi 1,147968‰, premi 172.195,20.
  - Premi FLEXAS 747.441, FWTWD 320.152,50, RSMDCC dan Other Losses 8,37,
    EQVET 706.800, BI EQVET 114.000.
- **CI Grand Mercure** (Section 1 250 M, Section 2 20 M, FWTWD × 85%, 24 bulan):
  - BI PAR 0,778968‰.
  - Premi 120.750.000, 95.625.000, 2.500, 2.500, dan 15.579.360.
  - Premium PAR 231.959.360, diskon 11,5% 26.675.326,40, ditambah policy cost
    dan stamp duty 50.000, total 205.334.033,60. Semua sama dengan CI.
- **Dokumen:**
  - RATE mencetak "0,0450000% × 85% = 0,0382500%", "0,0865520% × 90% =
    0,0778968%", dan RSMDCC 0,0000010%.
  - PREMIUM CALCULATION mencetak FWTWD "x 0,0450000% x 85%".
- **Kasus lain:**
  - EQVET 0,76 × 85%: premi 600.780, BI EQVET 0,646.
  - Skala BI: kosong 100%, 12 bulan 100%, 24 bulan 90%, 5 bulan 60% (baris 6
    bulan), 60 bulan 83%.
  - Pembulatan 1,0963305 menjadi 1,096331.
- **Database lokal:**
  - Loss limit FWTWD 85% dan rate BI tersimpan, dan premi hasil hitung ulang
    sama.
  - SQL migrasi dicoba pada slip uji dengan loss limit lama 92%: baris selain BI
    menjadi 92%, baris BI kosong.
  - Slip uji dihapus.
- **Browser lokal** (halaman uji sementara, dihapus sebelum commit):
  - Kolom Loss Limit (%) tampil di baris selain BI, dan isian Loss Limit (IDR)
    sudah tidak ada.
  - Isi 85 di FWTWD: premi FWTWD menjadi 272.129,63, BI PAR 1,096331 dengan
    premi 164.449,65.
  - Isian rate BI read-only dengan keterangan otomatis.
  - Tidak ada error console.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah,
  `npx tsx --test tests/access.test.ts tests/documents.test.ts` (7 test), dan
  `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- Persentase loss limit diisi manual dengan acuan skala OJK di Master Data >
  Tarif Baku OJK > Loss Limit. Belum ada pemilih otomatis dari persen nilai
  pertanggungan.
- Indemnity period yang jatuh di antara dua baris skala memakai baris
  berikutnya, misalnya 5 bulan memakai 6 bulan (60%).
- Tombol Lihat Dokumen di halaman uji tidak membuka pratinjau tanpa sesi, jadi
  dokumen dicek lewat render server di skrip.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
