# Tanda tangan per asuransi, berselang kiri-kanan

- **Tanggal:** 2026-10-29
- **Branch:** `feat/tanda-tangan-per-asuransi`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dari catatan progres Agus dengan Harry, 29 Oktober 2026, di poin yang sama
dengan aturan field dokumen dan kop cover note:

> di ttd nya ada kiri kanan kiri kanan ttd sesuai yang diinput.

Sebelumnya Cover Note dan Closing Instruction hanya punya satu blok tanda
tangan asuransi dengan nama kosong ("Nama Perusahaan Asuransi: ____"), berapa
pun asuransi yang ikut di security panel. Pada co-insurance setiap asuransi
menandatangani, jadi satu blok tidak cukup.

## Asumsi

Harry tidak merinci lebih jauh, dan PRD tidak membahas tanda tangan banyak
asuransi. Tafsiran yang dipakai:

- **"Sesuai yang diinput"** berarti asuransi yang diisi di security panel slip.
  Satu blok per asuransi, nama asuransinya tercetak.
- **"Kiri kanan kiri kanan"** berarti dua kolom yang diisi berurutan: asuransi
  pertama kiri, kedua kanan, ketiga kiri, dan seterusnya. Urutannya mengikuti
  panel, jadi leader selalu di kiri atas. Jumlah ganjil menyisakan blok
  terakhir sendirian di kiri.

Tafsiran lain yang mungkin — tiap blok satu baris sendiri dan posisinya
bergantian — ditolak karena memakan halaman dan tidak lazim di dokumen
asuransi. Perlu dikonfirmasi ke Harry kalau yang dimaksud ternyata itu.

## Yang berubah

### Dokumen yang kena

| Dokumen | Sebelum | Sesudah |
| --- | --- | --- |
| Cover Note | satu blok asuransi tanpa nama | satu blok per asuransi di panel |
| Closing Instruction | blok asuransi tanpa nama, ditambah blok "Accepted & Signed by" tanpa nama | LCH "Prepared by", lalu satu blok "Accepted & Signed by" per asuransi |
| Placing Slip | — | tidak berubah |
| Quotation Slip | — | tidak berubah |

Placing Slip tidak punya security panel — sesuai jawaban LCH di PR #44 — jadi
tidak ada daftar asuransi untuk dicetak; blok konfirmasi penanggungnya tetap
satu. Di Quotation Slip yang menandatangani tertanggung, bukan asuransi.

Closing Instruction dulu memuat tanda tangan asuransi dua kali: blok SIGNED
tanpa nama di atas, lalu kolom "Diterima & Ditandatangani" tanpa nama di
sebelah blok LCH. Keduanya digantikan blok per asuransi. Blok "Disiapkan oleh"
LCH tetap ada, di atas bagian SIGNED, selebar satu kolom supaya garis tanda
tangannya sepanjang garis blok asuransi di bawahnya.

### Isi tiap blok

Keterangan di atas (khusus Closing: "Diterima & Ditandatangani / Accepted &
Signed by,"), ruang tanda tangan, nama asuransi, "Authorized Signatory", peran
dan porsinya ("As Leader · 50,00%"), lalu "Tanggal". Tiap blok `avoid-break`,
jadi tidak terbelah di batas halaman cetak.

Slip yang panelnya masih kosong — draft yang belum menentukan asuransi — tetap
mendapat satu blok tanpa nama, supaya dokumennya tetap punya tempat tanda
tangan.

### Kode

- `InsurerSignatureGrid` baru di `components/documents/doc-blocks.tsx`.
- `SignedBlock` dihapus; Cover Note dan Closing adalah satu-satunya
  pemakainya.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

`npx tsc --noEmit` dan `npm run build` lolos; `eslint` pada kedua berkas
bersih.

Posisi blok diukur di browser untuk kedua dokumen, memakai slip di database
lokal dengan jumlah asuransi berbeda:

| Slip | Asuransi | Posisi blok |
| --- | --- | --- |
| 002/…/PS-PAREQ | 4 | kiri, kanan / kiri, kanan |
| 005/…/PS-IAR | 3 | kiri, kanan / kiri |
| 003/…/PS-MC | 1 | kiri |
| draft tanpa panel | 0 | satu blok tanpa nama |

Di setiap kasus leader berada di kiri atas, dan tidak tersisa blok "Nama
Perusahaan Asuransi" kosong di samping blok bernama. Blok "Disiapkan oleh" LCH
muncul di Closing Instruction dan tidak di Cover Note, sama seperti sebelumnya.

## Catatan untuk yang melanjutkan

**Tafsiran tata letak perlu dikonfirmasi ke Harry**, lihat bagian Asumsi.

**Cetak belum diuji ke kertas.** Pemecahan halaman hanya dijaga dengan
`avoid-break` per blok; slip dengan banyak asuransi bisa memindahkan sebagian
blok ke halaman berikutnya, dan itu yang diharapkan.

**Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin ini.
