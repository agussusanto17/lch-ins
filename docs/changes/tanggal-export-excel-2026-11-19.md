# Tanggal export Excel tidak mundur sehari

- **Tanggal:** 2026-11-19
- **Branch:** `fix/tanggal-export-excel`
- **PR:** #281
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Export Excel di tabel (`exportXlsx` di `lib/export.ts`) mengubah nilai kolom bertipe `"date"`
dengan `` new Date(`${value}T00:00:00`) ``, yaitu tengah malam waktu lokal browser. ExcelJS
menyimpan Date sebagai serial UTC. Di browser WIB (UTC+7), 2026-11-01 tersimpan sebagai serial
46326,70833 (31/10/2026 pukul 17.00), dan Excel menampilkannya 31/10/2026, sehari lebih awal.

Di baris yang sama ada bug kedua. Kolom Diperbarui di export Placement berisi `updatedAt` berjam
(`2026-11-19T03:21:45.123Z`). Setelah ditambah `T00:00:00` nilainya jadi Invalid Date, sehingga sel
itu berisi `NaN` di file. Ini terjadi di semua baris, karena server selalu mengirim `updatedAt`
lengkap dengan jam.

## Yang berubah

- Tanggal saja (`YYYY-MM-DD`) ditulis sebagai tengah malam UTC, jadi serialnya bulat: 2026-11-01
  menjadi 46327. Polanya sama dengan `excelDate` di `lib/claim-statistics.ts` (Report Statistik
  Klaim).
- Nilai berjam memakai tanggal lokal browser, sama dengan `dateShort` di tabel. Contoh:
  `2026-11-18T17:00:00.000Z` (19/11 pukul 00.00 WIB) menjadi 19/11/2026.
- Nilai yang tidak bisa dibaca sebagai tanggal ditulis apa adanya sebagai teks, tidak lagi `NaN`.
- Kolom tanggal diberi format `dd/mm/yyyy`. Sebelumnya ExcelJS memakai format tanggal bawaan Excel
  (numFmtId 14), yang tampilannya mengikuti locale komputer, misalnya 11/1/2026 di Excel berlocale
  US.
- Export CSV tidak berubah.

Kolom yang terdampak, semua 15 kolom `type: "date"`:

| Halaman | Kolom |
| --- | --- |
| Policy Database | Mulai, Berakhir |
| Marketing, tab Database Klien | Tanggal KYC |
| Marketing, tab SPPA | Tanggal, Mulai, Berakhir |
| Marketing, tab Renewal Notice | Tanggal Berakhir |
| Placement | Diperbarui |
| Klaim | Tgl Kejadian, Tgl Lapor, Tgl Dokumen Lengkap, Tgl SPK/SPGR |
| Report Operational, tab Polis | Mulai, Berakhir |
| Report Operational, tab Klaim | Tgl Kejadian |

## File utama

- `lib/export.ts`: `excelDate` mengubah nilai kolom `date` menjadi Date tengah malam UTC, dan
  `NUM_FMT` mendapat format `dd/mm/yyyy`.
- `tests/export-xlsx.test.ts`: menjalankan `exportXlsx` dengan `process.env.TZ = "Asia/Jakarta"`,
  menangkap Blob yang akan diunduh, membaca ulang workbook-nya, lalu memeriksa serial tanggal dan
  formatnya.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork `vourdev/lch-ins` seperti
  biasa.
- **File yang sudah diunduh:** file Excel yang diunduh sebelum perbaikan ini tetap berisi tanggal
  mundur sehari, dan export Placement lama berisi `NaN` di kolom Diperbarui. File lama tidak ikut
  berubah. Unduh ulang dari aplikasi setelah perbaikan ini live. Kalau file lama sudah dipakai untuk
  laporan, periksa ulang kolom tanggalnya.

## Verifikasi

- Test baru dijalankan dulu di kode lama: 2 dari 3 gagal, dengan serial `46326.70833333333`
  (seharusnya 46327) dan `NaN` (seharusnya 46344). Setelah perbaikan, 3/3 lolos. Hasilnya sama saat
  proses dimulai dengan `TZ=UTC`, `TZ=Asia/Jakarta`, dan `TZ=America/New_York`, karena file test
  memasang WIB sendiri.
- `npx tsc --noEmit`: lolos.
- `npx tsx --test tests/*.test.ts`: 327 lolos, termasuk 3 test baru.
- `npm run build`: lolos, tanpa migrasi tertunda.
- **Browser lokal** (Admin LCH, Mac di WIB). Unduhan dicegat di halaman, lalu isi `.xlsx` dibaca
  langsung:
  - **Policy Database:** 30 baris. Mulai dan Berakhir semuanya serial bulat dengan format
    `dd/mm/yyyy`. Baris pertama 46357 dan 46722, cocok dengan tampilan tabel "01 Des 2026 s/d 01 Des
    2027".
  - **Placement:** 31 baris. Diperbarui semuanya serial bulat, tanpa `NaN`. Baris pertama 46342,
    cocok dengan tampilan "16 Nov 2026".
  - Sesi uji dihapus, dan tidak ada audit log baru.

## Catatan untuk yang melanjutkan

- Jangan kembali ke `` new Date(`${value}T00:00:00`) `` untuk nilai sel Excel. Pola itu benar untuk
  tampilan di layar (`lib/format.ts`), tapi salah untuk serial Excel.
- `lib/claim-statistics.ts` punya `excelDate` sendiri dengan pola UTC yang sama, khusus tanggal
  saja. Belum disatukan dengan `lib/export.ts` supaya PR ini tetap kecil.
- Export CSV kolom Diperbarui di Placement masih menulis `updatedAt` apa adanya dalam waktu UTC.
  Untuk slip yang diperbarui pukul 00.00–07.00 WIB, tanggal di teks itu masih tanggal sebelumnya.
  Tidak diubah di sini karena di luar export Excel.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
