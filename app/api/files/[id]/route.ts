import { canAccess } from "@/lib/access"
import { currentUser } from "@/lib/server/session"
import { opensInline, purposeMenu, readStoredFile } from "@/lib/server/stored-files"

/**
 * Membuka isi berkas unggahan, misalnya copy KTP klien.
 *
 * Rute /api tidak melewati proxy, jadi login dan hak akses diperiksa di sini.
 * Menu yang dipakai mengikuti pemakaian berkas: berkas KYC hanya bisa dibuka
 * role yang boleh membuka halaman klien.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser()
  if (!user) {
    return new Response("Silakan login terlebih dahulu.", { status: 401 })
  }
  if (user.mustChangePassword) {
    return new Response("Ganti kata sandi terlebih dahulu.", { status: 403 })
  }

  const { id } = await params
  const file = await readStoredFile(id)
  const menu = file ? purposeMenu(file.purpose) : null
  if (!file || !menu) {
    return new Response("Berkas tidak ditemukan.", { status: 404 })
  }
  if (!canAccess(user.roles, menu)) {
    return new Response("Akses ditolak.", { status: 403 })
  }

  return new Response(file.data, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.sizeBytes),
      // Excel dan jenis lain yang tidak aman dibuka di tab selalu diunduh.
      "Content-Disposition": contentDisposition(
        file.fileName,
        opensInline(file.contentType) ? "inline" : "attachment"
      ),
      // Berkas KYC berisi data pribadi, jadi tidak disimpan di cache.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

/** Nama ASCII untuk browser lama, nama asli lewat filename* (RFC 6266). */
function contentDisposition(fileName: string, type: "inline" | "attachment") {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_")
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
