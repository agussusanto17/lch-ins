import { z } from "zod"

export const CLIENT_ERROR_MAX_BYTES = 16 * 1024
export const CLIENT_ERROR_SOURCES = ["app-error", "global-error", "action"] as const
export type ClientErrorSource = (typeof CLIENT_ERROR_SOURCES)[number]

const MAX_MESSAGE_LEN = 1000
const MAX_STACK_LEN = 4000
const MAX_PATH_LEN = 500
const MAX_HREF_LEN = 1000
const MAX_NAME_LEN = 120
const MAX_DIGEST_LEN = 100
const MAX_REF_LEN = 64
const MAX_CONTEXT_LEN = 200

function clip(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

export const clientErrorSchema = z.object({
  source: z.enum(CLIENT_ERROR_SOURCES).default("app-error"),
  clientRef: z.string().trim().min(1).max(MAX_REF_LEN).optional(),
  digest: z.string().trim().max(MAX_DIGEST_LEN).optional(),
  name: z.string().trim().max(MAX_NAME_LEN).optional(),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LEN),
  stack: z.string().max(MAX_STACK_LEN).optional(),
  pathname: z.string().max(MAX_PATH_LEN).optional(),
  href: z.string().max(MAX_HREF_LEN).optional(),
  context: z.string().max(MAX_CONTEXT_LEN).optional(),
})

export type ClientErrorReport = z.infer<typeof clientErrorSchema>

export interface ClientErrorServerMeta {
  userId: string
  userName: string
  userEmail: string
  roles: string[]
  ip?: string | null
  userAgent?: string | null
}

/** Generate a deterministic short client reference code safe for React render & hydration. */
export function deterministicErrorRef(message: string, instanceId = ""): string {
  const input = `${instanceId}:${message}`
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `CE-${(hash >>> 0).toString(36).toUpperCase().padStart(6, "0")}`
}

/** Generate a short per-incident client reference code for imperative action error reports. */
export function createClientRef(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  const time = Date.now().toString(36).slice(-4).toUpperCase()
  return `CE-${time}${rand}`
}

/** Extract and safely bound client error details before sending to the server. */
export function buildClientErrorPayload(
  err: unknown,
  opts: {
    source?: ClientErrorSource
    clientRef?: string
    pathname?: string
    href?: string
    context?: string
  } = {}
): ClientErrorReport {
  const errObj = err instanceof Error ? err : null
  const rawDigest =
    typeof err === "object" && err !== null && "digest" in err
      ? (err as { digest?: unknown }).digest
      : undefined
  const rawMessage =
    errObj?.message ??
    (typeof err === "string"
      ? err
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : "")

  return {
    source: opts.source ?? "app-error",
    clientRef: clip(opts.clientRef, MAX_REF_LEN),
    digest: clip(rawDigest, MAX_DIGEST_LEN),
    name: clip(errObj?.name, MAX_NAME_LEN),
    message: clip(rawMessage, MAX_MESSAGE_LEN) ?? "Unknown client error",
    stack: clip(errObj?.stack, MAX_STACK_LEN),
    pathname: clip(opts.pathname, MAX_PATH_LEN),
    href: clip(opts.href, MAX_HREF_LEN),
    context: clip(opts.context, MAX_CONTEXT_LEN),
  }
}

/** Format structured log object for server console output (`docker logs lch_web`). */
export function formatClientErrorLog(
  report: ClientErrorReport,
  meta: ClientErrorServerMeta
) {
  return {
    timestamp: new Date().toISOString(),
    clientRef: report.clientRef ?? null,
    digest: report.digest ?? null,
    source: report.source,
    context: report.context ?? null,
    pathname: report.pathname ?? null,
    href: report.href ?? null,
    user: {
      id: meta.userId,
      name: meta.userName,
      email: meta.userEmail,
      roles: meta.roles,
    },
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
    error: {
      name: report.name ?? "Error",
      message: report.message,
      stack: report.stack ?? null,
    },
  }
}

/** Fire-and-forget client error reporter; swallows transport errors to avoid error-boundary loops. */
export function reportClientError(
  err: unknown,
  opts: {
    source?: ClientErrorSource
    clientRef?: string
    pathname?: string
    href?: string
    context?: string
  } = {}
): string {
  const clientRef = opts.clientRef ?? createClientRef()
  if (typeof window === "undefined") return clientRef

  const payload = buildClientErrorPayload(err, {
    ...opts,
    clientRef,
    pathname: opts.pathname ?? window.location.pathname,
    href: opts.href ?? window.location.href,
  })

  try {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Abaikan kegagalan jaringan saat mengirim laporan error.
    })
  } catch {
    // Abaikan jika fetch tidak tersedia.
  }

  return clientRef
}
