# Tarif OJK Lampiran II sampai IV: cek ulang dan perbaikan

- **Tanggal:** 2026-11-02
- **Branch:** `fix/tarif-ojk-lampiran-2-4`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Setelah data okupasi Lampiran I diperbaiki
([tarif-okupasi-lampiran-1-2026-11-02.md](tarif-okupasi-lampiran-1-2026-11-02.md)),
Lampiran II (banjir), III (gempa), dan IV (kendaraan bermotor) dicek dengan
cara yang sama: tabel PDF dibaca per sel lalu dicocokkan dengan CSV seed, data
TS, dan database lokal.

**Angka tarifnya sudah benar semua:**
- banjir harta benda dan kendaraan (II.A, II.B);
- tarif gempa harta benda (III.A);
- 511 zona gempa kab/kota (III.D);
- 48 tarif pokok kendaraan (IV.A);
- perluasan KBM (IV.B);
- skala BI (II.D, III.C).

**Masalahnya ada di empat tempat lain:**

1. **Zona gempa otomatis salah untuk 39 dari 511 kab/kota.** Pencocokan lokasi
   mengambil nama pertama yang cocok tanpa awalan "Kab."/"Kota":
   - "Kota Bandung" jatuh ke Kab. Bandung (Zona 4, seharusnya 5);
   - "Kab. Bungo, Jambi" jatuh ke Kota Jambi karena nama provinsinya sama
     dengan nama kota.
2. **Validasi release slip Property di server memakai batas karangan:**
   - EQVET dihitung dari nomor zona (0,075 sampai 0,19 dikali zona), bukan
     dari Tabel III.A;
   - FWTWD dipatok 0,045 sampai 0,055, angka persen yang dibandingkan dengan
     rate per mil;
   - akibatnya rate yang sesuai OJK dan diketik manual ditolak saat release.
     Contoh: EQVET 1,9‰ di Kota Bandung (Zona 5) dan FWTWD 0,5‰ (0,05%)
     dianggap di atas batas.
3. **Perluasan banjir dan gempa KBM tidak dibedakan per wilayah.** Batasnya
   gabungan semua wilayah, jadi rate di bawah batas wilayah lolos. Contoh:
   gempa Comprehensive di Sumatera minimal 0,12%, tetapi 0,075% diterima.
4. **Nama provinsi di tabel zona gempa terpotong:**
   - "Nusa Tenggara" menggabungkan NTB dan NTT;
   - "Nanggroe Aceh" dan "Kepulauan Bangka" kehilangan sebagian nama;
   - dua nama kab/kota berspasi ganda.

## Yang berubah

- **Pencocokan zona gempa** (`matchEqZone`):
  - nama lengkap dengan awalan menang atas nama tanpa awalan;
  - nama yang lebih panjang menang;
  - pencocokan per kata utuh;
  - "Kabupaten" dibaca sama dengan "Kab.".
  - Hasilnya 0 salah dari 1.022 percobaan (511 kab/kota, dua format
    penulisan). Zona banjir ikut benar karena memakai fungsi yang sama.
- **Batas EQVET di server dari Tabel III.A.** Slip belum mencatat kategori
  konstruksi gempa (jumlah lantai, rangka), jadi batasnya rentang semua
  kategori di zona itu. Rumah tinggal (okupasi 2976 dan turunannya) memakai
  baris DW, selainnya baris Com. Contoh Zona 5 Commercial: 1,90 sampai 4,70‰.
- **Batas FWTWD di server dari Tabel II.A**, dikonversi ke per mil. Hanya batas
  bawah Zona 1 wilayahnya yang dijaga: 0,50‰ untuk Jakarta, Banten, dan Jawa
  Barat; 0,45‰ untuk luar wilayah itu. Batas atas tidak dijaga karena zona
  banjir tidak tercatat di slip dan zona tinggi memakai tarif Zona 1 ditambah
  loading.
- **Perluasan banjir dan gempa KBM per wilayah** (Tabel II.B dan III.E):
  - 4 baris gabungan diganti 12 baris per wilayah;
  - validasi di form dan server memakai wilayah dari lokasi risiko atau
    plat nomor; tanpa wilayah tetap memakai rentang gabungan;
  - panel referensi motor hanya menampilkan baris wilayah yang dipilih;
  - tab Master Data > Kendaraan menampilkan wilayah di kolom dasar pengenaan;
  - catatan baris banjir dan gempa memuat risiko sendiri 10% dari ganti rugi,
    minimal Rp500.000 per kejadian (Tabel IV.B dan SE bagian V.6.b, VI.2.b).
- **Nama provinsi zona gempa** sama dengan PDF: Kepulauan Bangka Belitung,
  Nanggroe Aceh Darussalam, Nusa Tenggara Barat, Nusa Tenggara Timur. Kab.
  Lembata masuk NTT; di PDF kata "TIMUR"-nya terpotong pindah halaman.
- **Pesan gagal release** memakai satuan yang benar (‰ untuk Property dan COB
  lain, % untuk Motor Vehicle) dan menulis "minimal X‰" bila tidak ada batas
  atas.

## File utama

- `lib/data/ojk-zones.ts`: nama provinsi dan `matchEqZone`.
- `lib/server/tariffs.ts`: batas EQVET dan FWTWD, wilayah untuk perluasan KBM.
- `lib/data/ojk-motor.ts`: `MOTOR_EXTENSION_TARIFFS` per wilayah dan
  `findMotorExtensionBounds(label, coverType, region)`.
- `components/underwriting/slip-model.ts`, `components/underwriting/ojk-panels.tsx`:
  wilayah dipakai di form dan panel.
- `components/master-data/tariff-ojk-tab.tsx`: kolom wilayah perluasan KBM.
- `app/(app)/underwriting/actions.ts`: pesan gagal release.
- `prisma/seed-data/zona-gempa-ojk.csv`, `prisma/seed-data/tarif-ojk-kbm-perluasan.csv`.
- `prisma/migrations/20261102200000_ojk_lampiran_2_4/migration.sql`.

## Dampak

- **Database:** migration baru, jalan otomatis saat build:
  - mengganti nama provinsi di `eq_zones` (64 baris, zona tidak berubah);
  - menulis ulang baris banjir dan gempa di `tariff_motor_extension`.
  - Tidak ada perubahan schema.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Tabel PDF Lampiran II sampai IV dibaca per sel dan dicocokkan dengan CSV, TS,
  dan database lokal. Setelah perbaikan, zona gempa di CSV, TS, dan database
  sama persis dengan PDF (511 baris, 34 provinsi).
- Uji fungsi dengan data lokal:
  - `matchEqZone` 0 salah dari 1.022 percobaan.
  - Slip Property Kota Bandung dengan FLEXAS 1,2‰, EQVET 1,9‰, FWTWD 0,5‰:
    lolos release tanpa exception. Dengan EQVET 1,0‰ dan FWTWD 0,4‰, keduanya
    ditandai di bawah batas.
  - Rumah tinggal Kota Mataram, EQVET 1,6‰: lolos (baris DW Zona 5).
  - Gempa KBM Comprehensive di Medan 0,1%: di bawah batas Wilayah 1
    (0,12 sampai 0,135%). Banjir Comprehensive di Jakarta 0,08%: di bawah batas
    Wilayah 2 (0,10 sampai 0,125%).
- `npx tsc --noEmit`, `npm run build`, dan `npx eslint` pada file kode yang
  diubah: lolos.
- Tampilan panel referensi dan master data belum dicek di browser karena
  browser pane belum login.

## Catatan untuk yang melanjutkan

- Belum ada di aplikasi:
  - skala tarif polis loss limit (I.B, II.C, III.B; isinya sama);
  - time excess per okupasi (I.D);
  - risiko sendiri dan masa tunggu gempa harta benda (III.A);
  - risiko sendiri minimum KBM Rp300.000, atau Rp150.000 untuk roda dua (IV).
- Batas TJH di `findMotorExtensionBounds` masih satu rentang 0,25 sampai 1%
  untuk semua jenis kendaraan. TJH kendaraan niaga (sampai 1,5%) dan TJH
  terhadap penumpang (0,125 sampai 0,5%) belum dibedakan.
- `getPropertyRateBounds` masih menebak zona dan wilayah dari teks lokasi. Bila
  slip nanti mencatat zona gempa, zona banjir, dan kategori konstruksi gempa,
  batasnya bisa dibuat persis.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
