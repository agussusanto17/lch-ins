# Aturan kerja agent, catatan perubahan, dan graphify

- **Tanggal:** 2026-09-13
- **Branch:** `chore/aturan-agen-graphify`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Beberapa orang dan beberapa agent bekerja di repo ini bersamaan. Konteks
perubahan selama ini hanya ada di riwayat git dan deskripsi PR, jadi agent
berikutnya sulit tahu apa yang terakhir dikerjakan, kapan, dan kenapa. Aturan
branch di `AGENTS.md` juga masih longgar, sehingga perubahan kecil berisiko
langsung masuk ke `main`, yang auto-deploy ke demo LCH.

## Yang berubah

- `AGENTS.md` sekarang berisi aturan wajib:
  - setiap perubahan di branch baru dari `main` terbaru;
  - prefix branch `feat/`, `fix/`, `docs/`, atau `chore/`;
  - satu branch satu topik;
  - setiap perubahan wajib punya catatan di `docs/changes/`;
  - setiap perubahan wajib memperbarui graph graphify sebelum commit:
    `graphify update .` untuk kode, `/graphify . --update` untuk dokumen;
  - `tsc` dan `build` lolos sebelum push;
  - merge hanya lewat PR yang disetujui.
- Folder `docs/changes/` dibuat, dengan konvensi nama `<topik>-<YYYY-MM-DD>.md`
  dan template isi di `docs/changes/README.md`.
- `AGENTS.md` mencatat bahwa Vercel membangun produksi dari fork
  `vourdev/lch-ins`. Fork itu harus disinkronkan setelah merge. Hal ini
  ditemukan pada 2026-09-12: Master Clauses di produksi error karena fork
  tertinggal 8 commit dari `main`.
- graphify dipasang sebagai knowledge graph codebase:
  - bagian `## graphify` di `AGENTS.md` berisi cara setup dan aturan pakai;
  - `CLAUDE.md` berisi `@AGENTS.md`, supaya Claude Code membaca aturan yang
    sama dengan agent lain;
  - `.claude/settings.json` dan `.codex/hooks.json` memasang hook PreToolUse
    graphify, yang mengingatkan agent untuk memakai graph sebelum grep atau
    membaca file satu per satu;
  - `graphify-out/` masuk `.gitignore`.

## File utama

- `AGENTS.md`: aturan kerja untuk semua orang dan agent.
- `CLAUDE.md`: pintu masuk Claude Code ke `AGENTS.md`.
- `docs/changes/README.md`: konvensi nama dan template catatan.
- `.claude/settings.json`, `.codex/hooks.json`: hook graphify.
- `.gitignore`: mengabaikan `graphify-out/`.
- `.graphifyignore`: mengeluarkan config hook agent dari graph.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada perubahan kode aplikasi.
- **Setup lokal:** setiap developer perlu sekali jalan
  `uv tool install 'graphifyy[sql]'` dan `graphify hook install`. Tanpa graphify, hook
  agent dilewati tanpa error.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos.
- Graph pertama dibangun dengan `/graphify .` dari 188 file (180 kode dan 8
  dokumen). Hasilnya 1240 node, 3449 edge, dan 61 komunitas. `graphify query`
  menjawab dari graph.
- Health check graph melaporkan 448 edge dangling. Hampir semuanya import ke
  paket eksternal (`react`, `lucide-react`, `next/link`) dan re-export barrel
  `lib/data/index.ts`, jadi wajar untuk ekstraksi AST. Ekstraksi dokumen punya 0
  edge dangling.
- Command hook diuji tanpa graph dan tanpa binary graphify di PATH; keduanya
  keluar dengan kode 0.

## Catatan untuk yang melanjutkan

- `graphify-out/` sengaja tidak di-commit karena dua hal:
  - graph dibangun ulang setiap commit, sehingga akan membuat diff besar di
    setiap PR;
  - graph juga memuat ringkasan dokumen PRD, ERD, dan checklist di `docs/`, yang
    memang tidak di-commit.
- Hook di `.claude/settings.json` dan `.codex/hooks.json` memanggil `graphify`
  dari PATH, bukan path absolut. Installer graphify (`graphify claude install`,
  `graphify codex install`) menulis path absolut mesin pemasangnya, jadi jangan
  jalankan ulang installer itu lalu meng-commit hasilnya.
- Pasang graphify dengan extra SQL (`uv tool install 'graphifyy[sql]'`).
  Tanpa extra itu, file migrasi Prisma (`prisma/migrations/*.sql`) tidak masuk
  graph.
- Catatan perubahan untuk pekerjaan sebelum 2026-09-13 belum ada. Riwayatnya
  ada di PR #3 sampai #9.
