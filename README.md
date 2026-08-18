# LCH Insurance Brokers — Revamp (Next.js)

Rebuild aplikasi internal PT. LCH Insurance Brokers dari prototipe base44 ke stack production.
**Status saat ini: static prototype** — semua layar sudah jalan penuh dengan data dummy realistis,
belum ada database/API. Ditujukan untuk presentasi & validasi alur sebelum masuk fase backend.

## Stack

| Layer | Pilihan |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4 |
| Komponen | shadcn/ui — style **Luma**, primitives **Base UI** (bukan Radix) |
| Ikon | lucide-react |
| Chart | Recharts (via `components/ui/chart`) |
| Font | Inter |

> Base UI memakai prop `render={<X />}` untuk komposisi, **bukan** `asChild` ala Radix.
> `Select` juga wajib menerima prop `items` di root.

## Jalankan

```bash
npm install
```

```bash
npm run dev
```

Perintah lain: `npm run build` · `npm run typecheck` · `npm run lint` · `npm run shots` (screenshot semua halaman ke `./shots`).

## Peta Route

| Route | Isi |
| --- | --- |
| `/` | Dashboard — 4 KPI, chart produksi bulanan, donut class of business, renewal 60 hari, akses cepat |
| `/marketing` | Tab Database Klien + Renewal Notice, modal Tambah Klien |
| `/underwriting` | List placing slip + filter COB/status |
| `/underwriting/new` | Form placing slip baru (dinamis per COB) |
| `/underwriting/edit/[id]` | Edit placing slip + tombol Release |
| `/underwriting/quotation/edit/[id]` | Draft quotation slip — subjectivity, panel co-insurance, closing instruction |
| `/underwriting/slip/[id]` | Dokumen **Placing Slip** (A4, print-ready) |
| `/underwriting/quotation/[id]` | Dokumen **Quotation Slip** — untuk klien, brokerage disembunyikan |
| `/underwriting/cover-note/[id]` | Dokumen **Cover Note** |
| `/underwriting/closing/[id]` | Dokumen **Closing Instruction** — satu-satunya yang menampilkan Net Premium after Brokerage |
| `/underwriting/master-clauses` | Pustaka 30 klausula + filter + form tambah inline |
| `/policies` | Policy database, tab Semua/Baru/Renewal, kolom softcopy |
| `/claims` | Klaim — tabel ringkas + detail drawer |
| `/reports` | Report periodik, 3 tab breakdown |
| `*` | 404 |

## Bahasa visual

Genre **modern-minimal** (Stripe / Linear school) diterapkan lewat token, bukan utility ad-hoc:

| Aspek | Keputusan |
| --- | --- |
| Kanvas | Konten **putih murni**, chrome (sidebar) **abu-abu muda** — hierarki dibentuk oleh permukaan, bukan bayangan |
| Elevasi | **Tanpa shadow** pada card. Pemisah = border hairline `--border` + perbedaan permukaan |
| Radius | Permukaan 12px · kontrol 8px · tombol pill · badge 6px |
| Aksen | Satu warna (biru LCH) dengan porsi < 3% layar — dipakai untuk state aktif, angka kunci, dan focus ring |
| Tabel | Header micro-caps abu-abu, baris hairline, **kolom aksi di paling kiri** agar posisinya tetap saat tabel melebar |
| Form entri | **Drawer samping**, bukan modal — konteks tabel tetap terlihat dan form panjang punya ruang |
| Status | Chip low-contrast + dot berwarna, bukan blok warna solid |
| Chrome sticky | Topbar, toolbar slip, dan action bar menempel; offset diatur token `--topbar-h` / `--subbar-h` |
| Form panjang | Tiap section bisa dilipat, dengan ringkasan yang tetap terbaca saat tertutup + tombol Buka/Tutup semua |

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

## Langkah berikutnya (fase backend)

Data sekarang di-`import` langsung dari `lib/data/*`. Untuk beralih ke database, ganti pemanggilan itu
dengan query di Server Component — tipe di `lib/data/types.ts` sudah bisa dipakai langsung sebagai skema.
Yang perlu diputuskan: database (Postgres/Supabase), auth & role, penyimpanan file softcopy polis,
dan apakah generate PDF dilakukan di server atau tetap lewat print browser.
