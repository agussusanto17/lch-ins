# LCH Insurance Brokers — Revamp (Next.js)

Rebuild aplikasi internal PT. LCH Insurance Brokers dari prototipe base44 ke stack production.

**Status saat ini: pindah bertahap ke database.** Skema Prisma lengkap (44 tabel) dan seed master data
sudah jalan. Master Clauses sudah baca tulis ke Postgres. Layar lain masih memakai data statis di
`lib/data/*` dan akan dipindah menyusul.

## Stack

| Layer     | Pilihan                                                          |
| --------- | ---------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, React 19, TypeScript)                    |
| Styling   | Tailwind CSS v4                                                  |
| Komponen  | shadcn/ui — style **Luma**, primitives **Base UI** (bukan Radix) |
| Ikon      | lucide-react                                                     |
| Chart     | Recharts (via `components/ui/chart`)                             |
| Rich text | TipTap 3 (`@tiptap/react` + StarterKit)                          |
| Font      | Inter                                                            |

> Base UI memakai prop `render={<X />}` untuk komposisi, **bukan** `asChild` ala Radix.
> `Select` juga wajib menerima prop `items` di root.

## Jalankan

```bash
npm install
```

```bash
cp .env.example .env
```

Isi `DATABASE_URL` di `.env`, lalu siapkan databasenya:

```bash
createdb lch_dev && npm run db:deploy && npm run db:seed
```

```bash
npm run dev
```

Perintah lain: `npm run build` · `npm run typecheck` · `npm run lint` · `npm run shots` (screenshot semua halaman ke `./shots`).

## Database

PostgreSQL lewat Prisma 7. Skema ada di [`prisma/schema.prisma`](prisma/schema.prisma), diturunkan dari
ERD di Notion: 44 tabel, 9 enum, 94 foreign key.

| Perintah             | Kegunaan                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| `npm run db:deploy`  | Terapkan migrasi yang sudah ada. Dipakai di server dan saat setup pertama |
| `npm run db:migrate` | Buat migrasi baru sesudah mengubah schema. Interaktif, hanya untuk dev    |
| `npm run db:seed`    | Isi master data. Idempotent, aman diulang. Bisa per bagian: `-- clauses` |
| `npm run db:studio`  | Prisma Studio                                                             |
| `npm run db:reset`   | Kosongkan database lalu migrate dan seed ulang                            |

### Isi seed

Sumbernya ada di `prisma/seed-data`, semuanya data asli LCH dan SE OJK, bukan contoh karangan.

| Tabel                                               | Baris      | Asal                                                       |
| --------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `lookup_values`                                     | 74         | 21 `lookup_type`, yang dipakai logika ditandai `is_system` |
| `currencies` · `document_types` · `company_profile` | 4 · 8 · 1  | pola nomor dokumen dan kop surat LCH                       |
| `classes_of_business` · `cover_types`               | 9 · 47     | `LIST COB DAN TOC.xlsx` dari LCH, sheet FIX                |
| `cob_rate_lines`                                    | 19         | baris rate bawaan Property dan Motor                       |
| `occupations` · `tariff_occupation`                 | 369 · 1031 | SE OJK Lampiran I                                          |
| `eq_zones`                                          | 511        | Lampiran III Tabel III.D                                   |
| `tariff_eq_property` · `tariff_flood`               | 25 · 14    |                                                            |
| `tariff_motor` · `tariff_motor_extension`           | 48 · 22    | Lampiran II                                                |
| `bi_scales`                                         | 14         |                                                            |
| `clauses`                                           | 595        | pustaka wording LCH                                        |

Seed tidak menimpa data yang sudah ada, termasuk wording clause yang diedit lewat Master Clauses.
Bagian seed: `system`, `cob`, `occupations`, `tariffs`, `clauses`, misalnya `npm run db:seed -- clauses`.
Seed penuh ke database cloud memakan beberapa menit karena sebagian besar tabel masih di-upsert per
baris (satu perjalanan jaringan per baris); clause sudah dikirim sekaligus dan selesai dalam hitungan detik.
Belum di-seed karena datanya masih ditunggu dari LCH: `insurers`, `adjusters`, `wording_forms`,
`coa_accounts`, `bank_accounts`. `users` menyusul bersama modul autentikasi.

Seed juga melaporkan dua hal yang perlu dicek ke LCH: 12 klausul yang wordingnya kosong di file mereka,
dan kode okupasi `23001` yang di lampiran OJK dipakai dua okupasi berbeda (flammable dan non flammable)
dengan tarif berbeda — kemungkinan salah baca saat ekstraksi PDF.

### Catatan Prisma 7

Beda dari Prisma 6, mudah bikin bingung kalau belum tahu:

- Connection string **tidak** ditulis di `schema.prisma`, tapi di [`prisma.config.ts`](prisma.config.ts).
- Prisma CLI tidak memuat `.env` sendiri seperti Next.js, jadi config memanggil `process.loadEnvFile`.
- Wajib memakai driver adapter. Client dipegang [`lib/prisma.ts`](lib/prisma.ts) lewat `PrismaPg`, dibuat
  saat pertama dipakai supaya build tanpa `DATABASE_URL` tetap jalan.
- Client hasil generate ada di `lib/generated` dan tidak ikut di-commit. `postinstall` menjalankan
  `prisma generate`.
- `prisma migrate dev` menolak jalan di lingkungan non-interaktif. Untuk server pakai `db:deploy`.

Penomoran dokumen wajib mengunci baris `number_counters` dengan `$queryRaw ... FOR UPDATE` di dalam
`$transaction`. Prisma tidak punya API `FOR UPDATE`, dan `findUnique` lalu `update` tidak aman karena
dua request bersamaan bisa dapat nomor yang sama. Alasannya ditulis lengkap di komentar model
`NumberCounter`.

## Peta Route

| Route                               | Isi                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/`                                 | Dashboard — 4 KPI, chart produksi bulanan, donut class of business, renewal 60 hari, akses cepat |
| `/marketing`                        | Tab Database Klien + Renewal Notice, modal Tambah Klien                                          |
| `/underwriting`                     | List placing slip + filter COB/status                                                            |
| `/underwriting/new`                 | Form placing slip baru (dinamis per COB)                                                         |
| `/underwriting/edit/[id]`           | Edit placing slip + tombol Release                                                               |
| `/underwriting/quotation/edit/[id]` | Draft quotation slip — subjectivity, panel co-insurance, closing instruction                     |
| `/underwriting/slip/[id]`           | Dokumen **Placing Slip** (A4, print-ready)                                                       |
| `/underwriting/quotation/[id]`      | Dokumen **Quotation Slip** — untuk klien, brokerage disembunyikan                                |
| `/underwriting/cover-note/[id]`     | Dokumen **Cover Note**                                                                           |
| `/underwriting/closing/[id]`        | Dokumen **Closing Instruction** — satu-satunya yang menampilkan Net Premium after Brokerage      |
| `/underwriting/master-clauses`      | Pustaka 595 klausula LCH dari database — cari, filter kelompok produk dan COB, paginasi          |
| `/underwriting/master-clauses/new`  | Form clause baru — halaman penuh, rich text editor, simpan ke database                           |
| `/underwriting/master-clauses/[id]` | Edit dan hapus clause                                                                            |
| `/policies`                         | Policy database, tab Semua/Baru/Renewal, kolom softcopy                                          |
| `/claims`                           | Klaim — tabel ringkas + detail drawer                                                            |
| `/reports`                          | Report periodik, 3 tab breakdown                                                                 |
| `*`                                 | 404                                                                                              |

## Bahasa visual

Genre **modern-minimal** (Stripe / Linear school) diterapkan lewat token, bukan utility ad-hoc:

| Aspek          | Keputusan                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Kanvas         | Konten **putih murni**, chrome (sidebar) **abu-abu muda** — hierarki dibentuk oleh permukaan, bukan bayangan                       |
| Elevasi        | **Tanpa shadow** pada card. Pemisah = border hairline `--border` + perbedaan permukaan                                             |
| Radius         | Permukaan 12px · kontrol 8px · tombol pill · badge 6px                                                                             |
| Aksen          | Satu warna (biru LCH) dengan porsi < 3% layar — dipakai untuk state aktif, angka kunci, dan focus ring                             |
| Tabel          | Header micro-caps abu-abu, baris hairline, **kolom aksi di paling kiri** agar posisinya tetap saat tabel melebar                   |
| Form entri     | **Drawer samping** (klien, polis, klaim) — konteks tabel tetap terlihat. Form panjang (placing slip, clause) dapat halaman sendiri |
| Wording clause | **Rich text editor** (TipTap) — output HTML, disanitasi allowlist sebelum dirender                                                 |
| Status         | Chip low-contrast + dot berwarna, bukan blok warna solid                                                                           |
| Chrome sticky  | Topbar, toolbar slip, dan action bar menempel; offset diatur token `--topbar-h` / `--subbar-h`                                     |
| Form panjang   | Tiap section bisa dilipat, dengan ringkasan yang tetap terbaca saat tertutup + tombol Buka/Tutup semua                             |

## Yang berubah dari versi base44

1. **Tabel Klaim: 17 kolom → 6 kolom + detail drawer.** Sisanya (timeline, deskripsi kerugian,
   adjuster, catatan) pindah ke panel samping. Tidak ada lagi horizontal scroll.
2. **Format tanggal distandarkan** ke `dd MMM yyyy` di seluruh aplikasi
   (sebelumnya Policy Database `dd/mm/yy`, Underwriting `dd MMM yyyy`).
3. **Nomor cover note punya generator.** Format usulan: `{seq}/LCH-PLCMT/CN[-{kode}]/{bulan romawi}/{tahun}`,
   sejajar dengan PS dan CI. Di aplikasi lama nomor ini dibiarkan kosong — **perlu dikonfirmasi ke user**.
4. **Draft Quotation Slip punya entry point.** Sebelumnya halaman ini tidak bisa diakses dari UI mana pun;
   sekarang muncul di row action list underwriting dan sebagai CTA di slip yang sudah Released.
5. **Panel co-insurance divisualkan** — bar share per insurer + validasi total harus 100%.
6. **Rate & Premium reaktif.** Ubah rate atau sum insured, premium dan total payable langsung terhitung.
   Panel Referensi Tarif OJK bisa diklik untuk mengisi field rate.
7. **Global search (⌘K)**, breakpoint responsif, dark mode, dan sidebar collapsible.
8. **Data dummy realistis** (bukan nol) supaya chart dan tabel bisa dinilai secara visual.
9. **Bahasa visual dirombak** — lihat tabel di atas.

## Aturan hitung (dipakai di form & dokumen)

```
Total Premium   = Σ rate lines + Σ TPL + Σ PA
Discount        = Total Premium × discount%
Total Payable   = Total Premium − Discount + Admin Cost + Stamp Duty
Brokerage       = Total Premium × brokerage%
Net Premium     = Total Premium − Brokerage          (hanya di Closing Instruction)
Effective Brok. = brokerage% ÷ 1,11 bila Include VAT
```

Basis rate: **Property & COB lain → per mil (‰)**, **Motor Vehicle → persen (%)**.
Untuk Property, baris `BI PAR` dan `BI EQVET` dihitung dari Sum Insured Section 2, sisanya dari Section 1.

## Struktur

```
app/
  (app)/          layar dengan sidebar
  (print)/        dokumen A4, tanpa sidebar
components/
  layout/         sidebar, topbar, command menu
  shared/         StatCard, StatusBadge, toolbar tabel
  underwriting/   form placing slip + sub-komponennya
  documents/      blok penyusun dokumen cetak
lib/
  data/           mock data (types, clients, slips, policies, claims, clauses, analytics)
  calc.ts         rumus premium & brokerage
  format.ts       format angka, mata uang, tanggal, nomor slip
```

## Langkah berikutnya

Master Clauses sudah jadi contoh pola pindahnya: query di `lib/server/*`, halaman jadi Server Component,
perubahan lewat Server Action, filter disimpan di URL. Lihat [`lib/server/clauses.ts`](lib/server/clauses.ts)
dan `app/(app)/underwriting/master-clauses/`.

Sisanya masih memakai `lib/data/*`, urutan yang masuk akal:

1. **Master data** — COB, type of cover, okupasi, tarif OJK, semuanya sudah ada di database.
2. **Placing slip** — sekalian memindahkan pemilih klausula dan dokumen cetaknya, yang masih membaca
   `lib/data/clauses.ts`.
3. **Marketing, polis, klaim.**

Belum diputuskan: auth dan role, penyimpanan file softcopy polis, dan apakah PDF digenerate di server
atau tetap lewat print browser.

### Serah terima infrastruktur

Database dan deployment dipegang Adi. Yang perlu disiapkan di akunnya:

1. **Database.** Prisma Postgres dari integrasi Vercel (prefix `lch_`). Migrasi dan seed sudah
   dijalankan ke sana: 44 tabel, master data, dan 595 clause. Untuk database lain, jalankan
   `db:deploy` lalu `db:seed` dengan `DATABASE_URL` menunjuk ke database itu.
2. **Deployment.** Project Vercel dari repo ini dengan integrasi Prisma Postgres tersambung untuk
   Production, Preview, dan Development. Integrasi membuat `lch_POSTGRES_URL`, dan
   [`lib/database-url.ts`](lib/database-url.ts) membacanya bila `DATABASE_URL` kosong, jadi
   `DATABASE_URL` tidak wajib diisi di Vercel. Tanpa salah satunya build tetap lolos, tapi halaman
   Master Clauses error saat dibuka.

Connection string berisi password. Simpan hanya di `.env` lokal (di-ignore git) dan Environment
Variables Vercel, jangan di kode atau chat. Bila sempat tersebar, rotate dari dashboard Prisma.

Project Vercel lama di akun Agus dihapus, jadi URL demo akan berganti mengikuti project baru Adi.
Perbarui tautannya di PRD Notion bagian Referensi setelah URL barunya ada, karena LCH memakai tautan
itu untuk melihat prototipe.

`prisma.config.ts` belum mengatur `shadowDatabaseUrl`. Perlu diisi kalau `db:migrate` dijalankan ke
database yang tidak boleh dibuat-hapus sembarangan.

**Catatan keamanan.** Wording clause disimpan sebagai HTML. [`lib/sanitize.ts`](lib/sanitize.ts) menyaring dengan
allowlist saat render, tapi itu pertahanan lapis kedua — saat backend jadi, sanitasi wajib dilakukan di server
dengan pustaka matang (DOMPurify / sanitize-html) sebelum wording disimpan.
