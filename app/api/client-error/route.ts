import {
  CLIENT_ERROR_MAX_BYTES,
  clientErrorSchema,
  formatClientErrorLog,
} from "@/lib/client-error"
import { currentUser } from "@/lib/server/session"

/**
 * Menerima laporan error sisi browser agar tercatat di `docker logs lch_web`.
 * Wajib sesi aktif supaya bot publik tidak bisa membanjiri log server.
 */
export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(contentLength) && contentLength > CLIENT_ERROR_MAX_BYTES) {
    return Response.json({ ok: false, error: "Payload terlalu besar" }, { status: 413 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return Response.json({ ok: false, error: "Gagal membaca body" }, { status: 400 })
  }

  if (rawBody.length > CLIENT_ERROR_MAX_BYTES) {
    return Response.json({ ok: false, error: "Payload terlalu besar" }, { status: 413 })
  }

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return Response.json({ ok: false, error: "JSON tidak valid" }, { status: 400 })
  }

  const parsed = clientErrorSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Format laporan error tidak valid" }, { status: 400 })
  }

  const ipHeader =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    null
  const ip = ipHeader ? ipHeader.split(",")[0]?.trim() || null : null
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null

  const entry = formatClientErrorLog(parsed.data, {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    roles: user.roles,
    ip,
    userAgent,
  })

  console.error("[CLIENT_ERROR]", JSON.stringify(entry))
  return Response.json({ ok: true })
}
