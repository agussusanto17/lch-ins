# Klaim PA grup memilih peserta

- **Tanggal:** 2026-11-06
- **Branch:** `feat/klaim-peserta-pa`
- **PR:** [#162](https://github.com/agussusanto17/lch-ins/pull/162)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini PR ketiga dan terakhir untuk pertanyaan 14. Jawaban Harry ada di
[peserta-pa-grup-2026-11-06.md](peserta-pa-grup-2026-11-06.md):

> data peserta harus diinput 1 persatu jadi jika ada klaim dan endorsment bisa
> tambah dan kurang peserta

Urutan PR:

1. #160 menyimpan peserta di placing slip.
2. #161 membawa peserta ke polis, lalu endorsement bisa menambah dan
   mengurangi peserta. Catatannya ada di
   [peserta-polis-endorsement-2026-11-06.md](peserta-polis-endorsement-2026-11-06.md).
3. PR ini membuat klaim PA menunjuk peserta yang mengalami kejadian.

PR ini bertumpuk di atas #161. Urutan merge: #160, lalu #161, lalu PR ini.

## Yang berubah

- **Form klaim:** polis yang punya daftar peserta mendapat field **Peserta**
  (wajib).
  - Pilihannya hanya peserta yang dijamin pada tanggal kejadian. Sebelum
    tanggal kejadian diisi, pilihannya peserta yang masih aktif.
  - Pencarian mencakup nama, nomor identitas, level, dan lokasi kerja.
    Pilihan dirender paling banyak 50 baris sekaligus, karena satu polis bisa
    berisi ribuan peserta.
  - Keterangan di bawah field menunjukkan UP dan tanggal mulai dijamin
    peserta yang dipilih.
  - Kalau tanggal kejadian diubah ke luar masa jaminan peserta, peringatan
    langsung tampil.
  - Polis PA dengan satu peserta (PA perorangan) langsung memilih peserta
    itu.
  - Daftar peserta dimuat saat polis dipilih, bukan bersama data form.
- **Server menolak klaim** kalau:
  - polis punya daftar peserta tetapi peserta tidak dipilih;
  - peserta bukan dari daftar polis itu atau polis asalnya, termasuk klaim
    yang diajukan lewat polis endorsement;
  - peserta tidak dijamin pada tanggal kejadian;
  - polis tanpa daftar peserta dikirimi peserta.
- **Tampilan klaim:**
  - Nama peserta tampil di tabel klaim, di samping nomor polis.
  - Kotak pencarian klaim juga mencari nama peserta.
  - Detail klaim mendapat baris **Peserta**.
  - Export register klaim mendapat kolom **Peserta**.
- **Daftar peserta polis:** jumlah klaim tampil per peserta, dan unduhan
  Excel mendapat kolom **Jumlah Klaim**.
- **Endorsement menghormati klaim:**
  - Peserta tidak bisa dihentikan pada atau sebelum tanggal kejadian
    klaimnya. Di form, checkbox peserta itu dikunci dengan keterangan
    tanggal klaimnya; server juga menolak.
  - Edit tanggal mulai endorsement ditolak kalau membuat klaim peserta yang
    diubahnya jatuh di luar masa jaminan.
  - Hapus endorsement ditolak kalau peserta tambahannya sudah punya klaim.
  - Peserta yang sudah punya klaim tidak bisa terhapus dari database (foreign
    key RESTRICT).

## File utama

- `prisma/schema.prisma` dan migrasi `20261106220000_klaim_peserta`: kolom
  `claims.participant_id`.
- `lib/server/claims.ts`: `checkedParticipantId` dipanggil saat klaim dibuat
  dan diedit; peserta ikut di record klaim dan audit.
- `lib/server/policies.ts`:
  - `rosterPolicyId` diekspor dan dipakai bersama klaim;
  - `assertNoLaterClaims` dan pengecekan klaim saat endorsement dibuat,
    diedit, dan dihapus;
  - `listPolicyParticipants` mengembalikan jumlah klaim dan tanggal kejadian
    terakhir.
- `app/(app)/claims/actions.ts`: `participantId` di skema input dan
  `listClaimParticipantsAction`.
- `components/claims/claim-form.tsx`: field Peserta.
- `components/shared/form-fields.tsx`: prop `limit` di `SearchSelect`.
- `components/claims/claims-view.tsx`, `claim-detail-sheet.tsx`, dan
  `lib/claim-filter.ts`: tampilan dan pencarian peserta.
- `components/policies/policy-participants-sheet.tsx` dan
  `endorsement-participants.tsx`: jumlah klaim dan checkbox yang dikunci.

## Dampak

- **Database:**
  - Kolom baru `claims.participant_id`, nullable, dengan indeks.
  - Foreign key ke `policy_participants` memakai ON DELETE RESTRICT.
  - Klaim lama tidak berubah.
  - Klaim lama pada polis yang punya daftar peserta akan diminta memilih
    peserta saat diedit. Saat ini kasus itu belum ada, karena daftar peserta
    polis baru ada sejak #161.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos. Satu warning lama di
  `claims-view.tsx:128` tidak terkait.
- `npx tsx --test tests/*.test.ts`: 92 lolos, termasuk pencarian nama
  peserta.
- `npm run build`: lolos.
- **Uji server lokal** dengan skrip sementara; data ujinya sudah dihapus.
  - Ditolak dengan pesan yang jelas:
    - klaim tanpa peserta;
    - peserta yang baru dijamin sesudah tanggal kejadian;
    - peserta dari polis lain;
    - peserta pada polis tanpa daftar;
    - edit klaim ke tanggal sebelum polis berlaku.
  - Endorsement:
    - menghentikan A pada 1 Jun ditolak karena klaim A tanggal 10 Jun;
      menghentikan pada 1 Jul diterima;
    - geser endorsement itu ke 5 Jun ditolak;
    - klaim peserta tambahan X lewat polis endorsement-nya diterima;
    - geser endorsement penambah X ke sesudah tanggal klaim X ditolak;
    - hapus endorsement penambah X ditolak, baik untuk klaim lewat polis
      induk maupun lewat endorsement-nya.
- **Uji browser di halaman `/claims`** dengan sesi login lokal sementara dan
  polis uji 30 peserta (NM 30 baru dijamin mulai 1 Jul 2026):
  - Sebelum tanggal kejadian diisi, petunjuk tampil.
  - Untuk kejadian 10 Jun 2026: 29 peserta dijamin, dan pencarian "NM 30"
    kosong.
  - Memilih NM 11 menampilkan "UP IDR 100.000.000 · dijamin sejak 01 Mar
    2026".
  - Mengubah tanggal kejadian ke 10 Feb 2026 langsung menampilkan peringatan.
  - Klaim tersimpan dengan peserta NM 11.
  - Tabel klaim menampilkan "· NM 11", dan pencarian "NM 11" menemukan
    klaimnya.
  - Detail klaim menampilkan baris "Peserta NM 11".
  - Sheet peserta polis menampilkan "1 klaim" pada NM 11.

## Catatan untuk yang melanjutkan

- **Nilai klaim tidak dibandingkan dengan UP peserta.** Manfaat PA bergantung
  pada jenis manfaat (meninggal, cacat, biaya medis), jadi batasnya belum
  diatur. Kalau LCH mau ada peringatan, tanyakan aturannya ke Harry.
- **Klaim lewat endorsement:** polis klaim boleh polis endorsement. Peserta
  tetap dicari di daftar polis asal.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
