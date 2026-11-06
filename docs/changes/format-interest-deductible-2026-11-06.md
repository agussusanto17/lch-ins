# Interest per lokasi dan kalimat pengantar deductible manual

- **Tanggal:** 2026-11-06
- **Branch:** `fix/format-interest-deductible`
- **PR:** #150
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Review DRAFT Placing Slip (lanjutan PR #149) meminta dua penyesuaian:

1. Interest Insured pada slip banyak lokasi dicetak per lokasi dengan format:

   ```
   Lokasi 1
   — On Material Damage                               IDR 7.000.000.000
   — Contents (incl. Office Contents) & INVENTORY     IDR 2.000.000.000
   Lokasi 2
   — On Material Damage                                 IDR 900.000.000
   ```

2. Kalimat "Any one loss or series of losses arising out of any one event:"
   di atas daftar deductible tidak boleh muncul otomatis. User mengetiknya
   sendiri lewat kolom isian.

## Yang berubah

- Interest Insured: kalau slip punya lebih dari satu lokasi, item tiap section
  dikelompokkan per lokasi dengan judul "Lokasi n". Tiap item diawali tanda
  "—", dan nilainya rata kanan. Lokasi tanpa item di section itu tidak dicetak.
  Slip satu lokasi tetap berupa daftar biasa tanpa judul lokasi.
- Deductible: kalimat pengantar tidak lagi dicetak otomatis untuk slip
  Property. Form slip punya kolom baru "Kalimat pengantar deductible" di kartu
  Deductible & Clauses, untuk semua COB. Isinya dicetak apa adanya (baris baru
  dipertahankan). Kalau kosong, tidak ada yang dicetak.
- Duplikat slip ikut menyalin kalimat pengantar.
- Perubahan kalimat tercatat di audit log dengan label "Kalimat pengantar
  deductible".

## File utama

- `components/documents/doc-blocks.tsx`: `InterestBlock` (kelompok per lokasi)
  dan `DeductibleBlock` (kalimat pengantar dari isian).
- `components/underwriting/placing-slip-form.tsx`: kolom isian baru.
- `prisma/schema.prisma` dan migrasi
  `20261106110000_kalimat_pengantar_deductible`: kolom
  `placing_slips.deductible_intro`.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`:
  simpan, baca, validasi (maksimal 500 karakter), dan duplikat.
- `lib/data/types.ts`, `lib/data/slips.ts`, `components/underwriting/slip-model.ts`,
  `components/audit/audit-fields.ts`: tipe, data contoh, default slip baru,
  label audit.

## Dampak

- **Database:** migrasi baru menambah kolom `deductible_intro` (TEXT, boleh
  kosong). Migrasi yang sama mengisi kalimat lama untuk slip Property yang
  punya deductible, supaya cetakan slip yang sudah ada tidak berubah. Slip COB
  lain dan slip baru mulai kosong.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. `npm run build` menjalankan
  `prisma migrate deploy`.

Semua dokumen yang memakai `InterestBlock` dan `DeductibleBlock` ikut berubah:
Placing Slip, Quotation Slip, Cover Note, dan Closing Instruction.

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 79 lolos.
- `npx tsc --noEmit` dan `npm run build` lolos.
- Migrasi di DB lokal: keempat slip Property terisi kalimat lama, slip COB lain
  tetap kosong.
- Uji di browser (DB lokal) memakai salinan slip Property hasil "Duplikat jadi
  draft baru", ditambah dua lokasi:
  - salinan membawa kalimat pengantar dari slip asal;
  - Interest tercetak "Lokasi 1/2/3" dengan baris "— item ... nilai". Section 2
    hanya menampilkan Lokasi 1 karena lokasi lain tidak punya item BI;
  - kolom dikosongkan lalu "Simpan Draft": DB menyimpan NULL dan kalimat hilang
    dari dokumen;
  - kolom juga muncul di form slip Motor Vehicle.

  Salinan dihapus setelah dicek.

## Catatan untuk yang melanjutkan

- Tanda geser kiri-kanan pada screenshot review (lebar area teks di tingkat
  Insured Name, margin 18mm) belum dikerjakan. Ditunda atas permintaan user.
- Kalimat lama hanya diisi oleh migrasi. Slip Property baru tidak mendapat
  kalimat otomatis. Kalau LCH ingin isian awal, tambahkan default di
  `slip-model.ts` per COB, bukan di dokumen.
