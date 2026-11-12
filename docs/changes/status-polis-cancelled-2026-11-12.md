# Status Cancelled untuk polis yang sudah dibatalkan

- **Tanggal:** 2026-11-12
- **Branch:** `fix/status-polis-cancelled`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Celah ini ditemukan 12 November 2026 saat capture evidence cancellation slip (#221). Status polis di Policy Database dihitung hanya dari tanggal berakhir (`policyStatus(expiryDate, today)`, PRD A-17): Active, Expiring, atau Expired. Akibatnya:

- Polis induk yang sudah punya record Cancellation tetap tampil Active. Record itu dibuat manual lewat form Policy Database, atau otomatis saat Cancellation Slip di Placement ditutup (`recordEndorsementFromSlip`).
- Polis itu tetap masuk Renewal Notice. `renewalCandidates` hanya mengecualikan record bertipe Endorsement dan Cancellation, bukan polis induk yang sudah dibatalkan.
- Daftar polis akan berakhir di topbar tidak memfilter tipe sama sekali. Polis yang dibatalkan ikut tampil, begitu juga record Endorsement dan Cancellation-nya.

Perubahan ini melengkapi PRD A-17. Status tetap dihitung dari tanggal berakhir dan tidak disimpan. Polis yang sudah punya record Cancellation mendapat status keempat, Cancelled.

## Yang berubah

- **Status Cancelled** tampil sebagai "Dibatalkan", label yang sama dengan slip yang dibatalkan.
  - Berlaku untuk polis asal yang punya record Cancellation, beserta endorsement dan record pembatalannya, apa pun tanggal berakhirnya.
  - Polis asal dicari dengan naik ke polis induk selama polisnya endorsement atau pembatalan. Aturannya sama dengan pemilik daftar peserta (`rosterPolicy`), karena form Policy Database boleh memilih endorsement sebagai "Polis yang Dibatalkan".
  - Dihitung server dari record Endorsement dan Cancellation di seluruh tabel (`loadCancelledPolicies`), lalu dibawa sebagai `cancelled` di setiap polis. Policy Database, Renewal Notice, detail klien, Report, dan Dashboard membaca hasil yang sama.
  - `policyStatus` sekarang menerima polisnya, bukan hanya tanggal berakhir, jadi pemakai yang lupa status batal ketahuan saat `tsc`.
- **Policy Database:**
  - kolom Status, filter status (pilihan baru "Dibatalkan"), dan export memakai status baru;
  - menu **Buat renewal** dan **Buat endorsement** tidak muncul untuk polis yang dibatalkan;
  - pilihan polis induk di form tidak memuat polis yang dibatalkan, kecuali induk yang tersimpan pada record yang sedang diedit.
- **Server menolak** renewal, endorsement, atau pembatalan baru atas polis yang sudah dibatalkan, dengan pesan "Polis yang dipilih sudah dibatalkan (no. pembatalan)". Record lama, termasuk pembatalannya sendiri, tetap bisa diedit selama induknya tidak diganti.
- **Placement:** pengecekan "Polis ini sudah dibatalkan" saat membuat endorsement atau cancellation slip memakai aturan yang sama. Pembatalan manual yang menunjuk endorsement polis itu sekarang ikut terhitung; sebelumnya hanya pembatalan yang langsung menunjuk polis asal.
- **Renewal Notice** (layar, cetak daftar, dan surat per polis) tidak memuat polis yang dibatalkan. Surat untuk polis yang dibatalkan, atau untuk record endorsement dan pembatalan, menjawab 404.
- **Dashboard:**
  - Polis Aktif, Total Premium, dan porsi premium per COB tidak menghitung polis yang dibatalkan. Sebelumnya polis aktif adalah semua polis yang belum Expired.
  - Widget Renewal Mendatang (60 hari) memakai `renewalCandidates`, sama dengan Renewal Notice yang dibuka lewat "Lihat semua". Sebelumnya widget itu juga memuat record endorsement dan pembatalan. `upcomingRenewals` dihapus karena tidak dipakai lagi.
- **Topbar:** daftar polis akan berakhir hanya memuat polis Baru dan Renewal yang belum dibatalkan.

## File utama

- `lib/data/policy-status.ts`: `policyStatus` menerima polis; `cancelledPolicies` menelusuri polis asal setiap record Cancellation.
- `lib/data/types.ts`: `PolicyStatus` bertambah Cancelled; `Policy.cancelled`.
- `lib/server/cancelled-policies.ts` (baru): `loadCancelledPolicies`, dipakai `policies.ts`, `placing-slips.ts`, dan `topbar.ts`.
- `lib/server/policies.ts`: flag `cancelled` di semua daftar dan pembacaan polis; penolakan induk yang sudah dibatalkan.
- `lib/server/placing-slips.ts`: cek polis batal di `createEndorsementSlip`.
- `lib/server/topbar.ts`: filter tipe dan polis batal.
- `lib/renewal.ts`: `isRenewable`, dipakai `renewalCandidates`, menu Policy Database, dan surat renewal.
- `lib/data/analytics.ts`: `inForcePolicies` hanya Active dan Expiring.
- `components/policies/policy-database.tsx`, `components/policies/policy-form.tsx`, `components/marketing/renewal-notice.tsx`, `components/marketing/client-detail.tsx`, `components/reports/report-view.tsx`, `components/dashboard/dashboard-view.tsx`, `app/(print)/marketing/renewal/[id]/page.tsx`
- `tests/policy-status.test.ts`, `tests/renewal.test.ts` (baru, 10 tes)

## Dampak

- **Database:** tidak ada migrasi. Setiap kali polis dimuat ada satu query ringan tambahan yang hanya membaca record Endorsement dan Cancellation.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint app components lib tests next.config.ts --quiet`, `npx tsx --test tests/*.test.ts` (204 tes, termasuk 10 tes baru), dan `npm run build`: lolos.
- **Uji lokal** di database lokal dengan sesi sementara user Admin LCH. Data uji: polis Baru `UJI-CXL/2026/001` (berakhir 12 Desember 2026, 30 hari lagi), endorsement `-END1`, dan pembatalan `-CANCEL` yang menunjuk endorsement, dibuat lewat `createPolicy`.
  - **Server:** ketiga record bertanda batal dengan no. pembatalan `-CANCEL`. Pembatalan kedua, endorsement baru atas `-END1`, dan renewal polis itu ditolak dengan pesan di atas. Edit remarks pembatalan tanpa mengganti induk tetap tersimpan.
  - **Policy Database:** ketiga record berstatus Dibatalkan, dan filter "Dibatalkan" menampilkan tepat ketiganya. Menu polis induk tinggal Edit polis, Berkas polis, dan Hapus. Polis SIT yang tidak batal tetap punya Buat renewal dan Buat endorsement. Form Tambah Polis tipe Cancellation tidak menemukan `UJI-CXL`, sedangkan form edit pembatalan tetap menampilkan induknya (`-END1`).
  - **Renewal Notice 90 hari:** tiga polis (SIT/MOP/DECL/001, SIT/MOP/DECL/002, MV/FLT/2026/0088), tanpa `UJI-CXL`. Cetak daftar sama. Surat `UJI-CXL/2026/001` menjawab 404, surat SIT/MOP/DECL/001 tetap tampil.
  - **Dashboard:** Polis Aktif 12, yaitu 15 polis yang belum berakhir dikurangi 3 record batal. Renewal Mendatang hanya memuat dua polis SIT.
  - **Topbar:** dua notifikasi polis jatuh tempo (SIT, 20 dan 28 Desember), tanpa `UJI-CXL`.
  - **Report:** `-END1` dan `-CANCEL` berstatus Dibatalkan. Angka produksi tidak berubah.
  - Tidak ada error di log server. Data uji (3 polis, 4 audit log, 1 sesi) dihapus per id dari snapshot sebelum uji. Jumlah baris semua tabel sama dengan sebelum uji, kecuali satu sesi milik proses lain: dev server `lch-app-kunci-revisi` di port 3001 berjalan bersamaan dengan uji dan memakai database yang sama.

## Catatan untuk yang melanjutkan

- **Asumsi:** status Cancelled berlaku begitu record Cancellation ada, walau tanggal efektifnya masih di depan. Kalau LCH ingin polis tetap Active sampai tanggal efektif, bandingkan `inceptionDate` record Cancellation dengan hari ini di `cancelledPolicies`.
- **Endorsement dan record pembatalan ikut berstatus Cancelled.** Tanpa itu, Dashboard menghitung refund pembatalan tanpa premi polis asalnya, dan filter Active masih memuat endorsement polis yang sudah batal.
- **Report produksi tidak berubah.** Produksi dihitung dari tanggal mulai, jadi premi polis asal dan refund pembatalan tetap tercatat; hanya label statusnya yang berubah.
- **Klaim tetap bisa dicatat** untuk polis yang dibatalkan, karena kejadian sebelum tanggal pembatalan tetap dijamin.
- **Menghapus record Cancellation** mengembalikan polis ke status dari tanggal berakhir, karena status tidak disimpan.
- Menu Buat endorsement slip dan Buat cancellation slip di daftar Placement tetap tampil untuk slip yang polisnya sudah dibatalkan. Server menolaknya dengan pesan "Polis ini sudah dibatalkan".
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini (sama dengan #221).
