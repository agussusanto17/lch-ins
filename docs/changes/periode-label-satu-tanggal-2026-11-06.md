# Label periode, teks periode, dan periode satu hari

- **Tanggal:** 2026-11-06
- **Branch:** `feat/periode-label-satu-tanggal` (di atas `feat/dua-cover-per-objek`)
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini fitur Tahap 1 nomor 6 dari analisa 26 contoh slip LCH (6 November 2026).
Tiga contoh tidak memakai "Period of Insurance: tanggal to tanggal":

- **12 Hole in One Habco Golf:** "Date of Tournament : 29th July 2026". Release
  menolak periode satu hari karena expiry date harus setelah inception date.
- **02 single shipment CV Unggul Utama Jaya:** "Estimated of Departure (ETD) :
  23rd / 24th / 25th October 2026 until final destination."
- **01 EAR AICRANE:** "Period of Insurance : The whole period from T.B.A,
  including (4 weeks) Testing and Commissioning plus (3 months) Maintenance
  Period thereafter." Di sistem, Period TBA hanya mencetak "To Be Advised".

## Yang berubah

- **Label periode di dokumen:**
  - Isian baru di form placing slip, dengan saran label.
  - Nilai awalnya dari type of cover: isian baru "Label Periode di Dokumen" di
    Master Data > COB & Cover Type.
  - Kosong berarti "Period of Insurance", seperti sebelumnya.
  - Mengganti type of cover mengganti label bawaannya. Label yang diketik
    sendiri tidak ikut berganti.
- **Teks periode di dokumen:** isian baru yang dicetak sebagai pengganti
  tanggal dan keterangan periode, atau pengganti "To Be Advised" saat Period
  TBA. Tanggal tetap disimpan untuk polis.
- **Periode satu hari:**
  - Tanggal mulai dan akhir boleh sama, dan dokumen mencetak satu tanggal,
    misalnya "29 July 2026".
  - Release slip, form dan simpan polis, serta form SPPA menerima tanggal yang
    sama. Server SPPA sudah menerimanya sebelumnya.
  - Pesan release menjadi "Expiry date tidak boleh sebelum inception date."
- **Migrasi:**
  - Marine Cargo (0323) mendapat label "Estimated Time of Departure (ETD)", dan
    label itu keluar dari Detail tambahan Marine Cargo supaya tidak tercetak
    dua kali.
  - Hole In One (1209) mendapat label "Date of Tournament".
- **Audit trail:** label "Label periode" dan "Teks periode".

## File utama

- `prisma/schema.prisma` dan migrasi `20261106070000_periode_label_teks`:
  kolom `cover_types.period_label`, `placing_slips.period_label`, dan
  `placing_slips.period_text`.
- `components/underwriting/slip-model.ts`:
  - `slipPeriodRow`: baris periode dokumen;
  - `nextPeriodLabel`: label saat type of cover diganti;
  - pengecekan release.
- `components/documents/doc-blocks.tsx`: tabel detail memakai `slipPeriodRow`.
- `components/underwriting/placing-slip-form.tsx`: isian label dan teks
  periode.
- `components/master-data/cob-cover-tab.tsx`, `lib/server/master-data.ts`,
  `lib/server/form-options.ts`: label periode bawaan type of cover.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: simpan,
  baca, validasi, dan duplikat.
- `lib/server/tariffs.ts`, `components/policies/policy-form.tsx`,
  `app/(app)/policies/actions.ts`, `components/marketing/sppa-form.tsx`:
  periode satu hari.
- `tests/calc.test.ts`: tiga tes baru.

## Dampak

- **Database:** migrasi menambah tiga kolom teks dan mengisi label periode
  Marine Cargo dan Hole In One. Jalan otomatis saat build di Vercel dan VPS.
  - Detail tambahan Marine Cargo hanya diubah bila belum diubah LCH.
- **Slip lama:** tidak berubah, tetap mencetak "Period of Insurance". Slip
  Marine Cargo dan Hole In One baru langsung memakai label barunya.
- **Env:** tidak ada.
- **Deploy:** merge #143 dan PR dua cover per objek dulu, lalu PR ini. Setelah
  itu sinkronkan fork.

## Verifikasi

- **Script uji ke fungsi server** (sudah dihapus):
  - Label, teks periode, dan tanggal mulai sama dengan tanggal akhir
    tersimpan dan terbaca kembali. Label dan teks bisa dikosongkan lagi.
  - Label periode di Master Data bisa diisi, tetap saat tidak dikirim, dan
    bisa dikosongkan.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - **Closing Instruction Hole in One:** "Date of Tournament : 29 July 2026".
  - **Closing Instruction single shipment:** "Estimated Time of Departure
    (ETD) : 23rd / 24th / 25th October 2026 until final destination."
  - **Form:**
    - Memilih type of cover Marine Cargo mengisi label "Estimated Time of
      Departure (ETD)".
    - Pindah ke Cash In Transit mengosongkannya lagi.
    - Saran label berisi Period of Insurance, ETD, dan Date of Tournament.
  - **Master Data:** dialog Hole In One menampilkan Label Periode di Dokumen
    "Date of Tournament".
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **Asumsi untuk Marine Cargo:** type of cover 0323 dipakai untuk single
  shipment, sesuai contoh 02 dan label Detail tambahan sebelumnya. Kalau LCH
  juga memakainya untuk polis tahunan, label periodenya bisa dikosongkan di
  Master Data, atau diganti per slip.
- **Tanggal polis single shipment** masih ditanyakan ke Harry (pertanyaan 4).
  Untuk sementara, tanggal mulai dan akhir tetap diisi di slip untuk polis,
  sementara dokumen mencetak teks periode.
- **Keterangan periode bawaan** ("Both days at 12 o'clock noon …") tetap
  terisi di slip baru. Untuk acara satu hari, kosongkan isinya.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
