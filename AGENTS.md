# Alur kerja git

`main` auto-deploy ke lch-ins.vercel.app, dan itu demo yang dilihat LCH. Jadi
jangan commit langsung ke `main`.

1. Branch dari `main` sebelum mulai: `feat/...` untuk fitur, `fix/...` untuk perbaikan.
2. Satu branch satu topik. Pesan commit bahasa Indonesia, isinya alasan perubahan,
   bukan cuma daftar file.
3. Sebelum push: `npx tsc --noEmit` dan `npm run build` harus lolos.
4. Push branch lalu buka PR. Merge ke `main` hanya setelah disetujui.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
