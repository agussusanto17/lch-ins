# Nomor slip tidak tembus kolom dan catatan di bawah tabel dihapus

- **Tanggal:** 2026-11-02
- **Branch:** `fix/tabel-placement-no-slip`
- **PR:** #70
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Di tabel Placement, nomor slip yang panjang seperti
`002/LCH-PLCMT/PS-PAREQ/VIII/2026` menimpa kolom Nama Tertanggung. Sel No. Slip
dibatasi 230px, sedangkan isi sel tabel tidak boleh turun baris, jadi nomor
selebar 265px keluar dari selnya. User juga meminta catatan keterangan di bawah
tabel dihapus, termasuk yang sejenis di modul lain.

## Yang berubah

- Batas lebar sel No. Slip di tabel Placement dihapus, jadi kolom mengikuti
  panjang nomor. Nomor dokumen sengaja tidak dipotong dengan elipsis.
- Catatan di bawah tabel yang dihapus:
  - Placement: "Pola nomor {seq}/LCH-PLCMT/PS[-{kode}]/{bulan romawi}/{tahun}
    digenerate saat release".
  - Klaim: "Klik baris untuk membuka detail lengkap. Klaim dapat diubah atau
    ditutup statusnya."
  - Policy Database: "Status dihitung dari tanggal berakhir per …". Angka
    total premium di baris yang sama tetap ada karena itu data, bukan
    keterangan.

## File utama

- `components/underwriting/slip-table.tsx`
- `components/claims/claims-view.tsx`
- `components/policies/policy-database.tsx`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** setelah merge, `gh repo sync vourdev/lch-ins -b main`.

## Verifikasi

- Di localhost, tidak ada nomor slip yang melewati batas selnya; kolom No. Slip
  selebar 289px untuk nomor terpanjang.
- Ketiga catatan tidak muncul lagi di Placement, Klaim, dan Policy Database.
  Total premium di Policy Database masih tampil.
- `npx eslint` pada ketiga file: tidak ada masalah.

## Catatan untuk yang melanjutkan

- Catatan keterangan di dalam form, seperti di bagian rate OJK, tidak
  disentuh. Yang dihapus hanya catatan di bawah tabel daftar.
