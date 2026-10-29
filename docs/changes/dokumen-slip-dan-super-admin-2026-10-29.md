# Field dokumen penutupan sesuai jawaban LCH, dan Super Admin Harry & Tresna

- **Tanggal:** 2026-10-29
- **Branch:** `fix/dokumen-slip-dan-super-admin`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dari catatan progres mingguan Agus dengan Harry, 29 Oktober 2026, ada dua hal
yang langsung bisa dikerjakan.

Pertama, aturan field per dokumen penutupan. Kalimat Harry: *"kalo placing ada
brokerage, tapi ga ada subjectivity dan security, kalo quotation sebaliknya,
kalo closing lengkap."* Dibandingkan dengan kode, dua dari tiga dokumen salah,
dan yang paling fatal panel asuransi tertukar: muncul di Placing Slip yang
seharusnya tidak, hilang di Quotation Slip yang seharusnya ada.

Kedua, Super Admin ditunjuk ke Harry dan Bu Tresna. Catatan Agus menulis
"Kresna", sudah dikonfirmasi orang yang sama dengan Tresna; data LCH sendiri
mengejanya TRESNA (`tresna@lch.co.id`), jadi ejaan itu yang dipakai.

Saat memverifikasi hasilnya di browser ketahuan satu regresi yang tidak
berhubungan: nomor telepon di kop surat kembali ke nomor lama. Ikut diperbaiki
di sini karena menyentuh berkas dokumen yang sama dan salah di semua cetakan.

## Yang berubah

### Field per dokumen penutupan

Baris brokerage dan net premium dijadikan satu helper `brokerageRows()` supaya
Placing Slip dan Closing Instruction memakai susunan yang sama persis.

| Dokumen | Brokerage | Subjectivity | Panel asuransi |
| --- | --- | --- | --- |
| Placing Slip | ditambahkan | — | **dihapus** |
| Quotation Slip | — | sudah ada | **ditambahkan** |
| Closing Instruction | sudah ada | **ditambahkan** | sudah ada |

### Draft Cover Note tanpa kop surat

`<Letterhead />` dihapus dari `CoverNoteDocument`, jadi halaman langsung dibuka
judul "COVER NOTE". Ini sekaligus melunasi A-15 di PRD yang sudah menuliskan
aturan itu sejak awal tapi belum dikerjakan di kode.

### Super Admin

- `harry@lch.co.id`: `["marketing", "placement"]` → `["admin", "marketing", "placement"]`
- `tresna@lch.co.id`: `["claim"]` → `["admin", "claim"]`

Role bidangnya sengaja dipertahankan supaya daftar pengguna tetap menggambarkan
pekerjaan asli orangnya, walaupun `admin` sendiri sudah Kelola di seluruh menu.

Permintaan "password diseragamkan" tidak butuh perubahan kode: seed memang sudah
memakai satu kata sandi awal untuk semua akun baru, dan seluruh akun operasional
sudah `mustChangePassword: true`, jadi wajib ganti saat login pertama.

### Akun Yenie, konflik `adminfin@lch.co.id` selesai

LCH memastikan `adminfin@lch.co.id` memang milik Yenie Yustika, bukan akun Super
Admin bersama. Entri itu dihapus dari `IDENTITY_CONFLICTS` dan akunnya di-seed
seperti akun operasional lain, jadi tinggal `policyadmin@lch.co.id` yang masih
bentrok.

### PIC klaim Yusuf dan Tejo

LCH menyebut PIC klaim adalah Yusuf dan Tejo. Tejo sudah punya akun sendiri
(`sutejo@lch.co.id`), sedangkan Yusuf belum ada di mana pun. Diasumsikan dialah
orang di balik akun generik "CLAIM LCH", jadi akun itu diberi nama YUSUF dengan
email `claim@lch.co.id` yang lama, karena alamat pribadinya belum diberitahu.
Kalau asumsinya meleset, Admin tinggal mengubah nama atau emailnya dari
`/users`, tidak perlu ubah kode.

Tresna masih memegang `claim` di samping `admin`. Dibiarkan: LCH tidak bilang
rolenya dicabut, dan `admin` sudah Kelola di semua menu jadi tidak ada bedanya.

Seed sekarang ikut memperbarui kolom `name` untuk pengguna yang sudah ada.
Sebelumnya hanya `roles` dan `jobTitle` yang diperbarui, sehingga koreksi nama
dari LCH cuma berlaku di database kosong.

### Peran Yenie

Lembar referensi LCH menulis peran Yenie "finance / admin", tetapi di sini dia
baru diberi `finance`. Alasannya `admin` membuka menu Pengguna dan Audit Trail
serta Kelola di seluruh menu; lebih aman kurang dulu lalu ditambahkan Admin dari
`/users` kalau LCH memang memintanya, daripada terlanjur memberi akses yang
tidak diperlukan. Sudah ditanyakan, menunggu jawaban.

### Regresi nomor telepon kop surat

`LCH_ADDRESS.phone` dikembalikan ke **1071/1072**. Nomor ini sudah pernah
diperbaiki di PR #21 (commit `a947a01`), lalu kembali ke nomor lama 1671/1672
saat PR #29 menulis ulang berkas itu untuk memasang logo. Ditambahkan komentar
di atas barisnya supaya tidak terulang: 1671/1672 adalah nomor Lestari Cipta
Hokindo, nama LCH sebelum berganti.

## File utama

- `components/documents/slip-documents.tsx`: helper `brokerageRows()` dan
  susunan field keempat dokumen.
- `components/documents/letterhead.tsx`: `LCH_ADDRESS.phone`.
- `prisma/seed.ts`: role Harry dan Tresna, serta catatan pada konflik
  `adminfin@lch.co.id`.

## Dampak

- **Database:** tidak ada migration. Seed memperbarui kolom `roles` untuk dua
  akun yang sudah ada, jadi jalankan `npm run db:seed` setelah merge.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain seed di atas.

## Verifikasi

`npx tsc --noEmit` dan `npm run build` lolos.

`npm run lint` melaporkan 2 error di `components/claims/claim-detail-sheet.tsx`
dan `components/layout/notification-popover.tsx`. Keduanya sudah ada di `main`
sebelum branch ini — diperiksa dengan menjalankan lint di `main` — dan tidak
disentuh di sini, jadi dibiarkan untuk branch tersendiri.

Keempat dokumen dibuka di browser memakai slip `s-001`, yang punya data
subjectivity maupun panel asuransi:

| Dokumen | Brokerage | Net Premium | Subjectivity | Panel asuransi | Kop surat |
| --- | --- | --- | --- | --- | --- |
| Placing Slip | ada | ada | tidak | tidak | ada |
| Quotation Slip | tidak | tidak | ada | ada | ada |
| Cover Note | tidak | tidak | tidak | ada | **tidak** |
| Closing Instruction | ada | ada | ada | ada | ada |

Nomor telepon terbaca 2605 1071 dan 2605 1072 di seluruh dokumen. Pencarian
`1671` dan `1672` di seluruh kode tidak menemukan apa pun selain komentar
peringatan. Tidak ada error di console browser.

Kedelapan akun LCH tersimpan benar setelah seed dijalankan ulang, semuanya
`must_change_password = t`:

```
accounting@lch.co.id | ACCOUNTING LCH | {accounting}
adminfin@lch.co.id   | YENIE YUSTIKA  | {finance}
aziz@lch.co.id       | AZIZ SURYA     | {marketing,placement}
claim@lch.co.id      | CLAIM LCH      | {claim}
finance02@lch.co.id  | FITRI          | {finance}
harry@lch.co.id      | HARRY SETIAWAN | {admin,marketing,placement}
sutejo@lch.co.id     | SUTEJO         | {claim}
tresna@lch.co.id     | TRESNA         | {admin,claim}
```

Keluaran seed menyisakan satu konflik identitas saja, `policyadmin@lch.co.id`.

## Catatan untuk yang melanjutkan

**Footer alamat di Cover Note sengaja dibiarkan.** Harry bilang draft cover note
tidak perlu kop LCH, "cukup judul aja". Yang dihapus kop di bagian atas, sesuai
arti kata kop surat dan sesuai A-15 di PRD. Tapi `PrintedAt` masih memasang
`DocumentFooter` berisi alamat dan telepon LCH di kaki halaman. Perlu
dikonfirmasi apakah itu ikut dihapus.

**Alasan brokerage disembunyikan di Quotation Slip belum dikonfirmasi.** Dugaan
yang masuk akal: quotation adalah dokumen yang dikirim ke tertanggung, jadi
komisi broker tidak ditampilkan. Komentar di `brokerageRows()` sengaja hanya
menyebut instruksi LCH, bukan alasannya, sampai Harry menjawab. Kalau dugaan ini
salah, yang perlu diperiksa bukan cuma Quotation Slip tapi juga dokumen lain
yang sampai ke pihak luar.

**Peran Yenie belum final.** Akunnya sudah dibuat dengan `finance`, sedangkan
lembar referensi LCH menulis "finance / admin". Kalau LCH menjawab dia memang
perlu Admin, cukup tambahkan dari `/users`, tidak perlu ubah seed.

**`policyadmin@lch.co.id` masih bentrok** antara Muhaimin dan Farah, belum ada
jawaban.

**Yang belum dikerjakan dari catatan 29 Oktober:** tanda tangan berselang
kiri-kanan mengikuti jumlah asuransi di panel (`SignatureGrid` sekarang masih
dua kolom tetap), penggabungan form input slip jadi satu, deductible per cover,
dan satu placing slip untuk beberapa asuransi pada kasus co-insurance.

**Aturan Wajib nomor 4 belum dijalankan** untuk PR ini: graphify belum terpasang
di mesin ini, sama seperti PR #11, #12, #13, #21, dan #23.
