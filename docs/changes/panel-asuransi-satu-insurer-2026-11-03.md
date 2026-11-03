# Panel asuransi: satu asuransi 100% tanpa leader atau member

- **Tanggal:** 2026-11-03
- **Branch:** `fix/panel-asuransi-satu-insurer`
- **PR:** [#97](https://github.com/agussusanto17/lch-ins/pull/97)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Permintaan 3 November 2026 (Request & Temuan REQ-016) untuk Security (panel
asuransi):

- kalau satu asuransi memegang 100%, tidak ada leader atau member;
- di print out, judul kolom "Insurer" (nama asuransi) dan "Role" tidak perlu
  dicetak;
- share 100% tidak perlu dicetak. As Leader dan As Member baru muncul kalau
  asuransinya lebih dari satu.

## Yang berubah

- **Form Draft Quotation:** pilihan dan judul kolom Role hanya tampil kalau
  panel berisi lebih dari satu asuransi. Batang share asuransi tunggal tidak
  bertuliskan "Leader".
- **Validasi panel:** syarat "tepat satu leader" hanya berlaku untuk dua
  asuransi atau lebih.
- **Data:** asuransi tunggal tetap disimpan sebagai leader, supaya urutan tanda
  tangan dan data peran konsisten, walaupun perannya tidak ditampilkan.
- **Blok SECURITY di dokumen** (Quotation Slip dan Closing Instruction): tanpa
  baris judul kolom. Asuransi tunggal hanya dicetak namanya. Lebih dari satu
  asuransi dicetak nama, share, dan As Leader atau As Member.
- **Tanda tangan per asuransi** di Cover Note dan Closing Instruction mengikuti
  aturan yang sama: baris "As Leader · 100,00%" tidak dicetak untuk asuransi
  tunggal.

## File utama

- `components/underwriting/quotation-draft-form.tsx`: `panelIssues`, kolom
  Role, batang share, dan normalisasi peran saat disimpan.
- `components/documents/doc-blocks.tsx`: `SecurityPanelBlock` dan
  `InsurerSignature`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Dokumen Quotation Slip dan Cover Note dirender lewat skrip:

  | Kondisi | Sebelum | Sesudah |
  |---|---|---|
  | SECURITY, 1 asuransi 100% | judul "Insurer Share Role", lalu nama, 100,00%, As Leader | nama asuransi saja |
  | SECURITY, 2 asuransi 60/40 | dengan judul kolom | tanpa judul, nama, share, dan peran tetap dicetak |
  | Tanda tangan Cover Note, 1 asuransi | "As Leader · 100,00%" | tidak dicetak |

- `panelIssues`: satu asuransi 100% berperan member sekarang lolos; dua
  asuransi tanpa leader tetap ditolak.
- Form Draft Quotation dirender dengan komponen asli dan CSS hasil build untuk
  satu dan dua asuransi. Kolom Role hanya muncul pada dua asuransi.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Halaman Draft Quotation akan diganti menjadi form seperti Placing Slip
  dengan bagian Subjectivity dan Security di bawah Brokerage. Logika panel di
  sini perlu ikut dipindah ke sana.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
