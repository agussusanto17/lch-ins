import { canAccess } from "@/lib/access"
import { isStorageUnavailableError } from "@/lib/server/object-storage"
import { currentUser } from "@/lib/server/session"
import { opensInline, purposeMenu, readStoredFile } from "@/lib/server/stored-files"

/**
 * Rute /api tidak melewati proxy, jadi login dan hak akses diperiksa di sini.
 * Menu yang dipakai mengikuti pemakaian berkas, misalnya KYC ikut hak halaman klien.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser()
  if (!user) {
    // Sesi dicek sebelum berkas dicari, jadi redirect ke login tidak membocorkan ada tidaknya ID.
    // Location sengaja relatif supaya tidak bergantung pada host yang dilihat Next di balik nginx.
    const next = new URL(request.url).pathname
    return new Response(null, {
      status: 307,
      headers: {
        Location: `/login?${new URLSearchParams({ next })}`,
        "Cache-Control": "no-store",
      },
    })
  }
  if (user.mustChangePassword) {
    return new Response("Ganti kata sandi terlebih dahulu.", { status: 403 })
  }

  const { id } = await params
  let file
  try {
    file = await readStoredFile(id)
  } catch (error) {
    if (isStorageUnavailableError(error)) {
      return new Response(
        "Penyimpanan berkas sedang tidak dapat diakses. Silakan coba beberapa saat lagi.",
        {
          status: 503,
          headers: {
            "Retry-After": "5",
          },
        }
      )
    }
    console.error("Gagal membaca berkas unggahan:", id, error)
    return new Response("Terjadi kesalahan saat memproses berkas.", {
      status: 500,
    })
  }

  const menu = file ? purposeMenu(file.purpose) : null
  if (!file || !menu) {
    return new Response("Berkas tidak ditemukan.", { status: 404 })
  }
  if (!canAccess(user.roles, menu)) {
    return new Response("Akses ditolak.", { status: 403 })
  }

  // Isi dari database dikirim sebagai stream: Vercel menolak response biasa
  // di atas 4,5 MB, sedangkan berkas polis boleh sampai 25 MB.
  const body = file.data instanceof Uint8Array ? streamBytes(file.data) : file.data
  return new Response(body, {
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

/** Kirim isi berkas per 1 MB. */
function streamBytes(bytes: Uint8Array) {
  const CHUNK = 1024 * 1024
  let offset = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close()
        return
      }
      controller.enqueue(bytes.subarray(offset, offset + CHUNK))
      offset += CHUNK
    },
  })
}

/** Nama ASCII untuk browser lama, nama asli lewat filename* (RFC 6266). */
function contentDisposition(fileName: string, type: "inline" | "attachment") {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_")
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
