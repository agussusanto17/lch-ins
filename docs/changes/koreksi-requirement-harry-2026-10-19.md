# Koreksi requirement dari Harry: status klaim, FWTWD, dan PPN brokerage

- **Tanggal:** 2026-10-19
- **Branch:** `fix/req-harry-klaim-fwtwd-ppn`
- **PR:** #11 (sudah di-merge)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

> Catatan ini ditulis setelah PR-nya di-merge, jadi melanggar aturan Wajib nomor 3
> yang mensyaratkan catatan dibuat di branch yang sama. Ditulis susulan supaya
> riwayatnya tidak bolong. Kekurangan lain pada PR itu: `npm run build` dan
> `graphify update .` tidak dijalankan sebelum push.

## Latar belakang

Harry mengirim catatan lewat WhatsApp tanggal 5 Oktober 2026 berisi empat koreksi
atas prototipe. Tiga di antaranya menyangkut perilaku sistem dan dikerjakan di PR
ini. Dua koreksi membatalkan apa yang sebelumnya sudah masuk kode, karena dokumen
Daftar Konfirmasi LCH Team dijawab 15 September dan catatan WhatsApp itu lebih
baru.

## Yang berubah

- **Status klaim dipecah menjadi dua kolom yang berjalan sendiri-sendiri.** Kolom
  status berisi Outstanding, Settled, Closed, dan Rejected. Kolom tahapan berisi
  Tunggu Dokumen, Dokumen Belum Lengkap, Dokumen Lengkap, Proses Adjuster, dan
  SPK / SPGR terbit. Sebelumnya kesepuluh nilai itu menumpuk di satu kolom.
- **Daftar klaim punya filter tahapan** tepat di samping filter status, sesuai
  permintaan Harry. Di tabel, tahapan tampil sebagai baris kecil di bawah badge
  status supaya tidak menambah kolom.
- **Validasi klaim menyesuaikan.** Syarat tanggal SPK sekarang menempel pada
  tahapan SPK / SPGR terbit, bukan pada status. Syarat jumlah dibayar menempel
  pada status Settled, menggantikan status Paid yang dihapus.
- **Baris rate "Banjir (Flood)" dihapus.** FWTWD sudah mencakup flood, windstorm,
  dan water damage, jadi baris terpisah itu dobel. Tarif banjir dari tabel OJK
  sekarang mengisi baris FWTWD.
- **PPN atas brokerage dikoreksi dari 11% menjadi 2,2%.** Jasa pialang asuransi
  memakai DPP nilai lain 20% dari komisi menurut PMK 67/PMK.03/2022, sehingga
  tarif efektifnya 11% x 20% = 2,2%. Brokerage efektif dibagi 1,022, bukan 1,11.

## File utama

- `lib/data/types.ts`: `ClaimStatus` dipangkas jadi empat nilai, `ClaimStage` baru.
- `lib/data/reference.ts`: `CLAIM_STATUSES`, `CLAIM_STAGES`, dan `OPEN_CLAIM_STATUSES`.
- `components/claims/claims-view.tsx`: filter tahapan dan tampilan di tabel.
- `components/claims/claim-form.tsx`: isian tahapan dan aturan validasinya.
- `lib/calc.ts`: konstanta `BROKERAGE_VAT_RATE` dan `effectiveBrokeragePct`.
- `components/underwriting/ojk-panels.tsx`: tarif banjir OJK mengisi baris FWTWD.
- `prisma/schema.prisma`: kolom `stage_id` pada `claims`, lookup `claim_stage`.

## Dampak

- **Database:** `claims` dapat kolom `stage_id` yang nullable dan lookup
  `claim_stage` yang baru. **Migration-nya tidak ikut di PR ini** dan menyusul di
  catatan `migrasi-claim-stage-2026-10-19.md`.
- **Env:** tidak ada.
- **Deploy:** setelah merge, fork `vourdev/lch-ins` perlu disinkronkan supaya demo
  ikut terbaru.

## Verifikasi

`npx tsc --noEmit`, `npm run lint`, dan `npx prisma validate` lolos. Diperiksa
langsung di dev server: filter tahapan menyaring 2 dari 9 klaim pada Proses
Adjuster, tabel cover tampil tanpa baris Banjir, dan brokerage 12,5% dengan VAT
aktif menghasilkan 12,2309%.

## Catatan untuk yang melanjutkan

Dua hal masih menunggu jawaban LCH dan ditulis di dokumen Daftar Konfirmasi LCH
Team:

- Kalau status sudah Settled, Closed, atau Rejected, apakah tahapan dokumennya
  dikunci di nilai terakhir atau masih boleh diubah.
- Angka pada baris FWTWD itu tarif banjir saja atau gabungan flood, windstorm, dan
  water damage.

Branch ini lahir dari `main` yang sudah ketinggalan, sehingga sempat bentrok dengan
"Frontend sesuai PRD" dan "Database Vercel". Penyelesaiannya: semua file yang
bentrok diambil dari `main`, lalu ketiga koreksi diterapkan ulang di struktur baru.
Pelajarannya, jalankan `git switch main && git pull --ff-only` tepat sebelum
membuat branch, bukan mengandalkan `main` lokal yang sudah lama.
