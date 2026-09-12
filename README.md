# LCH Insurance Brokers — Revamp (Next.js)

Rebuild aplikasi internal PT. LCH Insurance Brokers dari prototipe base44 ke stack production.
**Status saat ini: prototipe frontend** — semua layar jalan penuh dengan data contoh, belum tersambung
ke database/API. Tambah, ubah, dan hapus data tersimpan di store sesi (`lib/store.ts`) sehingga
tabel, halaman detail, dan dokumen cetak ikut berubah selama tab browser terbuka; data kembali ke
contoh awal saat halaman dimuat ulang. Di fase backend, fungsi `store.*` diganti Server Action.

## Stack

| Layer | Pilihan |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4 |
| Komponen | shadcn/ui — style **Luma**, primitives **Base UI** (bukan Radix) |
| Ikon | lucide-react |
| Chart | Recharts (via `components/ui/chart`) |
| Rich text | TipTap 3 (`@tiptap/react` + StarterKit) |
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
| `/marketing` | Tab Database Klien (form KYC), SPPA, dan Renewal Notice |
| `/marketing/clients/[id]` | Detail klien — KYC, alamat, berkas, SPPA, slip, polis, klaim |
| `/underwriting` | List placing slip + filter COB/status, hapus draft, batalkan slip bernomor |
| `/underwriting/new` | Form placing slip baru; `?sppa=` atau `?client=` untuk mengisi otomatis |
| `/underwriting/edit/[id]` | Edit placing slip + validasi dan Release |
| `/underwriting/quotation/edit/[id]` | Draft quotation slip — subjectivity, panel co-insurance, closing instruction |
| `/underwriting/slip/[id]` | Dokumen **Placing Slip** (A4, print-ready) |
| `/underwriting/quotation/[id]` | Dokumen **Quotation Slip** — untuk klien, brokerage disembunyikan |
| `/underwriting/cover-note/[id]` | Dokumen **Cover Note** |
| `/underwriting/closing/[id]` | Dokumen **Closing Instruction** — satu-satunya yang menampilkan Net Premium after Brokerage |
| `/underwriting/master-clauses` | Pustaka 30 klausula + filter (list saja) |
| `/underwriting/master-clauses/new` | Form clause baru — halaman penuh, rich text editor |
| `/underwriting/master-clauses/[id]` | Edit clause |
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
| Form entri | **Drawer samping** (klien, polis, klaim) — konteks tabel tetap terlihat. Form panjang (placing slip, clause) dapat halaman sendiri |
| Wording clause | **Rich text editor** (TipTap) — output HTML, disanitasi allowlist sebelum dirender |
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
Semua nominal dibulatkan ke sen (`roundCents`), dan input angka memakai `components/ui/number-input.tsx`
(Base UI NumberField, format id-ID: titik ribuan, koma desimal; titik di field rate dianggap koma).
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

**Catatan keamanan.** Wording clause disimpan sebagai HTML. [`lib/sanitize.ts`](lib/sanitize.ts) menyaring dengan
allowlist saat render, tapi itu pertahanan lapis kedua — saat backend jadi, sanitasi wajib dilakukan di server
dengan pustaka matang (DOMPurify / sanitize-html) sebelum wording disimpan.
