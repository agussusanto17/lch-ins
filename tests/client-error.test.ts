import assert from "node:assert/strict"
import test from "node:test"

import {
  buildClientErrorPayload,
  clientErrorSchema,
  createClientRef,
  deterministicErrorRef,
  formatClientErrorLog,
} from "../lib/client-error"

test("deterministicErrorRef menghasilkan kode referensi CE- konsisten dan bebas karakter spesial", () => {
  const a = deterministicErrorRef("Cannot read properties of undefined", "/placement:r1")
  const b = deterministicErrorRef("Cannot read properties of undefined", "/placement:r1")
  const c = deterministicErrorRef("Different error", "/placement:r1")

  assert.equal(a, b)
  assert.notEqual(a, c)
  assert.match(a, /^CE-[0-9A-Z]{6,}$/)
  assert.match(createClientRef(), /^CE-[0-9A-Z]{6,}$/)
})

test("buildClientErrorPayload memangkas pesan dan stack yang terlalu panjang serta menangani input non-Error", () => {
  const longMessage = "x".repeat(1500)
  const longStack = "line\n".repeat(1500)
  const err = new Error(longMessage)
  err.stack = longStack
  ;(err as Error & { digest?: string }).digest = "DIGEST-123"

  const payload = buildClientErrorPayload(err, {
    source: "app-error",
    clientRef: "CE-TEST01",
    pathname: "/placement",
    href: "https://apps.lch.co.id/placement",
  })

  assert.equal(payload.source, "app-error")
  assert.equal(payload.clientRef, "CE-TEST01")
  assert.equal(payload.digest, "DIGEST-123")
  assert.equal(payload.message.length, 1000)
  assert.equal(payload.stack?.length, 4000)

  const parsed = clientErrorSchema.safeParse(payload)
  assert.equal(parsed.success, true)

  const fallback = buildClientErrorPayload(null)
  assert.equal(fallback.message, "Unknown client error")
})

test("formatClientErrorLog menyusun metadata user, halaman, dan error untuk server log", () => {
  const log = formatClientErrorLog(
    {
      source: "action",
      clientRef: "CE-ABC123",
      name: "TypeError",
      message: "Failed to fetch",
      pathname: "/placement/new",
      href: "https://apps.lch.co.id/placement/new",
      context: "handleSave",
      stack: "TypeError: Failed to fetch\n    at handleSave",
    },
    {
      userId: "u-1",
      userName: "HARRY MULYONO",
      userEmail: "harry@lch.co.id",
      roles: ["marketing", "placement", "admin"],
      ip: "202.154.55.69",
      userAgent: "Chrome/158",
    }
  )

  assert.equal(log.clientRef, "CE-ABC123")
  assert.equal(log.source, "action")
  assert.equal(log.context, "handleSave")
  assert.equal(log.pathname, "/placement/new")
  assert.equal(log.user.name, "HARRY MULYONO")
  assert.deepEqual(log.user.roles, ["marketing", "placement", "admin"])
  assert.equal(log.error.message, "Failed to fetch")
  assert.ok(log.timestamp)
})
