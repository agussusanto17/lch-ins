# Peserta PA grup di polis dan endorsement

- **Tanggal:** 2026-11-06
- **Branch:** `feat/peserta-polis-endorsement`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini PR kedua dari tiga untuk pertanyaan 14. Jawaban Harry dan PR pertamanya
ada di [peserta-pa-grup-2026-11-06.md](peserta-pa-grup-2026-11-06.md). Bagian
jawaban yang dikerjakan di sini:

> jadi jika ada klaim dan endorsment bisa tambah dan kurang peserta

Urutan PR:

1. #160 menyimpan peserta di placing slip.
2. PR ini membawa daftar peserta ke polis, lalu endorsement bisa menambah dan
   mengurangi peserta.
3. PR berikutnya: klaim PA memilih peserta.

PR ini bertumpuk di atas #160, jadi #160 di-merge lebih dulu.

## Yang berubah

- **Daftar peserta polis:**
  - Polis Baru atau Renewal yang dibuat dari slip menyalin peserta slip.
    Peserta mulai dijamin pada tanggal mulai polis.
  - Setiap peserta menyimpan tanggal mulai dan tanggal berhenti dijamin,
    beserta endorsement yang menambah atau menguranginya.
  - Daftar milik polis asal. Endorsement tidak punya daftar sendiri, tetapi
    mengubah daftar polis asalnya. Ini tetap berlaku walaupun polis induk
    yang dipilih adalah endorsement lain.
- **Database Polis, polis General Accident:** aksi baris **Peserta (n)**
  membuka daftar peserta.
  - Ringkasan peserta aktif, total UP, dan jumlah peserta yang berhenti.
  - Pencarian dan 25 baris per halaman.
  - Status per peserta: "Aktif sejak", atau "Berhenti" dengan nomor
    endorsement.
  - Unduh Excel dengan tanggal mulai, tanggal berhenti, dan nomor endorsement.
  - Pengguna view-only juga bisa membuka daftar ini.
  - Di baris endorsement, daftar yang tampil adalah daftar polis induk.
- **Form Buat Endorsement untuk polis General Accident:** bagian baru
  **Perubahan Peserta**, berlaku mulai tanggal mulai endorsement.
  - **Peserta tambahan:** editor yang sama dengan slip, termasuk template dan
    impor Excel.
  - **Peserta yang berhenti:** centang peserta aktif polis induk. Daftarnya
    10 baris per halaman dengan pencarian. Hanya peserta yang sudah dijamin
    pada tanggal endorsement yang bisa dipilih.
  - **Usulan nilai:**
    - Perubahan UP = UP peserta tambahan − UP peserta yang berhenti.
    - Premi = perubahan UP × rate polis asal × sisa hari ÷ jumlah hari
      periode.
    - Tombol **Isi Sum Insured & Premium** mengisi kedua field. Nilainya
      tetap bisa diubah manual.
- **Total Sum Insured endorsement dan pembatalan boleh negatif** untuk
  pengurangan UP, sama dengan premi dan additional fee.
  - Sebelumnya endorsement pengurangan peserta gagal disimpan karena TSI
    −25.000.000 ditolak "Sum insured tidak boleh negatif".
  - Polis Baru dan Renewal tetap ditolak kalau TSI negatif, di form dan di
    server.
- **Edit endorsement yang sudah mengubah peserta:**
  - Kalau tanggal mulainya diubah, tanggal peserta ikut bergeser.
  - Jenis polis dan polis induknya dikunci.
  - Tanggal baru ditolak kalau bentrok, yaitu peserta dikurangi sebelum ia
    mulai dijamin, atau peserta tambahan sudah berhenti sebelum tanggal itu.
- **Hapus endorsement:**
  - Peserta yang dikurangi endorsement itu aktif lagi. Peserta tambahannya
    ikut terhapus.
  - Penghapusan ditolak kalau peserta tambahannya sudah dikurangi endorsement
    lain. Endorsement pengurangan itu harus dihapus dulu.

## File utama

- `prisma/schema.prisma` dan migrasi `20261106213000_peserta_polis`: model
  `PolicyParticipant` (tabel `policy_participants`).
- `lib/policy-participants.ts`: tipe peserta polis, `participantActiveOn`,
  `endorsementSuggestion`, dan `rosterPolicy`.
- `lib/server/policies.ts`:
  - `writeParticipants` menyalin peserta dari slip, lalu menambah dan
    mengurangi peserta saat endorsement dibuat;
  - `syncParticipantChanges` menangani edit endorsement;
  - pengecekan hapus, `listPolicyParticipants`, dan `participantCount`.
- `app/(app)/policies/actions.ts`: skema `participantChanges`, aturan TSI
  negatif, dan `listPolicyParticipantsAction`.
- `components/policies/policy-participants-sheet.tsx`: sheet daftar peserta.
- `components/policies/endorsement-participants.tsx`: bagian Perubahan
  Peserta.
- `components/policies/policy-form.tsx` dan `policy-database.tsx`: tempat
  kedua komponen di atas dipasang.
- `tests/policy-participants.test.ts`.

## Dampak

- **Database:**
  - Tabel baru `policy_participants`.
  - Foreign key ke polis pemilik dan ke endorsement penambah memakai
    cascade. Foreign key ke endorsement pengurang memakai SET NULL.
  - Migrasi jalan saat build. Data lama tidak berubah.
  - Polis yang sudah ada belum punya peserta. Daftar terisi untuk polis baru
    dari slip yang punya peserta.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 91 lolos.
- `npm run build`: lolos.
- **Uji server lokal** dengan skrip sementara; data ujinya sudah dihapus.
  - Lolos: salin peserta slip ke polis, endorsement tambah dan kurang,
    pengurangan ganda ditolak, dan hapus endorsement mengembalikan daftar.
  - Edit endorsement:
    - tanggal mulai digeser ke 1 Jul 2026, lalu tanggal berhenti peserta yang
      dikurangi dan tanggal mulai peserta tambahan ikut 1 Jul 2026;
    - ganti polis induk ditolak;
    - dua kasus tanggal bentrok ditolak;
    - batas di hari yang sama diterima.
  - Hapus END1 ditolak selama peserta tambahannya sudah dikurangi END2.
    Hapus END2 lalu END1 mengembalikan daftar seperti awal.
- **Uji browser** dengan Playwright, sesi login lokal sementara, dan polis uji
  30 peserta:
  - Sheet: 30 peserta aktif, UP IDR 2.325.000.000, dua halaman.
  - Endorsement 1 Sep 2026 menghentikan NM 1 (UP 100 jt) dan menambah satu
    peserta (UP 75 jt).
    - Usulan: UP −25.000.000, premi −9.917,81 (rate 0,08% × 181/365 hari).
    - Endorsement tersimpan dengan nilai yang sama.
  - Sheet sesudahnya:
    - 30 peserta aktif, UP IDR 2.300.000.000, 1 berhenti.
    - NM 1 "Berhenti 01 Sep 2026" dengan nomor END1.
    - Peserta baru "Aktif sejak 01 Sep 2026" dengan nomor END1.

## Catatan untuk yang melanjutkan

- **Premi endorsement pro-rata harian** dari rate polis asal (premi ÷ TSI).
  - Belum dikonfirmasi Harry.
  - Kalau polis asal memakai premi minimum atau diskon, rate efektifnya ikut
    terbawa.
- **Endorsement mencatat selisih TSI dan premi.** Dashboard menjumlahkan semua
  polis aktif, jadi pengurangan peserta mengurangi total.
- **Renewal tanpa slip tidak menyalin peserta polis lama.** Renewal PA grup
  diasumsikan lewat slip baru. Kalau LCH butuh salinan dari polis lama, buat
  PR terpisah.
- **Isi perubahan peserta tidak bisa diedit** sesudah endorsement disimpan,
  kecuali tanggalnya. Untuk koreksi, hapus lalu buat ulang endorsement-nya.
- **PR 3, klaim PA:**
  - kolom `claims.participant_id` ke `policy_participants`;
  - form klaim menampilkan peserta yang aktif pada tanggal kejadian
    (`participantActiveOn`);
  - hapus endorsement juga harus ditolak kalau peserta tambahannya sudah
    punya klaim.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
