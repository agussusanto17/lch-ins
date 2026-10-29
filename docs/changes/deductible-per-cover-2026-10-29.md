# Deductible per cover

- **Tanggal:** 2026-10-29
- **Branch:** `feat/deductible-per-cover`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dari catatan progres Agus dengan Harry, 29 Oktober 2026:

> input slip nya gabungin jadi 1, 1 property 1 form aja, deductible buatkan
> sesuai cover nya.
>
> pakai 1 form aja untuk kondisi ini, broker beda asuransi, kalo asuransi
> input 2x, kali broker cukup 1x input placing slip untuk kondisi ini.

Bagian "1 property 1 form" ternyata sudah terpenuhi: satu slip properti memuat
seluruh cover sebagai baris rate — FLEXAS, FWTWD, RSMDCC, Other Losses, BI
PAR, EQVET, dan BI EQVET. Asuransi menerbitkan polis terpisah per cover (input
dua kali), sedangkan LCH cukup satu placing slip. Agus mengonfirmasinya pada
hari yang sama.

Yang belum ada adalah deductible per cover. Deductible masih dua daftar teks
bebas per section — "Section 1 — Material Damage" dan "Section 2 — Business
Interruption" — sehingga deductible gempa dan banjir ditulis sebagai kalimat
("… for Earthquake") di daftar yang sama dengan deductible lain.

Catatan PR sebelumnya menyebut sisa pekerjaan "satu placing slip untuk
co-insurance". Itu salah tafsir atas kalimat kedua: "kondisi ini" merujuk ke
kalimat pertama, satu properti dengan beberapa cover, bukan beberapa asuransi.
Tidak ada pekerjaan co-insurance terpisah.

## Yang berubah

### Model data

Kolom baru `slip_rate_lines.deductible` (teks, nullable) dan field
`RateLine.deductible`. Deductible menempel pada baris cover yang bersangkutan,
jadi ikut tersalin, ikut terhapus, dan urutannya sama dengan baris rate.

Migration `20261029160000_deductible_per_cover` hanya menambah kolom nullable;
kode lama tetap jalan dan baris yang sudah ada tidak berubah.

### Form placing slip

Bagian Deductible & Clauses kini menampilkan satu isian per baris rate, berlabel
nama covernya. Placeholder baris BI memakai contoh waiting period, baris lain
contoh persentase klaim.

- **Baris TPL dan PA motor tidak ikut.** Risiko sendiri polis motor berlaku
  untuk kerusakan kendaraan dan perluasannya; tanggung jawab pihak ketiga dan
  santunan kecelakaan diri tidak mengenal deductible. Ada juga dua baris TPL
  yang labelnya sama persis, yang akan membingungkan di daftar.
- **Baris tunggal "Rate (‰)"** — Marine, Engineering, Liability — diberi label
  type of cover slipnya, misalnya "Marine Cargo — Institute Cargo Clauses (A)".
  "Rate (‰)" bukan nama cover, dan tanpa ini dokumen mencetaknya di kolom cover.
  Aturannya ada di `coverLabel()` di `slip-model.ts`, dipakai form dan dokumen.

### Deductible lama

Deductible per section yang sudah tersimpan tidak bisa dipindahkan otomatis:
"2.5% of TSI … for Earthquake" harus masuk EQVET, bukan FLEXAS, dan itu butuh
orang yang membacanya. Jadi isinya dibiarkan, dan:

- form menampilkannya di kotak bergaris putus "Deductible lama (belum per
  cover)" dengan petunjuk untuk memindahkannya, hanya selama masih ada isinya;
  slip baru tidak pernah melihat kotak ini;
- dokumen tetap mencetaknya seperti sebelumnya, di bawah tabel per cover,
  supaya slip lama tidak kehilangan isi sebelum dipindah.

### Dokumen

`DeductibleBlock` mencetak tabel "Cover | Deductible" untuk cover yang
deductible-nya terisi. Cover yang kosong tidak dicetak. Berlaku di keempat
dokumen yang memakainya: Placing Slip, Quotation Slip, Cover Note, dan Closing
Instruction.

## File utama

- `prisma/schema.prisma`, `prisma/migrations/20261029160000_deductible_per_cover/`
- `lib/data/types.ts`: `RateLine.deductible`.
- `lib/server/placing-slips.ts`: baca, dan tujuh tempat tulis baris rate.
- `app/(app)/underwriting/actions.ts`: validasi, maksimal 500 karakter.
- `components/underwriting/slip-model.ts`: `coverLabel()`.
- `components/underwriting/placing-slip-form.tsx`: isian per cover dan kotak
  deductible lama.
- `components/documents/doc-blocks.tsx`: `DeductibleBlock`.

## Dampak

- **Database:** satu migration, menambah kolom nullable. Diterapkan otomatis
  oleh `prisma migrate deploy` di `npm run build`, termasuk saat Vercel build.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain migration di atas.
- **Pengembang lokal:** setelah menarik branch ini, jalankan
  `npx prisma migrate deploy` dan `npx prisma generate`, lalu **restart dev
  server**. Dev server yang sudah jalan memegang Prisma client lama dan akan
  menolak simpan slip dengan "Unknown argument `deductible`".

## Verifikasi

`npx tsc --noEmit` dan `npm run build` lolos; `eslint` pada berkas yang
disentuh bersih. `prisma migrate diff` antara database lokal dan skema tidak
menunjukkan selisih untuk kolom ini.

Diuji ujung ke ujung di localhost dengan slip draft properti yang punya dua
deductible lama:

1. Form menampilkan tujuh isian cover, kosong, dan kotak deductible lama berisi
   "IDR 100,000,000 each and every loss" dan "14 (fourteen) days waiting
   period".
2. Isian FLEXAS, BI PAR, dan EQVET diisi; kedua entri lama dihapus; kotak lama
   hilang begitu kosong.
3. Simpan Draft: database berisi deductible di tiga baris cover itu dan nol
   baris deductible lama.
4. Form dimuat ulang: ketiga nilai terbaca kembali.
5. Dokumen Placing Slip: tabel "Cover | Deductible" berisi tepat tiga baris itu.

Ditambah: slip Marine (baris tunggal) menampilkan satu isian berlabel "Marine
Cargo — Institute Cargo Clauses (A)" beserta dua deductible lamanya; slip
002/PS-PAREQ yang belum dipindah tetap mencetak deductible lamanya per section.

Branch ini dan PR #52 (tanda tangan per asuransi) sama-sama mengubah
`doc-blocks.tsx`; keduanya dicoba digabung berurutan di worktree terpisah: nol
konflik, dan `tsc` pada hasil gabungannya tidak menemukan galat dari kedua
perubahan.

## Catatan untuk yang melanjutkan

**Deductible lama perlu dipindah tangan per slip.** Data seed berisi 16 baris
di 8 slip; di database lokal tinggal 14 di 7 karena satu slip sudah dipindah
saat pengujian. Data demo kemungkinan 16 di 8, karena berasal dari seed yang
sama.

**Seed masih memakai deductible per section** (`lib/data/slips.ts`), jadi
database baru akan menampilkan kotak deductible lama. Belum diubah supaya
branch ini tidak sekaligus mengarang deductible per cover untuk data contoh.

**Galat simpan slip menampilkan pesan Prisma mentah.** Saat dev server masih
memakai client lama, toast "Gagal menyimpan slip" menampilkan seluruh
pemanggilan `createMany` — termasuk path berkas server dan isi datanya. Itu
perilaku `handleSave` yang sudah ada sebelum branch ini; perlu disaring jadi
pesan umum di branch tersendiri.

**Ada selisih lama antara skema dan database lokal** pada foreign key
`users_role_id_fkey` (aturan `ON DELETE`). Sudah ada di `main` sebelum branch
ini dan tidak disentuh.

**Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin ini.
