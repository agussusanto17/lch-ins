# Berkas yang dibuka tanpa login diarahkan ke halaman login

- **Tanggal:** 2026-11-12
- **Branch:** `fix/berkas-tanpa-login-ke-login`
- **PR:** #229
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- Link berkas unggahan (`/api/files/<id>`) biasanya dibuka langsung di tab
  browser. Contohnya copy KTP, polis, dokumen klaim, dan lampiran slip.
- Rute `/api` tidak melewati `proxy.ts`. Akibatnya pengunjung tanpa sesi tidak
  diarahkan ke login seperti di halaman lain. Mereka hanya melihat teks polos
  "Silakan login terlebih dahulu." dengan status 401.
- User minta pengunjung seperti itu langsung diarahkan ke halaman login.

## Yang berubah

- Tanpa sesi, `/api/files/<id>` sekarang membalas `307` ke
  `/login?next=/api/files/<id>`.
  - Setelah login, form login membuka kembali berkas itu, karena memakai
    `window.location.replace(next)`.
  - `Location` sengaja relatif. Browser melengkapinya dengan domain yang sedang
    dibuka, jadi hasilnya tidak bergantung pada host yang dilihat Next di balik
    nginx. Saat diuji lokal, `request.nextUrl` di route handler memberi host
    `localhost`, bukan host dari header `Host`.
  - Respons redirect diberi `Cache-Control: no-store`.
- Yang tidak berubah:
  - Pemeriksaan sesi tetap terjadi sebelum berkas dicari, jadi redirect tidak
    membocorkan ada tidaknya sebuah ID.
  - User yang wajib ganti password tetap mendapat 403.
  - Role tanpa hak akses tetap mendapat 403.
  - Berkas yang tidak ada tetap mendapat 404.

## File utama

- `app/api/files/[id]/route.ts`: redirect ke login saat tidak ada sesi.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos.
- Diuji di `next start` lokal tanpa cookie:
  - `GET /api/files/<id>` membalas `307`, `location:
    /login?next=%2Fapi%2Ffiles%2F<id>`, dan `cache-control: no-store`, dengan
    body kosong;
  - redirect berakhir di halaman login dengan status 200.
- Setelah deploy, uji di `https://apps.lch.co.id/api/files/<id>` tanpa login.
  Hasil yang diharapkan: diarahkan ke `https://apps.lch.co.id/login?next=…`.

## Catatan untuk yang melanjutkan

- Gambar lampiran di dokumen cetak (`<img src="/api/files/…">`) hanya dibuka
  user yang sudah login, jadi perilakunya tidak berubah. Kalau sesi kedaluwarsa
  di tengah jalan, gambar tetap gagal tampil, sama seperti sebelumnya.
- Kalau nanti ada pemanggil `fetch` ke `/api/files` yang mengandalkan status
  401, pemanggil itu sekarang menerima redirect ke halaman login (HTML).
