# Dua cover atau lebih per objek

- **Tanggal:** 2026-11-06
- **Branch:** `feat/dua-cover-per-objek` (di atas `feat/slip-section-engineering`)
- **PR:** [#144](https://github.com/agussusanto17/lch-ins/pull/144)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini fitur Tahap 1 nomor 5 dari analisa 26 contoh slip LCH (6 November 2026).
Contoh 02, CI single shipment CV Unggul Utama Jaya, memakai dua rate untuk satu
objek senilai USD 32.400:

- 0,07% for ICC "A" Cover, premi USD 22,68;
- 0,50% for including War Risks Cover, premi USD 162,00;
- Premium USD 184,68, ditambah Policy Cost & Stamp Duty USD 4,00, Total
  Premium USD 188,68.

Hitungan dan cetakan sistem sudah menjumlah beberapa baris rate per objek,
karena slip lama bisa memilikinya. Yang belum ada adalah isian di form: tiap
objek COB selain Property dan Motor Vehicle hanya punya satu rate. Sementara
itu kedua rate harus digabung menjadi 0,57%, dan rincian per cover hilang dari
dokumen.

## Yang berubah

- **Form, tabel Rate & Premium** (COB selain Property dan Motor Vehicle):
  - Tiap objek punya tombol "Tambah cover". Objek dengan beberapa cover
    tampil sebagai satu baris objek, lalu satu baris per cover dengan nama,
    rate, Dasar, dan preminya.
  - Nama cover diketik bebas, misalnya ICC "A" atau War Risks. Cover pertama
    boleh tanpa nama; dokumen mencetak type of cover slip.
  - Cover bisa dihapus selama objek masih punya cover lain. Deductible cover
    yang dihapus pindah ke cover pertama yang tersisa, jadi tidak hilang.
  - "Rate semua objek" mendapat pilihan cover bila slip punya lebih dari satu
    nama cover, supaya rate ICC "A" tidak menimpa rate War.
  - Objek baru ikut cover objek pertama, seperti sebelumnya. Objek Limit saja
    cukup satu baris karena tidak berpremi.
- **Release:** cover tambahan tanpa nama ditolak dengan pesan "Isi nama cover
  tambahan objek N." Pengecekan yang sama dijalankan ulang di server.
- **Dokumen:**
  - Slip satu objek mencetak satu baris per cover di RATE & PREMIUM, misalnya
    ICC "A" 0,07 USD 22,68 dan War Risks 0,50 USD 162,00.
  - Jadwal premi multi objek mencetak nama cover di bawah nama objek. Objek
    Limit saja tetap satu baris.
- **Validasi:** nama cover maksimal 200 karakter. Nama terpanjang di database
  lokal saat ini 41 karakter.

## File utama

- `lib/slip-items.ts`: `addItemCover`, `removeItemCover`, `coverNameIssues`,
  dan cover objek baru di `withItemRates`.
- `components/underwriting/slip-item-rates.tsx`: isian cover per objek.
- `components/underwriting/slip-model.ts`: `coverLabel` untuk cover tanpa
  nama, dan pengecekan release.
- `lib/server/tariffs.ts`: pengecekan release di server.
- `components/documents/doc-blocks.tsx`: nama cover di jadwal premi multi
  objek.
- `app/(app)/underwriting/actions.ts`: batas panjang nama cover.
- `tests/calc.test.ts`: empat tes baru.

## Dampak

- **Database:** tidak ada. Baris rate sudah punya label dan pemilik objek.
- **Slip lama:** tidak berubah. Slip yang sudah punya beberapa baris rate per
  objek sekarang bisa diubah nama dan rate tiap covernya di form.
- **Env:** tidak ada.
- **Deploy:** merge PR #143 dulu, lalu PR ini. Setelah itu sinkronkan fork.

## Verifikasi

- **Script uji ke fungsi server** (sudah dihapus): slip Marine Cargo USD
  32.400 dengan ICC "A" 0,07% dan War Risks 0,50%. Nama, rate, premi, dan
  deductible kedua cover tersimpan dan terbaca kembali, dan total preminya
  tetap USD 184,68.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - **Form:** "Tambah cover" memunculkan baris cover kedua. Setelah diisi ICC
    "A" 0,07 dan War Risks 0,5, premi tercetak USD 22,68 dan USD 162,00,
    dan Total Premium USD 184,68.
  - **Release:** cover ketiga tanpa nama ditandai merah, dan tombol release
    menampilkan "Isi nama cover tambahan objek 1."
  - **Rate semua objek** di slip dua kontainer: 0,07 untuk cover ICC "A"
    hanya mengisi cover ICC "A" kedua objek, lalu 0,5 untuk War Risks hanya
    mengisi cover War. Total Premium USD 298,68.
  - **Closing Instruction satu objek:** ICC "A" 0,07 USD 22,68, War Risks
    0,50 USD 162,00, Total Premium USD 184,68, Stamp Duty USD 4,00, dan
    Total Payable USD 188,68, sama dengan contoh 02.
  - **Closing Instruction tiga objek:** dua kontainer masing-masing dengan
    ICC "A" dan War Risks, satu limit. Nama cover tercetak di bawah nama
    objek, limit tercetak "Limit | —", dan Total Premium USD 298,68.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **Rate War di contoh 02** dianggap tambahan di atas ICC "A", sesuai hitungan
  premi di sampel (USD 184,68). Kalau Harry bilang 0,50% itu total, cukup isi
  rate War 0,43% atau hapus cover ICC "A".
- **Policy Cost & Stamp Duty** di contoh 02 satu angka gabungan. Di sistem
  diisi lewat Stamp Duty atau Admin Cost.
- **Nama cover dan deductible.** Deductible per cover tetap disimpan di baris
  cover objek pertama. Mengganti nama cover tidak memindahkan deductible-nya.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
