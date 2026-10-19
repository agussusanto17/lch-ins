# Aturan kerja

`main` auto-deploy ke lch-ins.vercel.app, dan itu demo yang dilihat LCH. Aturan
di bawah berlaku untuk semua orang dan semua agent (Claude Code, Codex, Cursor,
dan lainnya). Tidak ada pengecualian, termasuk untuk typo, dokumentasi, dan
config.

## Wajib

1. **Setiap perubahan di branch baru dari `main` terbaru.** Sebelum menyentuh
   file apa pun, cek `git branch --show-current`. Kalau masih `main` atau branch
   topik lain, jalankan `git switch main && git pull --ff-only` lalu buat branch
   baru. Jangan pernah commit atau push langsung ke `main`.
   - `feat/...` fitur, `fix/...` perbaikan, `docs/...` dokumentasi,
     `chore/...` tooling atau config.
2. **Satu branch satu topik.** Pesan commit bahasa Indonesia, isinya alasan
   perubahan, bukan cuma daftar file.
3. **Setiap perubahan punya catatan di `docs/changes/`**, dibuat di branch yang
   sama dan ikut di-commit bersama perubahannya. PR tanpa catatan perubahan
   belum boleh di-merge. Aturan lengkapnya ada di bagian berikut.
4. **Setiap perubahan wajib memperbarui graph graphify** sebelum commit, supaya
   agent berikutnya tidak bekerja dengan peta codebase yang basi:
   - perubahan kode: `graphify update .`;
   - perubahan dokumen (`README.md`, `AGENTS.md`, `docs/`, termasuk catatan
     baru di `docs/changes/`): `/graphify . --update` di Claude Code, karena
     `graphify update .` dan git hook hanya membaca kode;
   - kalau graphify belum terpasang di mesin itu, pasang dulu (lihat bagian
     graphify). Jangan lewati langkah ini.
5. **Sebelum push:** `npx tsc --noEmit` dan `npm run build` harus lolos.
6. **Push branch lalu buka PR.** Merge ke `main` hanya setelah disetujui.

Catatan deploy: project Vercel membangun produksi dari fork `vourdev/lch-ins`,
bukan dari repo ini. Setelah PR di-merge, fork perlu disinkronkan
(`gh repo sync vourdev/lch-ins -b main`) supaya demo ikut terbaru.

## Catatan perubahan (`docs/changes/`)

Tujuannya supaya orang dan agent berikutnya tahu apa yang berubah, kapan, dan
kenapa, tanpa harus membaca ulang seluruh riwayat git.

- **Sebelum mulai kerja**, baca beberapa catatan terbaru di `docs/changes/`
  untuk tahu konteks terakhir.
- **Satu file per perubahan** (satu branch atau PR).
- **Nama file:** `<topik>-<YYYY-MM-DD>.md`, huruf kecil dan kebab-case. Tanggal
  adalah hari perubahan dibuat, waktu WIB. Contoh:
  `implementasi-login-2026-08-13.md`. Kalau nama itu sudah dipakai, tambahkan
  akhiran `-2`, `-3`.
- **Isi mengikuti template** di [docs/changes/README.md](docs/changes/README.md).
  Minimal: latar belakang, apa yang berubah, dampak (database, env, deploy), cara
  verifikasi, dan catatan untuk yang melanjutkan.
- **Catatan yang sudah di-merge jangan ditulis ulang**, kecuali untuk
  meluruskan fakta yang salah. Perubahan lanjutan dapat catatan baru yang
  merujuk catatan lama.
- Jangan tulis credential, token, atau isi `.env` di catatan.

## graphify

Project ini memakai [graphify](https://github.com/safishamsi/graphify) sebagai
knowledge graph codebase di `graphify-out/`. Folder itu tidak di-commit, jadi
setiap mesin membangunnya sendiri.

Setup sekali per mesin:

```bash
uv tool install 'graphifyy[sql]'   # atau: pipx install 'graphifyy[sql]'
graphify hook install       # graph dibangun ulang otomatis setiap commit dan checkout
graphify update .           # bangun graph dari kode (AST, tanpa LLM)
```

Untuk graph lengkap termasuk dokumen, jalankan `/graphify .` di Claude Code.

Aturan pakai:

- Untuk pertanyaan tentang codebase, kalau `graphify-out/graph.json` ada,
  jalankan dulu `graphify query "<pertanyaan>"`. Pakai
  `graphify path "<A>" "<B>"` untuk hubungan antar bagian dan
  `graphify explain "<konsep>"` untuk satu konsep. Hasilnya subgraph yang jauh
  lebih kecil daripada `GRAPH_REPORT.md` atau hasil grep.
- Baca `graphify-out/GRAPH_REPORT.md` hanya untuk review arsitektur yang luas,
  atau kalau query, path, dan explain tidak cukup.
- Setelah mengubah kode, jalankan `graphify update .`. Setelah mengubah
  dokumen, jalankan `/graphify . --update`. Ini wajib (aturan Wajib nomor 4).
  Git hook membangun ulang graph setelah commit dan checkout, tapi hanya dari
  kode. Hook itu jaring pengaman, bukan pengganti langkah manual.
- Graph bisa ketinggalan. Kalau hasil query bertentangan dengan kode, percayai
  kode lalu jalankan `graphify update .`.
- Kalau user mengetik `/graphify`, pakai skill graphify yang terpasang.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
